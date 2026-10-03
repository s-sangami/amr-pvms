package com.amrpvms.hospital_backend.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "drug_master")
@Data
public class DrugMaster {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(unique = true, nullable = false)
    private String name;

    @Column(name = "drug_class")
    private String drugClass;

    @Column(name = "schedule_type")
    private String scheduleType;
}