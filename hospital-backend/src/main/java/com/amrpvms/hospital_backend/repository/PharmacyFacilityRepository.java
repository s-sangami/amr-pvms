package com.amrpvms.hospital_backend.repository;

import com.amrpvms.hospital_backend.model.PharmacyFacility;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PharmacyFacilityRepository extends JpaRepository<PharmacyFacility, Integer> {
}