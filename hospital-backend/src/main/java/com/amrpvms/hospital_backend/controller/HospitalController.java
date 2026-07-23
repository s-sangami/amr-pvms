package com.amrpvms.hospital_backend.controller;

import com.amrpvms.hospital_backend.dto.HospitalRequest;
import com.amrpvms.hospital_backend.model.Hospital;
import com.amrpvms.hospital_backend.repository.HospitalRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/hospital")
public class HospitalController {

    @Autowired
    private HospitalRepository hospitalRepository;

    @PostMapping("/register")
    public ResponseEntity<?> registerHospital(@RequestBody HospitalRequest request) {
        boolean exists = hospitalRepository.findAll().stream()
                .anyMatch(h -> h.getName().equalsIgnoreCase(request.getName()));

        if (exists) {
            return ResponseEntity.status(409).body("A hospital with this name already exists");
        }

        Hospital hospital = new Hospital();
        hospital.setName(request.getName());
        hospital.setType(request.getType());

        Hospital saved = hospitalRepository.save(hospital);
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/list")
    public ResponseEntity<List<Hospital>> listHospitals() {
        return ResponseEntity.ok(hospitalRepository.findAll());
    }
}