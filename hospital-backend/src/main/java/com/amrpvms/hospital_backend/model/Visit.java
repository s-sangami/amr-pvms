package com.amrpvms.hospital_backend.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "visits")
@Data
public class Visit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "patient_abha", nullable = false)
    private String patientAbha;

    @Column(name = "hospital_id")
    private Integer hospitalId;

    @Column(name = "doctor_id")
    private Integer doctorId;

    @Column(nullable = false)
    private String status;

    @Column(name = "checked_in_at")
    private LocalDateTime checkedInAt;
}