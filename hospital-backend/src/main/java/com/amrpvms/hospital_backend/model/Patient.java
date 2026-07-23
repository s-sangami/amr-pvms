package com.amrpvms.hospital_backend.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDate;

@Entity
@Table(name = "patients")
@Data
public class Patient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(unique = true, nullable = false)
    private String abha;

    @Column(nullable = false)
    private String name;

    @Column
    private LocalDate dob;

    @Column(name = "blood_group")
    private String bloodGroup;
}