package com.amrpvms.hospital_backend.repository;

import com.amrpvms.hospital_backend.model.DrugMaster;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DrugMasterRepository extends JpaRepository<DrugMaster, Integer> {
    Optional<DrugMaster> findByName(String name);
}