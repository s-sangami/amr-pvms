package com.amrpvms.hospital_backend.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "prescriptions")
@Data
public class Prescription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "patient_abha", nullable = false)
    private String patientAbha;

    @Column(name = "doctor_id")
    private Integer doctorId;

    @Column(nullable = false)
    private String drug;

    @Column
    private String dose;

    @Column
    private String duration;

    @Column
    private String status;

    @Column(name = "issued_at")
    private LocalDateTime issuedAt;

    @Column(name = "prescription_group_id")
    private Integer prescriptionGroupId;

    @Column(name = "external_prescription_id")
    private String externalPrescriptionId;
}