package com.amrpvms.hospital_backend;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class HashGenerator {
    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        System.out.println("Ram@123 -> " + encoder.encode("Ram@123"));
        System.out.println("Latha@123 -> " + encoder.encode("Latha@123"));
        System.out.println("Kumar@123 -> " + encoder.encode("Kumar@123"));
    }
}