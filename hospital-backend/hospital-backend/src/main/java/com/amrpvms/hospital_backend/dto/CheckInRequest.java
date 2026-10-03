package com.amrpvms.hospital_backend.dto;

import lombok.Data;

@Data
public class CheckInRequest {
    private String abha;
    private Integer hospitalId;
    private Integer doctorId;
}