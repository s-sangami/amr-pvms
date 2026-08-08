package com.amrpvms.hospital_backend.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDate;

@Entity
@Table(name = "doctor_leave")
@Data
public class DoctorLeave {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "doctor_id", nullable = false)
    private Integer doctorId;

    @Column(name = "leave_from", nullable = false)
    private LocalDate leaveFrom;

    @Column(name = "leave_until", nullable = false)
    private LocalDate leaveUntil;

    @Column
    private String reason;

    @Column(name = "substitute_doctor_id")
    private Integer substituteDoctorId;

    @Column
    private String status;
}