package com.amrpvms.hospital_backend.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "dispensing_log")
@Data
public class DispensingLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "prescription_id")
    private Integer prescriptionId;

    @Column(name = "pharmacy_id")
    private Integer pharmacyId;

    @Column(name = "qty_dispensed")
    private Integer qtyDispensed;

    @Column(name = "dispensed_at")
    private LocalDateTime dispensedAt;

    @Column
    private String status;

    @Column(name = "drug_name")
    private String drugName;

    @Column(name = "patient_abha")
    private String patientAbha;

    @Column(name = "reject_reason")
    private String rejectReason;
}