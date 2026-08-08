package com.amrpvms.hospital_backend.repository;

import com.amrpvms.hospital_backend.model.Prescription;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PrescriptionRepository extends JpaRepository<Prescription, Integer> {
    List<Prescription> findByPatientAbha(String patientAbha);
    List<Prescription> findByPatientAbhaOrderByIssuedAtDesc(String patientAbha);
}