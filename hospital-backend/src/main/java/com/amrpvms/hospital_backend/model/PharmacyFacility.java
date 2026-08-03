package com.amrpvms.hospital_backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "pharmacy_facilities")
@Data
public class PharmacyFacility {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private String name;

    @Column
    private String type;

    @Column(name = "drug_license_number")
    private String drugLicenseNumber; // under Drugs and Cosmetics Act

    @Column(name = "gstin")
    private String gstin;

    @Column(name = "verification_status")
    private String verificationStatus = "PENDING";

    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    @Column(name = "verified_by")
    private String verifiedBy;
}