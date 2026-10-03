package com.amrpvms.hospital_backend.controller;

import com.amrpvms.hospital_backend.model.DoctorLeave;
import com.amrpvms.hospital_backend.repository.DoctorLeaveRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin")
public class AdminController {

    @Autowired private DoctorLeaveRepository doctorLeaveRepository;

    @GetMapping("/leave/active")
    public ResponseEntity<List<DoctorLeave>> getActiveLeaves() {
        return ResponseEntity.ok(doctorLeaveRepository.findByStatus("ACTIVE"));
    }
}