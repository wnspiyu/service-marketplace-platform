package com.marketplace.repository;

import com.marketplace.entity.Quotation;
import com.marketplace.entity.QuotationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface QuotationRepository extends JpaRepository<Quotation, Long> {

    List<Quotation> findByTaskId(Long taskId);

    List<Quotation> findByServiceProviderIdOrderByCreatedAtDesc(Long serviceProviderId);

    boolean existsByTaskIdAndServiceProviderId(Long taskId, Long serviceProviderId);

    boolean existsByTaskIdAndServiceProviderIdAndStatus(Long taskId, Long serviceProviderId, QuotationStatus status);

    List<Quotation> findByTaskIdAndStatus(Long taskId, QuotationStatus status);

    @Transactional
    @Modifying
    void deleteByTaskId(Long taskId);
}
