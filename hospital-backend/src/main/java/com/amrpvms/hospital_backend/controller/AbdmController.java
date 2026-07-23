package com.amrpvms.hospital_backend.controller;

import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/abdm")
public class AbdmController {

    @GetMapping("/verify/{abha}")
    public Map<String, Object> verify(@PathVariable String abha) {
        Map<String, Object> response = new HashMap<>();

        // Mock fallback — real ABDM sandbox integration pending credential approval.
        // For now, treat any 14-digit numeric ABHA as valid, mirroring the real ABHA format.
        if (abha != null && abha.matches("\\d{14}")) {
            response.put("verified", true);
            response.put("name", "Demo Patient (" + abha + ")");
            response.put("source", "Mock ABDM — pending real sandbox credentials");
        } else {
            response.put("verified", false);
            response.put("error", "Invalid ABHA format. Expected 14 digits.");
        }
        return response;
    }

    @GetMapping("/verify-hpr/{hprId}")
    public Map<String, Object> verifyHpr(@PathVariable String hprId) {
        Map<String, Object> response = new HashMap<>();

        if (hprId != null && hprId.matches("[A-Za-z0-9\\-]{6,20}")) {
            response.put("verified", true);
            response.put("hprId", hprId);
            response.put("qualification", "MBBS, MD");
            response.put("registrationNumber", "REG-" + hprId.replaceAll("[^A-Za-z0-9]", ""));
            response.put("registrationCouncil", "Tamil Nadu Medical Council");
            response.put("registeredSince", "2015");
            response.put("validTill", "2027-12-31");
            response.put("source", "Mock HPR — pending real sandbox credentials");
        } else {
            response.put("verified", false);
            response.put("error", "Invalid HPR ID format.");
        }
        return response;
    }
}