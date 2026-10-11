package com.example.expense_voucher_management.service;

import com.example.expense_voucher_management.dto.ChangePasswordRequest;
import com.example.expense_voucher_management.dto.ProfileResponse;
import com.example.expense_voucher_management.dto.UpdateProfileRequest;
import com.example.expense_voucher_management.entity.User;
import com.example.expense_voucher_management.repository.UserRepository;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProfileService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public ProfileService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    private User getUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "User account not found"));
    }

    private ProfileResponse toResponse(User user) {
        return new ProfileResponse(
                user.getId(),
                user.getFullName(),
                user.getUsername(),
                user.getEmail(),
                user.getEmployeeCode(),
                user.getDepartment(),
                user.getRole().name(),
                user.getCreatedAt()
        );
    }

    @Transactional(readOnly = true)
    public ProfileResponse getProfile(String username) {
        return toResponse(getUser(username));
    }

    @Transactional
    public ProfileResponse updateProfile(
            String username,
            UpdateProfileRequest request) {

        User user = getUser(username);

        String email = request.getEmail() == null
                ? null
                : request.getEmail().trim();

        if (email != null && email.isEmpty()) {
            email = null;
        }

        if (email != null
                && userRepository.existsByEmailAndIdNot(
                        email, user.getId())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This email address is already in use");
        }

        user.setFullName(request.getFullName().trim());
        user.setEmail(email);
        user.setDepartment(request.getDepartment() == null
                ? ""
                : request.getDepartment().trim());
        user.setEmployeeCode(request.getEmployeeCode() == null
                ? null
                : request.getEmployeeCode().trim());

        // Username and role are deliberately not editable here.
        return toResponse(userRepository.save(user));
    }

    @Transactional
    public void changePassword(
            String username,
            ChangePasswordRequest request) {

        User user = getUser(username);

        if (!passwordEncoder.matches(
                request.getCurrentPassword(),
                user.getPasswordHash())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Current password is incorrect");
        }

        if (passwordEncoder.matches(
                request.getNewPassword(),
                user.getPasswordHash())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "New password must differ from current password");
        }

        user.setPasswordHash(
                passwordEncoder.encode(request.getNewPassword()));

        userRepository.save(user);
    }
}