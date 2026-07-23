package com.amrpvms.hospital_backend.model;

import jakarta.persistence.*;
import lombok.Data;

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
}