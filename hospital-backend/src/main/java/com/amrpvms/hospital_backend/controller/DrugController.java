package com.amrpvms.hospital_backend.controller;

import com.amrpvms.hospital_backend.model.DrugMaster;
import com.amrpvms.hospital_backend.repository.DrugMasterRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/drugs")
public class DrugController {

    @Autowired
    private DrugMasterRepository drugMasterRepository;

    @GetMapping("/list")
    public ResponseEntity<List<DrugMaster>> list() {
        return ResponseEntity.ok(drugMasterRepository.findAll());
    }
}