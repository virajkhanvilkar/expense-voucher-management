
package com.example.expense_voucher_management.controller;

import com.example.expense_voucher_management.service.PasswordResetService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class PasswordResetController {

    private final PasswordResetService passwordResetService;

    public PasswordResetController(
            PasswordResetService passwordResetService) {
        this.passwordResetService = passwordResetService;
    }

    public record ForgotPasswordRequest(
            @NotBlank
            @Size(max = 100)
            String username) {
    }

    public record ResetPasswordRequest(
            @NotBlank
            @Size(max = 100)
            String username,

            @NotBlank
            @Pattern(
                    regexp = "[0-9]{6}",
                    message = "OTP must contain exactly six digits")
            String otp,

            @NotBlank
            @Size(min = 8, max = 72)
            String newPassword) {
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {

        try {
            passwordResetService.requestOtpByUsername(
                    request.username());

        } catch (IllegalArgumentException ex) {
            // Do not reveal whether the username exists.
        } catch (IllegalStateException ex) {
            return ResponseEntity.internalServerError().body(Map.of(
                    "message",
                    "Unable to send the OTP. Check the email configuration."
            ));
        }

        return ResponseEntity.ok(Map.of(
                "message",
                "If the account exists and has a registered email, "
                        + "an OTP will be sent."
        ));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {

        try {
            passwordResetService.resetPasswordByUsername(
                    request.username(),
                    request.otp(),
                    request.newPassword());

            return ResponseEntity.ok(Map.of(
                    "message",
                    "Password reset successful. Please log in."
            ));

        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", ex.getMessage()));
        }
    }
}
