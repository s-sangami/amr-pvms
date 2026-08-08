package com.amrpvms.hospital_backend.controller;

import com.amrpvms.hospital_backend.dto.CheckInRequest;
import com.amrpvms.hospital_backend.model.Patient;
import com.amrpvms.hospital_backend.model.Visit;
import com.amrpvms.hospital_backend.repository.PatientRepository;
import com.amrpvms.hospital_backend.repository.VisitRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/reception")
public class ReceptionController {

    @Autowired
    private VisitRepository visitRepository;

    @Autowired
    private PatientRepository patientRepository;

    @PostMapping("/checkin")
    public ResponseEntity<?> checkIn(@RequestBody CheckInRequest request) {
        // Prevent duplicate check-in — if this patient already has a WAITING visit
        // at this hospital, don't create another one.
        boolean alreadyWaiting = visitRepository.findByHospitalIdAndStatus(request.getHospitalId(), "WAITING")
                .stream()
                .anyMatch(v -> v.getPatientAbha().equals(request.getAbha()));

        if (alreadyWaiting) {
            return ResponseEntity.status(409).body("This patient is already checked in and waiting to be seen.");
        }

        Visit visit = new Visit();
        visit.setPatientAbha(request.getAbha());
        visit.setHospitalId(request.getHospitalId());
        visit.setDoctorId(request.getDoctorId());
        visit.setStatus("WAITING");
        visit.setCheckedInAt(LocalDateTime.now());

        Visit saved = visitRepository.save(visit);
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/queue/{hospitalId}")
    public ResponseEntity<List<Visit>> getQueue(@PathVariable Integer hospitalId,
                                                @RequestParam(required = false) Integer doctorId) {
        List<Visit> queue = doctorId != null
                ? visitRepository.findByHospitalIdAndDoctorIdAndStatus(hospitalId, doctorId, "WAITING")
                : visitRepository.findByHospitalIdAndStatus(hospitalId, "WAITING");
        return ResponseEntity.ok(queue);
    }

    @DeleteMapping("/visit/{id}")
    public ResponseEntity<?> deleteVisit(@PathVariable Integer id) {
        if (!visitRepository.existsById(id)) {
            return ResponseEntity.status(404).body("Visit not found");
        }
        visitRepository.deleteById(id);
        return ResponseEntity.ok("Deleted");
    }
}