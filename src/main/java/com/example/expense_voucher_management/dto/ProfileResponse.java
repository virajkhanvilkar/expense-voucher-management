package com.example.expense_voucher_management.dto;

import java.time.LocalDateTime;

public class ProfileResponse {

    private Long id;
    private String fullName;
    private String username;
    private String email;
    private String employeeCode;
    private String department;
    private String role;
    private LocalDateTime createdAt;

    public ProfileResponse() {
    }

    public ProfileResponse(
            Long id,
            String fullName,
            String username,
            String email,
            String employeeCode,
            String department,
            String role,
            LocalDateTime createdAt) {
        this.id = id;
        this.fullName = fullName;
        this.username = username;
        this.email = email;
        this.employeeCode = employeeCode;
        this.department = department;
        this.role = role;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public String getFullName() { return fullName; }
    public String getUsername() { return username; }
    public String getEmail() { return email; }
    public String getEmployeeCode() { return employeeCode; }
    public String getDepartment() { return department; }
    public String getRole() { return role; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}