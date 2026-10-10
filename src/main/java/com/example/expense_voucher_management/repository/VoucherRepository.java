package com.example.expense_voucher_management.repository;

import com.example.expense_voucher_management.entity.Voucher;
import com.example.expense_voucher_management.enums.VoucherStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface VoucherRepository extends JpaRepository<Voucher, Long> {

    List<Voucher> findByEmployeeId(Long employeeId);

    List<Voucher> findByStatus(VoucherStatus status);

    Optional<Voucher> findByVoucherNumber(String voucherNumber);

    boolean existsByVoucherNumber(String voucherNumber);

    List<Voucher> findByEmployeeIdAndStatus(
            Long employeeId, VoucherStatus status);
}