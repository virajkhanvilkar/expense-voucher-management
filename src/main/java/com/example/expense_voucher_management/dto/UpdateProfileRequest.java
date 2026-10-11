package com.example.expense_voucher_management.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class UpdateProfileRequest {

    @NotBlank
    @Size(max = 100)
    private String fullName;

    @Email
    @Size(max = 254)
    private String email;

    @Size(max = 100)
    private String department;

    @Size(max = 50)
    private String employeeCode;

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getEmail() { return email; }
    public void setEmail(String email) {
        this.email = email;
    }

    public String getDepartment() { return department; }
    public void setDepartment(String department) {
        this.department = department;
    }

    public String getEmployeeCode() { return employeeCode; }
    public void setEmployeeCode(String employeeCode) {
        this.employeeCode = employeeCode;
    }
}