
package com.example.expense_voucher_management.controller;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import com.example.expense_voucher_management.entity.Voucher;
import com.example.expense_voucher_management.service.VoucherService;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/vouchers")
@CrossOrigin(origins = "http://localhost:5173")
public class VoucherController {

    private final VoucherService voucherService;

    public VoucherController(VoucherService voucherService) {
        this.voucherService = voucherService;
    }

    // Create a new draft
    @PostMapping("/draft/{employeeId}")
    public ResponseEntity<Voucher> createDraft(
            @PathVariable("employeeId") Long employeeId,
            @RequestBody Voucher voucher) {

        Voucher savedVoucher =
                voucherService.createDraft(employeeId, voucher);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(savedVoucher);
    }

    // Get all vouchers belonging to an employee
    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<List<Voucher>> getMyVouchers(
            @PathVariable("employeeId") Long employeeId) {

        return ResponseEntity.ok(
                voucherService.getMyVouchers(employeeId));
    }

    // Get one voucher belonging to an employee
    @GetMapping("/employee/{employeeId}/{voucherId}")
    public ResponseEntity<Voucher> getMyVoucher(
            @PathVariable("employeeId") Long employeeId,
            @PathVariable("voucherId") Long voucherId) {

        return ResponseEntity.ok(
                voucherService.getMyVoucher(employeeId, voucherId));
    }

    // Update a draft
    @PutMapping("/draft/{employeeId}/{voucherId}")
    public ResponseEntity<Voucher> updateDraft(
            @PathVariable("employeeId") Long employeeId,
            @PathVariable("voucherId") Long voucherId,
            @RequestBody Voucher voucher) {

        return ResponseEntity.ok(
                voucherService.updateDraft(
                        employeeId, voucherId, voucher));
    }

    // Delete a draft
    @DeleteMapping("/draft/{employeeId}/{voucherId}")
    public ResponseEntity<Void> deleteDraft(
            @PathVariable("employeeId") Long employeeId,
            @PathVariable("voucherId") Long voucherId) {

        voucherService.deleteDraft(employeeId, voucherId);

        return ResponseEntity.noContent().build();
    }

    // Upload a bill image or PDF
    @PostMapping(
            value = "/upload-bill",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> uploadBill(
            @RequestParam("file") MultipartFile file) {

        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Please select a bill file.");
        }

        if (file.getSize() > 5L * 1024 * 1024) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "File size must not exceed 5 MB.");
        }

        String contentType = file.getContentType();

        if (contentType == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "File type could not be identified.");
        }

        contentType = contentType.toLowerCase(Locale.ROOT);

        String originalName = file.getOriginalFilename();

        if (originalName == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid file name.");
        }

        String safeName = Paths.get(originalName)
                .getFileName()
                .toString()
                .toLowerCase(Locale.ROOT);

        String extension;

        if (safeName.endsWith(".pdf")
                && contentType.equals("application/pdf")) {
            extension = ".pdf";

        } else if (safeName.endsWith(".jpg")
                || safeName.endsWith(".jpeg")) {

            if (!contentType.equals("image/jpeg")) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Invalid JPEG file type.");
            }

            extension = safeName.endsWith(".jpg")
                    ? ".jpg" : ".jpeg";

        } else if (safeName.endsWith(".png")
                && contentType.equals("image/png")) {
            extension = ".png";

        } else {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Only PDF, JPG, JPEG and PNG files are allowed.");
        }

        try {
            Path uploadDirectory = Paths
                    .get("uploads", "bills")
                    .toAbsolutePath()
                    .normalize();

            Files.createDirectories(uploadDirectory);

            String storedName = UUID.randomUUID() + extension;

            Path destination = uploadDirectory
                    .resolve(storedName)
                    .normalize();

            if (!destination.startsWith(uploadDirectory)) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Invalid upload destination.");
            }

            Files.copy(file.getInputStream(), destination);

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(Map.of("path", destination.toString()));

        } catch (IOException exception) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Could not save the uploaded bill.");
        }
    }

    // Submit a draft for approval
    @PostMapping("/submit/{employeeId}/{voucherId}")
    public ResponseEntity<Voucher> submitVoucher(
            @PathVariable("employeeId") Long employeeId,
            @PathVariable("voucherId") Long voucherId,
            @RequestBody Map<String, String> request) {

        String signaturePath = request.get("employeeSignaturePath");

        if (signaturePath == null || signaturePath.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Employee signature path is required.");
        }

        voucherService.updateEmployeeSignature(
                employeeId, voucherId, signaturePath.trim());

        Voucher submittedVoucher =
                voucherService.submitVoucher(employeeId, voucherId);

        return ResponseEntity.ok(submittedVoucher);
    }
}
