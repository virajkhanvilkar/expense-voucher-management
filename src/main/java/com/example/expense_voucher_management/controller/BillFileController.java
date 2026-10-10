
package com.example.expense_voucher_management.controller;

import com.example.expense_voucher_management.entity.Voucher;
import com.example.expense_voucher_management.repository.VoucherRepository;
import com.example.expense_voucher_management.enums.VoucherStatus;

import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@RestController
@RequestMapping("/api/vouchers")
public class BillFileController {

    private final VoucherRepository voucherRepository;

    public BillFileController(VoucherRepository voucherRepository) {
        this.voucherRepository = voucherRepository;
    }

    @GetMapping("/{voucherId}/bill")
    public ResponseEntity<Resource> viewBill(
            @PathVariable("voucherId") Long voucherId,
            Authentication authentication) {

        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }

        boolean isDirector = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_DIRECTOR"));

        boolean isAccounts = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ACCOUNTS"));

        if (!isDirector && !isAccounts) {
            return ResponseEntity.status(403).build();
        }

        Voucher voucher = voucherRepository.findById(voucherId)
                .orElse(null);

        if (voucher == null) {
            return ResponseEntity.notFound().build();
        }

        // Accounts can access bills only for approved vouchers.
        if (isAccounts && voucher.getStatus() != VoucherStatus.APPROVED) {
            return ResponseEntity.status(403).build();
        }

        String storedPath = voucher.getBillPhoto();

        if (storedPath == null || storedPath.isBlank()) {
            return ResponseEntity.notFound().build();
        }

        try {
            // Use only the stored filename; never trust a client-supplied path.
            String filename = Paths.get(
                    storedPath.replace("\\", "/")
            ).getFileName().toString();

            Path uploadDirectory = Paths.get("uploads", "bills")
                    .toAbsolutePath()
                    .normalize();

            Path filePath = uploadDirectory.resolve(filename).normalize();

            if (!filePath.startsWith(uploadDirectory)
                    || !Files.isRegularFile(filePath)
                    || !Files.isReadable(filePath)) {
                return ResponseEntity.notFound().build();
            }

            Resource resource = new UrlResource(filePath.toUri());
            String contentType = Files.probeContentType(filePath);

            if (contentType == null ||
                    !(contentType.equals("application/pdf")
                    || contentType.equals("image/jpeg")
                    || contentType.equals("image/png"))) {
                return ResponseEntity.status(415).build();
            }

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(
                            HttpHeaders.CONTENT_DISPOSITION,
                            "inline; filename=\"" + filename + "\""
                    )
                    .body(resource);

        } catch (Exception ex) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
