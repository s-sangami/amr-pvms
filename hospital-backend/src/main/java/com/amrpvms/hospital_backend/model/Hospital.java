package com.amrpvms.hospital_backend.model;

import jakarta.persistence.*;
import lombok.Data;

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
}