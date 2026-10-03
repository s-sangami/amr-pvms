package com.amrpvms.hospital_backend.repository;

import com.amrpvms.hospital_backend.model.Visit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface VisitRepository extends JpaRepository<Visit, Integer> {
    List<Visit> findByHospitalIdAndStatus(Integer hospitalId, String status);
    List<Visit> findByHospitalIdAndDoctorIdAndStatus(Integer hospitalId, Integer doctorId, String status);
}