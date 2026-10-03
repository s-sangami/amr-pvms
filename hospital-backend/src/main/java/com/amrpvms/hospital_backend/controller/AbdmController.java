package com.amrpvms.hospital_backend.controller;

import com.amrpvms.hospital_backend.service.AbhaRealService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/abdm")
public class AbdmController {

    @Autowired
    private AbhaRealService abhaRealService;

    // Test 1: token generation
    @GetMapping("/test-gateway-auth")
    public Map<String, Object> testGatewayAuth() {
        Map<String, Object> result = new HashMap<>();
        try {
            String token = abhaRealService.getAccessToken();
            result.put("accessToken", token);
        } catch (Exception e) {
            result.put("error", e.getMessage());
        }
        return result;
    }

    // Test 2: certificate fetch
    @GetMapping("/test-cert")
    public Map<String, Object> testCert() {
        Map<String, Object> result = new HashMap<>();
        try {
            result.put("certificate", abhaRealService.fetchPublicCertificate());
        } catch (Exception e) {
            result.put("error", e.getMessage());
        }
        return result;
    }

    // Test 3: search by mobile
    @PostMapping("/test-search")
    public Map<String, Object> testSearch(@RequestBody Map<String, String> body) {
        Map<String, Object> result = new HashMap<>();
        try {
            result.putAll(abhaRealService.searchByMobile(body.get("mobileNumber")));
        } catch (Exception e) {
            result.put("error", e.getMessage());
        }
        return result;
    }

    // Test 4: request OTP
    @PostMapping("/test-request-otp")
    public Map<String, Object> testRequestOtp(@RequestBody Map<String, String> body) {
        Map<String, Object> result = new HashMap<>();
        try {
            result.putAll(abhaRealService.requestOtp(body.get("mobileNumber")));
        } catch (Exception e) {
            result.put("error", e.getMessage());
        }
        return result;
    }
    // Test 5: verify OTP
    @PostMapping("/test-verify-otp")
    public Map<String, Object> testVerifyOtp(@RequestBody Map<String, String> body) {
        Map<String, Object> result = new HashMap<>();
        try {
            result.putAll(abhaRealService.verifyOtp(body.get("txnId"), body.get("otp")));
        } catch (Exception e) {
            result.put("error", e.getMessage());
        }
        return result;
    }

    // --- Existing mock endpoints, kept as-is for now ---

    @GetMapping("/verify/{abha}")
    public Map<String, Object> verify(@PathVariable String abha) {
        Map<String, Object> response = new HashMap<>();
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