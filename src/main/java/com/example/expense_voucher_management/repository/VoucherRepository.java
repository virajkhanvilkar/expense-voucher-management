
package com.example.expense_voucher_management.repository;

import com.example.expense_voucher_management.entity.Voucher;
import com.example.expense_voucher_management.enums.VoucherStatus;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface VoucherRepository extends JpaRepository<Voucher, Long> {

    // Find all vouchers belonging to a specific employee.
    List<Voucher> findByEmployeeId(Long employeeId);

    // Find vouchers by a specific status.
    List<Voucher> findByStatus(VoucherStatus status);

    // Find vouchers matching multiple statuses.
    // Used by DirectorService to retrieve processed vouchers.
    List<Voucher> findByStatusIn(Collection<VoucherStatus> statuses);

    // Check whether a voucher number already exists.
    boolean existsByVoucherNumber(String voucherNumber);
}
