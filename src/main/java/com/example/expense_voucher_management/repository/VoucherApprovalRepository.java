package com.example.expense_voucher_management.repository;

import com.example.expense_voucher_management.entity.VoucherApproval;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface VoucherApprovalRepository
        extends JpaRepository<VoucherApproval, Long> {

    Optional<VoucherApproval> findByVoucherId(Long voucherId);

    boolean existsByVoucherId(Long voucherId);
}