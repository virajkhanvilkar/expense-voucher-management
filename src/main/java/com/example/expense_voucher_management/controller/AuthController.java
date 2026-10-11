
package com.example.expense_voucher_management.controller;

import com.example.expense_voucher_management.dto.LoginRequest;
import com.example.expense_voucher_management.dto.LoginResponse;
import com.example.expense_voucher_management.entity.User;
import com.example.expense_voucher_management.repository.UserRepository;
import com.example.expense_voucher_management.security.JwtService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:5173")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final JwtService jwtService;

    public AuthController(
            AuthenticationManager authenticationManager,
            UserRepository userRepository,
            JwtService jwtService) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.jwtService = jwtService;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(
            @Valid @RequestBody LoginRequest request) {

        try {
            String username = request.getUsername().trim();

            // Authenticate the submitted credentials.
            Authentication authentication =
                    authenticationManager.authenticate(
                            new UsernamePasswordAuthenticationToken(
                                    username,
                                    request.getPassword()
                            )
                    );

            // Fetch the authenticated user and their database ID.
            User user = userRepository
                    .findByUsername(authentication.getName())
                    .orElseThrow(() ->
                            new IllegalStateException(
                                    "Authenticated user was not found"
                            )
                    );

            // Generate a JWT containing the username and role.
            String token = jwtService.generateToken(
                    user.getUsername(),
                    user.getRole().name()
            );

            // Return the user ID along with the login details.
            LoginResponse response = new LoginResponse(
                    user.getId(),
                    token,
                    user.getUsername(),
                    user.getRole().name(),
                    "Login successful"
            );

            return ResponseEntity.ok(response);

        } catch (AuthenticationException ex) {
            LoginResponse response = new LoginResponse(
                    null,
                    null,
                    null,
                    null,
                    "Invalid username or password"
            );

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(response);
        }
    }
}
