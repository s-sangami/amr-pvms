package com.amrpvms.hospital_backend.repository;

import com.amrpvms.hospital_backend.model.Hospital;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HospitalRepository extends JpaRepository<Hospital, Integer> {
}