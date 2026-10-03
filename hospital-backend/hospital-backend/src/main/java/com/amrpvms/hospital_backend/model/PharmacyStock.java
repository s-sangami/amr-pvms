package com.amrpvms.hospital_backend.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "pharmacy_stock")
@Data
public class PharmacyStock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "pharmacy_id")
    private Integer pharmacyId;

    @Column(nullable = false)
    private String drug;

    @Column(nullable = false)
    private Integer quantity;
}