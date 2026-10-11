
package com.example.expense_voucher_management.controller;

import com.example.expense_voucher_management.entity.Voucher;
import com.example.expense_voucher_management.service.DirectorService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/director")
@CrossOrigin(origins = "http://localhost:5173")
public class DirectorController {

    private final DirectorService directorService;

    public DirectorController(DirectorService directorService) {
        this.directorService = directorService;
    }

    // Get all pending vouchers.
    @GetMapping("/pending")
    public ResponseEntity<List<Voucher>> getPendingVouchers() {
        return ResponseEntity.ok(
                directorService.getPendingVouchers());
    }

    // Get all processed vouchers: APPROVED and REJECTED.
    @GetMapping("/processed")
    public ResponseEntity<List<Voucher>> getProcessedVouchers() {
        return ResponseEntity.ok(
                directorService.getProcessedVouchers());
    }

    // Approve a voucher.
    @PostMapping("/approve/{directorId}/{voucherId}")
    public ResponseEntity<Voucher> approveVoucher(
            @PathVariable("directorId") Long directorId,
            @PathVariable("voucherId") Long voucherId,
            @RequestBody Map<String, String> request) {

        String signaturePath =
                request.get("directorSignaturePath");

        return ResponseEntity.ok(
                directorService.approveVoucher(
                        directorId,
                        voucherId,
                        signaturePath));
    }

    // Reject a voucher.
    @PostMapping("/reject/{directorId}/{voucherId}")
    public ResponseEntity<Voucher> rejectVoucher(
            @PathVariable("directorId") Long directorId,
            @PathVariable("voucherId") Long voucherId,
            @RequestBody Map<String, String> request) {

        String reason = request.get("rejectionReason");

        return ResponseEntity.ok(
                directorService.rejectVoucher(
                        directorId,
                        voucherId,
                        reason));
    }
}
