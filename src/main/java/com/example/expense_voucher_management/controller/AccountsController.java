package com.example.expense_voucher_management.controller;

import com.example.expense_voucher_management.entity.Voucher;
import com.example.expense_voucher_management.repository.VoucherRepository;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/accounts")
@CrossOrigin(origins = "http://localhost:5173")
public class AccountsController {

    private final VoucherRepository voucherRepository;

    public AccountsController(VoucherRepository voucherRepository) {
        this.voucherRepository = voucherRepository;
    }

    // View all vouchers
    @GetMapping("/vouchers")
    public ResponseEntity<List<Voucher>> getAllVouchers() {
        return ResponseEntity.ok(voucherRepository.findAll());
    }

    // View approved vouchers
    @GetMapping("/vouchers/approved")
    public ResponseEntity<List<Voucher>> getApprovedVouchers() {
        return ResponseEntity.ok(
                voucherRepository.findByStatus(
                        com.example.expense_voucher_management.enums.VoucherStatus.APPROVED));
    }
}