package com.amrpvms.hospital_backend.repository;

import com.amrpvms.hospital_backend.model.DoctorLeave;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DoctorLeaveRepository extends JpaRepository<DoctorLeave, Integer> {
    List<DoctorLeave> findByDoctorIdAndStatus(Integer doctorId, String status);
    List<DoctorLeave> findByStatus(String status);
}