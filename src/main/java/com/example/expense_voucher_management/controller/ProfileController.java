package com.example.expense_voucher_management.controller;

import com.example.expense_voucher_management.dto.ChangePasswordRequest;
import com.example.expense_voucher_management.dto.ProfileResponse;
import com.example.expense_voucher_management.dto.UpdateProfileRequest;
import com.example.expense_voucher_management.service.ProfileService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    /**
     * Get the currently authenticated user's profile.
     * GET /api/profile/me
     */
    @GetMapping("/me")
    public ResponseEntity<?> getProfile(
            Authentication authentication) {

        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication.getName() == null
                || authentication.getName().isBlank()) {

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                            "message",
                            "Please log in to view your profile."
                    ));
        }

        ProfileResponse profile = profileService.getProfile(
                authentication.getName()
        );

        return ResponseEntity.ok(profile);
    }

    /**
     * Update the currently authenticated user's profile.
     * PUT /api/profile/me
     */
    @PutMapping("/me")
    public ResponseEntity<?> updateProfile(
            Authentication authentication,
            @Valid @RequestBody UpdateProfileRequest request) {

        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication.getName() == null
                || authentication.getName().isBlank()) {

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                            "message",
                            "Please log in to update your profile."
                    ));
        }

        ProfileResponse updatedProfile =
                profileService.updateProfile(
                        authentication.getName(),
                        request
                );

        return ResponseEntity.ok(updatedProfile);
    }

    /**
     * Change the currently authenticated user's password.
     * POST /api/profile/change-password
     */
    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(
            Authentication authentication,
            @Valid @RequestBody ChangePasswordRequest request) {

        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication.getName() == null
                || authentication.getName().isBlank()) {

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                            "message",
                            "Please log in to change your password."
                    ));
        }

        profileService.changePassword(
                authentication.getName(),
                request
        );

        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "Password changed successfully."
                )
        );
    }
}
