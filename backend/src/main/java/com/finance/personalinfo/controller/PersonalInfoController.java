package com.finance.personalinfo.controller;

import com.finance.personalinfo.dto.PersonalInfoDTO;
import com.finance.personalinfo.service.PersonalInfoService;
import com.finance.personalinfo.service.AccessLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/info")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:8000", "http://127.0.0.1:8000"})
public class PersonalInfoController {

    private final PersonalInfoService personalInfoService;
    private final AccessLogService accessLogService;

    @GetMapping("/customer/{customerId}")
    public ResponseEntity<List<PersonalInfoDTO>> getCustomerPersonalInfo(@PathVariable Integer customerId) {
        try {
            List<PersonalInfoDTO> personalInfo = personalInfoService.getCustomerPersonalInfo(customerId);
            return ResponseEntity.ok(personalInfo);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/{infoId}/view")
    public ResponseEntity<?> viewPersonalInfo(
            @PathVariable Integer infoId,
            @RequestBody Map<String, String> request,
            Authentication authentication) {
        try {
            String reason = request.get("reason");
            if (reason == null || reason.isEmpty()) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Reason is required");
                return ResponseEntity.badRequest().body(error);
            }

            PersonalInfoDTO info = personalInfoService.getPersonalInfoById(infoId);

            String username = (String) authentication.getPrincipal();
            accessLogService.recordAccess(username, info.getCustomerId(), reason);

            return ResponseEntity.ok(info);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
