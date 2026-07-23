package com.amrpvms.hospital_backend.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "prescription_groups")
@Data
public class PrescriptionGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "patient_abha", nullable = false)
    private String patientAbha;

    @Column(name = "doctor_id")
    private Integer doctorId;

    @Column(name = "hospital_id")
    private Integer hospitalId;

    @Column(name = "pharmacy_id")
    private Integer pharmacyId;

    @Column(name = "qr_code", unique = true)
    private String qrCode;

    @Column
    private String status;

    @Column(name = "issued_at")
    private LocalDateTime issuedAt;

    @Column(name = "extended_days")
    private Integer extendedDays = 0;

    @Column(name = "extension_note")
    private String extensionNote;
}