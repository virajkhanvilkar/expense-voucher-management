
package com.example.expense_voucher_management.service;

import com.example.expense_voucher_management.entity.PasswordResetOtp;
import com.example.expense_voucher_management.entity.User;
import com.example.expense_voucher_management.repository.PasswordResetOtpRepository;
import com.example.expense_voucher_management.repository.UserRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Optional;

@Service
public class PasswordResetService {

    private final UserRepository userRepository;
    private final PasswordResetOtpRepository otpRepository;
    private final JavaMailSender mailSender;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${app.password-reset.from}")
    private String fromEmail;

    public PasswordResetService(
            UserRepository userRepository,
            PasswordResetOtpRepository otpRepository,
            JavaMailSender mailSender,
            PasswordEncoder passwordEncoder) {

        this.userRepository = userRepository;
        this.otpRepository = otpRepository;
        this.mailSender = mailSender;
        this.passwordEncoder = passwordEncoder;
    }

    // Find the email internally using the supplied username.
    public void requestOtpByUsername(String username) {
        String normalizedUsername = username.trim();

        Optional<User> userOptional =
                userRepository.findByUsername(normalizedUsername);

        if (userOptional.isEmpty()) {
            return;
        }

        User user = userOptional.get();
        String email = user.getEmail();

        if (email == null || email.isBlank()) {
            return;
        }

        requestOtp(email, user);
    }

    private void requestOtp(String email, User user) {
        String normalizedEmail = email.trim().toLowerCase();

        // Limit repeated requests: one OTP request per 60 seconds.
        Optional<PasswordResetOtp> previous =
                otpRepository.findTopByEmailOrderByCreatedAtDesc(
                        normalizedEmail);

        if (previous.isPresent()
                && previous.get().getCreatedAt()
                .isAfter(LocalDateTime.now().minusSeconds(60))) {
            throw new IllegalArgumentException(
                    "Please wait before requesting another OTP.");
        }

        otpRepository.deleteByEmail(normalizedEmail);

        String otp = String.format(
                "%06d", secureRandom.nextInt(1_000_000));

        LocalDateTime now = LocalDateTime.now();

        PasswordResetOtp resetOtp = new PasswordResetOtp();
        resetOtp.setEmail(normalizedEmail);
        resetOtp.setOtpHash(hashOtp(otp));
        resetOtp.setCreatedAt(now);
        resetOtp.setExpiresAt(now.plusMinutes(5));
        resetOtp.setAttempts(0);

        otpRepository.save(resetOtp);

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(normalizedEmail);
        message.setSubject(
                "Expense Voucher Management - Password Reset");
        message.setText(
                "Hello " + user.getFullName() + ",\n\n"
                + "Your password reset OTP is: " + otp + "\n\n"
                + "This OTP expires in 5 minutes and can be used once.\n"
                + "If you did not request this, please ignore this email."
        );

        try {
            mailSender.send(message);
        } catch (RuntimeException ex) {
            otpRepository.deleteByEmail(normalizedEmail);
            throw new IllegalStateException(
                    "Unable to send the OTP email. Check the mail configuration.");
        }
    }

    public void resetPasswordByUsername(
            String username, String otp, String newPassword) {

        String normalizedUsername = username.trim();

        User user = userRepository.findByUsername(normalizedUsername)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Invalid username or OTP."));

        String email = user.getEmail();

        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException(
                    "Password reset is unavailable for this account.");
        }

        resetPassword(email, otp, newPassword);
    }

    private void resetPassword(
            String email, String otp, String newPassword) {

        String normalizedEmail = email.trim().toLowerCase();

        PasswordResetOtp resetOtp = otpRepository
                .findTopByEmailOrderByCreatedAtDesc(normalizedEmail)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Invalid or expired OTP. Request a new one."));

        if (resetOtp.getExpiresAt().isBefore(LocalDateTime.now())) {
            otpRepository.delete(resetOtp);
            throw new IllegalArgumentException(
                    "OTP expired. Request a new one.");
        }

        if (resetOtp.getAttempts() >= 5) {
            otpRepository.delete(resetOtp);
            throw new IllegalArgumentException(
                    "Too many attempts. Request a new OTP.");
        }

        boolean validOtp = MessageDigest.isEqual(
                resetOtp.getOtpHash().getBytes(StandardCharsets.UTF_8),
                hashOtp(otp).getBytes(StandardCharsets.UTF_8));

        if (!validOtp) {
            resetOtp.setAttempts(resetOtp.getAttempts() + 1);

            if (resetOtp.getAttempts() >= 5) {
                otpRepository.delete(resetOtp);
            } else {
                otpRepository.save(resetOtp);
            }

            throw new IllegalArgumentException("Incorrect OTP.");
        }

        userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Unable to reset password."));

        // Store a BCrypt hash, never the plain-text password.
        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Unable to reset password."));

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // A successful OTP cannot be reused.
        otpRepository.delete(resetOtp);
    }

    private String hashOtp(String otp) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");

            return HexFormat.of().formatHex(
                    digest.digest(
                            otp.getBytes(StandardCharsets.UTF_8)));

        } catch (Exception ex) {
            throw new IllegalStateException(
                    "Unable to process OTP.", ex);
        }
    }
}
