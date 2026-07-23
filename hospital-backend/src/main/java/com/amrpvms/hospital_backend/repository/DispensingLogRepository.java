package com.amrpvms.hospital_backend.repository;

import com.amrpvms.hospital_backend.model.DispensingLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DispensingLogRepository extends JpaRepository<DispensingLog, Integer> {
    List<DispensingLog> findByPharmacyIdOrderByDispensedAtDesc(Integer pharmacyId);
}