package com.finance.personalinfo.controller;

import com.finance.personalinfo.entity.DeletionRequest;
import com.finance.personalinfo.service.DeletionRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/deletion-requests")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:8000", "http://127.0.0.1:8000"})
public class DeletionRequestController {

    private final DeletionRequestService deletionRequestService;

    @PostMapping
    public ResponseEntity<?> createDeletionRequest(
            @RequestBody Map<String, Object> request,
            Authentication authentication) {
        try {
            Integer infoId = ((Number) request.get("infoId")).intValue();
            String reason = (String) request.get("reason");

            if (reason == null || reason.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Reason is required"));
            }

            Integer userId = (Integer) authentication.getCredentials();
            DeletionRequest deletionRequest = deletionRequestService.createDeletionRequest(infoId, userId != null ? userId : 1, reason);

            return ResponseEntity.ok(deletionRequest);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/pending")
    public ResponseEntity<List<DeletionRequest>> getPendingRequests() {
        List<DeletionRequest> requests = deletionRequestService.getPendingRequests();
        return ResponseEntity.ok(requests);
    }
}
