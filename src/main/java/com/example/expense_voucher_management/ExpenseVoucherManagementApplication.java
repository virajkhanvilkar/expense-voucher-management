package com.example.expense_voucher_management;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class ExpenseVoucherManagementApplication {

    public static void main(String[] args) {

        System.out.println(
            new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder()
                .encode("Accounts@123")
        );

        SpringApplication.run(
            ExpenseVoucherManagementApplication.class, args
        );
    }
}