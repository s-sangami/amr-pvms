package com.amrpvms.hospital_backend.controller;

import com.amrpvms.hospital_backend.dto.PharmacyFacilityRequest;
import com.amrpvms.hospital_backend.model.PharmacyFacility;
import com.amrpvms.hospital_backend.repository.PharmacyFacilityRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/pharmacy-facility")
public class PharmacyFacilityController {

    @Autowired
    private PharmacyFacilityRepository repository;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody PharmacyFacilityRequest request) {
        boolean exists = repository.findAll().stream()
                .anyMatch(f -> f.getName().equalsIgnoreCase(request.getName()));

        if (exists) {
            return ResponseEntity.status(409).body("A facility with this name already exists");
        }

        PharmacyFacility facility = new PharmacyFacility();
        facility.setName(request.getName());
        facility.setType(request.getType());

        return ResponseEntity.ok(repository.save(facility));
    }

    @GetMapping("/list")
    public ResponseEntity<List<PharmacyFacility>> list() {
        return ResponseEntity.ok(repository.findAll());
    }
}