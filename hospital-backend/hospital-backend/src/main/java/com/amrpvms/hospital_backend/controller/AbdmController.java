package com.amrpvms.hospital_backend.controller;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/abdm")
public class AbdmController {

    // ⚠️ UNVERIFIED — confirm exact URL against the M1 milestone video / ABDM docs.
    // ABDM sandbox gateway session endpoints have historically used versioned paths
    // (e.g. /gateway/v0.5/sessions) that change between environments/releases.
    private static final String GATEWAY_SESSION_URL = "https://dev.abdm.gov.in/gateway/v0.5/sessions";

    // From your bridge registration email — confirm these are meant to be used
    // directly as clientId/clientSecret for the session call (vs. a separate
    // "bridge auth" credential pair issued elsewhere).
    private static final String CLIENT_ID = "SBXID_053766";
    private static final String CLIENT_SECRET = "863c8977-a5db-47d9-b622-90bac71342fa";

    /**
     * Requests a gateway access token using bridge credentials.
     * ⚠️ Field names below (clientId/clientSecret) are a best guess based on common
     * ABDM sandbox conventions — verify exact field names/casing from the M1 video
     * or docs before relying on this. Some ABDM flows use snake_case instead.
     */
    private Map<String, Object> getGatewayToken() {
        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, String> body = new HashMap<>();
        body.put("clientId", CLIENT_ID);
        body.put("clientSecret", CLIENT_SECRET);

        HttpEntity<Map<String, String>> entity = new HttpEntity<>(body, headers);

        ResponseEntity<Map> response = restTemplate.postForEntity(GATEWAY_SESSION_URL, entity, Map.class);
        return response.getBody();
    }

    /**
     * Temporary test endpoint — NOT for production use. Lets you manually verify
     * the gateway auth call works before wiring it into verify()/verify-hpr().
     * Remove or secure this before going live.
     */
    @GetMapping("/test-gateway-auth")
    public Map<String, Object> testGatewayAuth() {
        try {
            return getGatewayToken();
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            return error;
        }
    }

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