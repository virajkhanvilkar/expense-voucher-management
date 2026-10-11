
package com.example.expense_voucher_management.service;

import com.example.expense_voucher_management.entity.User;
import com.example.expense_voucher_management.entity.Voucher;
import com.example.expense_voucher_management.entity.VoucherApproval;
import com.example.expense_voucher_management.enums.UserRole;
import com.example.expense_voucher_management.enums.VoucherStatus;
import com.example.expense_voucher_management.repository.UserRepository;
import com.example.expense_voucher_management.repository.VoucherApprovalRepository;
import com.example.expense_voucher_management.repository.VoucherRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class DirectorService {

    private final VoucherRepository voucherRepository;
    private final VoucherApprovalRepository approvalRepository;
    private final UserRepository userRepository;

    public DirectorService(
            VoucherRepository voucherRepository,
            VoucherApprovalRepository approvalRepository,
            UserRepository userRepository) {
        this.voucherRepository = voucherRepository;
        this.approvalRepository = approvalRepository;
        this.userRepository = userRepository;
    }

    // Get vouchers awaiting the Director's decision.
    @Transactional(readOnly = true)
    public List<Voucher> getPendingVouchers() {
        return voucherRepository.findByStatus(
                VoucherStatus.PENDING_APPROVAL);
    }

    // Get vouchers already approved or rejected.
    @Transactional(readOnly = true)
    public List<Voucher> getProcessedVouchers() {
        return voucherRepository.findByStatusIn(
                List.of(
                        VoucherStatus.APPROVED,
                        VoucherStatus.REJECTED
                )
        );
    }

    // Approve a pending voucher.
    @Transactional
    public Voucher approveVoucher(
            Long directorId,
            Long voucherId,
            String directorSignaturePath) {

        User director = getDirector(directorId);
        Voucher voucher = getPendingVoucher(voucherId);

        if (directorSignaturePath == null
                || directorSignaturePath.isBlank()) {
            throw new IllegalArgumentException(
                    "Director signature is required");
        }

        VoucherApproval approval = new VoucherApproval();
        approval.setVoucher(voucher);
        approval.setDirector(director);
        approval.setDirectorSignaturePath(
                directorSignaturePath.trim());

        voucher.setStatus(VoucherStatus.APPROVED);

        approvalRepository.save(approval);

        return voucherRepository.save(voucher);
    }

    // Reject a pending voucher.
    @Transactional
    public Voucher rejectVoucher(
            Long directorId,
            Long voucherId,
            String rejectionReason) {

        User director = getDirector(directorId);
        Voucher voucher = getPendingVoucher(voucherId);

        if (rejectionReason == null || rejectionReason.isBlank()) {
            throw new IllegalArgumentException(
                    "Rejection reason is required");
        }

        VoucherApproval approval = new VoucherApproval();
        approval.setVoucher(voucher);
        approval.setDirector(director);
        approval.setRejectionReason(rejectionReason.trim());

        voucher.setStatus(VoucherStatus.REJECTED);

        approvalRepository.save(approval);

        return voucherRepository.save(voucher);
    }

    // Validate that the supplied user is a Director.
    private User getDirector(Long directorId) {
        User director = userRepository.findById(directorId)
                .orElseThrow(() ->
                        new RuntimeException("Director not found"));

        if (director.getRole() != UserRole.DIRECTOR) {
            throw new IllegalStateException(
                    "Only the Director can approve or reject vouchers");
        }

        return director;
    }

    // Only pending vouchers can be approved or rejected.
    private Voucher getPendingVoucher(Long voucherId) {
        Voucher voucher = voucherRepository.findById(voucherId)
                .orElseThrow(() ->
                        new RuntimeException("Voucher not found"));

        if (voucher.getStatus() != VoucherStatus.PENDING_APPROVAL) {
            throw new IllegalStateException(
                    "Only pending vouchers can be approved or rejected");
        }

        return voucher;
    }
}
