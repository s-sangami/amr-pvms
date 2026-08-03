package com.amrpvms.hospital_backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "hospitals")
@Data
public class Hospital {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private String name;

    @Column(name = "pharmacy_id")
    private Integer pharmacyId;

    @Column
    private String type;

    @Column(name = "registration_number")
    private String registrationNumber; // Clinical Establishment / state-specific registration number

    @Column(name = "gstin")
    private String gstin;

    @Column(name = "verification_status")
    private String verificationStatus = "PENDING"; // PENDING, VERIFIED, REJECTED

    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    @Column(name = "verified_by")
    private String verifiedBy; // admin username who verified it
}