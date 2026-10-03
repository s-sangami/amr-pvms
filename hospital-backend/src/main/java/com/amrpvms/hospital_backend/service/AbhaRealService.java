package com.amrpvms.hospital_backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Cipher;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.spec.MGF1ParameterSpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import java.util.Map;
import java.util.HashMap;
import java.util.UUID;
import java.time.Instant;

@Service
public class AbhaRealService {

    @Value("${abdm.client-id}")
    private String clientId;

    @Value("${abdm.client-secret}")
    private String clientSecret;

    // Token generation uses the gateway host
    private static final String GATEWAY_URL = "https://dev.abdm.gov.in/gateway/v0.5/sessions";

    // ABHA profile/enrollment APIs use the abhasbx host
    private static final String ABHA_BASE_URL = "https://abhasbx.abdm.gov.in/abha/api";

    private final RestTemplate restTemplate = new RestTemplate();

    private String cachedToken;
    private long tokenExpiryEpochMs;

    // 1. Token generation
    public String getAccessToken() {
        if (cachedToken != null && System.currentTimeMillis() < tokenExpiryEpochMs) {
            return cachedToken;
        }

        Map<String, String> body = new HashMap<>();
        body.put("clientId", clientId);
        body.put("clientSecret", clientSecret);
        body.put("grantType", "client_credentials");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, String>> request = new HttpEntity<>(body, headers);
        ResponseEntity<Map> response = restTemplate.postForEntity(GATEWAY_URL, request, Map.class);

        Map respBody = response.getBody();
        cachedToken = (String) respBody.get("accessToken");
        tokenExpiryEpochMs = System.currentTimeMillis() + (18 * 60 * 1000);

        return cachedToken;
    }

    // 2. Fetch public certificate — CORRECTED endpoint
    public String fetchPublicCertificate() {
        String url = ABHA_BASE_URL + "/v3/profile/public/certificate";

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(getAccessToken());
        headers.set("REQUEST-ID", UUID.randomUUID().toString());
        headers.set("TIMESTAMP", Instant.now().toString());
        headers.set("X-CM-ID", "sbx");

        HttpEntity<Void> request = new HttpEntity<>(headers);
        ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, request, Map.class);

        Map body = response.getBody();
        return (String) body.get("publicKey");
    }

    // 3. RSA-OAEP encryption — handles raw base64 key (no PEM headers to strip)
    public String encryptWithPublicKey(String plainText, String base64PublicKey) throws Exception {
        String cleaned = base64PublicKey
                .replace("-----BEGIN PUBLIC KEY-----", "")
                .replace("-----END PUBLIC KEY-----", "")
                .replaceAll("\\s", "");

        byte[] certBytes = Base64.getDecoder().decode(cleaned);
        X509EncodedKeySpec spec = new X509EncodedKeySpec(certBytes);
        KeyFactory keyFactory = KeyFactory.getInstance("RSA");
        PublicKey publicKey = keyFactory.generatePublic(spec);

        Cipher cipher = Cipher.getInstance("RSA/ECB/OAEPWithSHA-1AndMGF1Padding");
        javax.crypto.spec.OAEPParameterSpec oaepParams = new javax.crypto.spec.OAEPParameterSpec(
                "SHA-1", "MGF1", MGF1ParameterSpec.SHA1,
                javax.crypto.spec.PSource.PSpecified.DEFAULT
        );
        cipher.init(Cipher.ENCRYPT_MODE, publicKey, oaepParams);

        byte[] encryptedBytes = cipher.doFinal(plainText.getBytes("UTF-8"));
        return Base64.getEncoder().encodeToString(encryptedBytes);
    }

    // 4. Search ABHA by mobile — CORRECTED endpoint
    public Map searchByMobile(String mobileNumber) throws Exception {
        String pemCert = fetchPublicCertificate();
        String encryptedMobile = encryptWithPublicKey(mobileNumber, pemCert);

        String url = ABHA_BASE_URL + "/v3/profile/account/abha/search";

        Map<String, Object> body = new HashMap<>();
        body.put("scope", new String[]{"abha-login"});
        body.put("loginHint", "mobile");
        body.put("loginId", encryptedMobile);

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(getAccessToken());
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("REQUEST-ID", UUID.randomUUID().toString());
        headers.set("TIMESTAMP", Instant.now().toString());
        headers.set("X-CM-ID", "sbx");

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
        ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);

        return response.getBody();
    }

    // 5. Request OTP — CORRECTED endpoint
    public Map requestOtp(String mobileNumber) throws Exception {
        String pemCert = fetchPublicCertificate();
        String encryptedMobile = encryptWithPublicKey(mobileNumber, pemCert);

        String url = ABHA_BASE_URL + "/v3/profile/login/request/otp";

        Map<String, Object> body = new HashMap<>();
        body.put("scope", new String[]{"abha-login", "mobile-verify"});
        body.put("loginHint", "mobile");
        body.put("loginId", encryptedMobile);
        body.put("otpSystem", "abdm");

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(getAccessToken());
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("REQUEST-ID", UUID.randomUUID().toString());
        headers.set("TIMESTAMP", Instant.now().toString());
        headers.set("X-CM-ID", "sbx");

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
        ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);

        return response.getBody();
    }

    // 6. Verify OTP — CORRECTED endpoint
    public Map verifyOtp(String txnId, String otp) throws Exception {
        String pemCert = fetchPublicCertificate();
        String encryptedOtp = encryptWithPublicKey(otp, pemCert);

        String url = ABHA_BASE_URL + "/v3/profile/login/verify";

        Map<String, Object> authData = new HashMap<>();
        authData.put("authMethods", new String[]{"otp"});
        Map<String, String> otpData = new HashMap<>();
        otpData.put("txnId", txnId);
        otpData.put("otpValue", encryptedOtp);
        authData.put("otp", otpData);

        Map<String, Object> body = new HashMap<>();
        body.put("scope", new String[]{"abha-login"});
        body.put("txnId", txnId);
        body.put("authData", authData);

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(getAccessToken());
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("REQUEST-ID", UUID.randomUUID().toString());
        headers.set("TIMESTAMP", Instant.now().toString());
        headers.set("X-CM-ID", "sbx");

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
        ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);

        return response.getBody();
    }
}