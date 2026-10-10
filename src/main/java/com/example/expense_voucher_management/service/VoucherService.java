
package com.example.expense_voucher_management.service;

import com.example.expense_voucher_management.entity.User;
import com.example.expense_voucher_management.entity.Voucher;
import com.example.expense_voucher_management.enums.VoucherStatus;
import com.example.expense_voucher_management.repository.UserRepository;
import com.example.expense_voucher_management.repository.VoucherRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
public class VoucherService {

    private final VoucherRepository voucherRepository;
    private final UserRepository userRepository;

    public VoucherService(
            VoucherRepository voucherRepository,
            UserRepository userRepository) {
        this.voucherRepository = voucherRepository;
        this.userRepository = userRepository;
    }

    // Create a new draft
    @Transactional
    public Voucher createDraft(Long employeeId, Voucher voucher) {

        User employee = userRepository.findById(employeeId)
                .orElseThrow(() ->
                        new RuntimeException("Employee not found"));

        validateVoucher(voucher);

        voucher.setId(null);
        voucher.setEmployee(employee);
        voucher.setStatus(VoucherStatus.DRAFT);
        voucher.setVoucherNumber(generateVoucherNumber());
        voucher.setVoucherDate(LocalDate.now());

        return voucherRepository.save(voucher);
    }

    // Get all vouchers belonging to an employee
    @Transactional(readOnly = true)
    public List<Voucher> getMyVouchers(Long employeeId) {
        return voucherRepository.findByEmployeeId(employeeId);
    }

    // Get one voucher belonging to an employee
    @Transactional(readOnly = true)
    public Voucher getMyVoucher(Long employeeId, Long voucherId) {
        return voucherRepository.findById(voucherId)
                .filter(voucher ->
                        voucher.getEmployee() != null
                        && voucher.getEmployee().getId().equals(employeeId))
                .orElseThrow(() ->
                        new RuntimeException("Voucher not found"));
    }

    // Update a draft
    @Transactional
    public Voucher updateDraft(
            Long employeeId, Long voucherId, Voucher updatedVoucher) {

        Voucher existing = getMyVoucher(employeeId, voucherId);

        if (existing.getStatus() != VoucherStatus.DRAFT) {
            throw new IllegalStateException(
                    "Only draft vouchers can be edited");
        }

        validateVoucher(updatedVoucher);

        existing.setDepartmentName(updatedVoucher.getDepartmentName());
        existing.setExpenseTitle(updatedVoucher.getExpenseTitle());
        existing.setExpenseCategory(updatedVoucher.getExpenseCategory());
        existing.setExpenseDescription(updatedVoucher.getExpenseDescription());
        existing.setExpenseDate(updatedVoucher.getExpenseDate());
        existing.setAmount(updatedVoucher.getAmount());

        // Keep the existing bill if no new bill path was supplied.
        if (updatedVoucher.getBillPhoto() != null
                && !updatedVoucher.getBillPhoto().isBlank()) {
            existing.setBillPhoto(updatedVoucher.getBillPhoto());
        }

        return voucherRepository.save(existing);
    }

    // Delete a draft
    @Transactional
    public void deleteDraft(Long employeeId, Long voucherId) {

        Voucher voucher = getMyVoucher(employeeId, voucherId);

        if (voucher.getStatus() != VoucherStatus.DRAFT) {
            throw new IllegalStateException(
                    "Only draft vouchers can be deleted");
        }

        voucherRepository.delete(voucher);
    }

    // Save the employee signature path before submission
    @Transactional
    public void updateEmployeeSignature(
            Long employeeId,
            Long voucherId,
            String signaturePath) {

        Voucher voucher = getMyVoucher(employeeId, voucherId);

        if (voucher.getStatus() != VoucherStatus.DRAFT) {
            throw new IllegalStateException(
                    "Only draft vouchers can be submitted");
        }

        if (signaturePath == null || signaturePath.isBlank()) {
            throw new IllegalArgumentException(
                    "Employee signature path is required");
        }

        voucher.setEmployeeSignaturePath(signaturePath.trim());
        voucherRepository.save(voucher);
    }

    // Submit a draft for approval
    @Transactional
    public Voucher submitVoucher(Long employeeId, Long voucherId) {

        Voucher voucher = getMyVoucher(employeeId, voucherId);

        if (voucher.getStatus() != VoucherStatus.DRAFT) {
            throw new IllegalStateException(
                    "Only draft vouchers can be submitted");
        }

        if (voucher.getEmployeeSignaturePath() == null
                || voucher.getEmployeeSignaturePath().isBlank()) {
            throw new IllegalStateException(
                    "Employee signature is required before submission");
        }

        voucher.setStatus(VoucherStatus.PENDING_APPROVAL);
        return voucherRepository.save(voucher);
    }

    private void validateVoucher(Voucher voucher) {
        if (voucher.getAmount() == null
                || voucher.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException(
                    "Amount must be greater than zero");
        }

        if (voucher.getDepartmentName() == null
                || voucher.getDepartmentName().isBlank()) {
            throw new IllegalArgumentException(
                    "Department is required");
        }

        if (voucher.getExpenseTitle() == null
                || voucher.getExpenseTitle().isBlank()) {
            throw new IllegalArgumentException(
                    "Expense title is required");
        }

        if (voucher.getExpenseDate() == null) {
            throw new IllegalArgumentException(
                    "Expense date is required");
        }
    }

    private String generateVoucherNumber() {
        String voucherNumber;

        do {
            voucherNumber = "EXP-" + System.currentTimeMillis();
        } while (voucherRepository.existsByVoucherNumber(voucherNumber));

        return voucherNumber;
    }
}
