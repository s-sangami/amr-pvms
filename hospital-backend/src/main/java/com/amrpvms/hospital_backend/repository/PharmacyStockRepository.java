package com.amrpvms.hospital_backend.repository;

import com.amrpvms.hospital_backend.model.PharmacyStock;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PharmacyStockRepository extends JpaRepository<PharmacyStock, Integer> {
    List<PharmacyStock> findByPharmacyId(Integer pharmacyId);
    Optional<PharmacyStock> findByPharmacyIdAndDrug(Integer pharmacyId, String drug);
}