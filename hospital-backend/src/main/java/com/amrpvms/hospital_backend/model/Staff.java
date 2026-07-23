package com.amrpvms.hospital_backend.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "staff")
@Data
public class Staff {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "pharmacy_facility_id")
    private Integer pharmacyFacilityId;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(nullable = false)
    private String role;

    @Column(name = "hospital_id")
    private Integer hospitalId;

    @Column(name = "doctor_id")
    private Integer doctorId;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column
    private String specialization;
    @Column(name = "hpr_id")
    private String hprId;

    @Column(name = "hpr_verified")
    private Boolean hprVerified = false;
}