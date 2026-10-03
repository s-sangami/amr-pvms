package com.amrpvms.hospital_backend.repository;

import com.amrpvms.hospital_backend.model.PrescriptionGroup;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PrescriptionGroupRepository extends JpaRepository<PrescriptionGroup, Integer> {
    Optional<PrescriptionGroup> findByQrCode(String qrCode);
    List<PrescriptionGroup> findByPharmacyId(Integer pharmacyId);
    List<PrescriptionGroup> findByPatientAbhaOrderByIssuedAtDesc(String patientAbha);
}