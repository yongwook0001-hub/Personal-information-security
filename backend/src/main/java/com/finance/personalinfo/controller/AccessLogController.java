package com.finance.personalinfo.controller;

import com.finance.personalinfo.entity.AccessLog;
import com.finance.personalinfo.service.AccessLogService;
import com.finance.personalinfo.security.JwtProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/access-logs")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:8000", "http://127.0.0.1:8000"})
public class AccessLogController {

    private final AccessLogService accessLogService;
    private final JwtProvider jwtProvider;

    @GetMapping("/me")
    public ResponseEntity<List<AccessLog>> getMyAccessLogs(Authentication authentication) {
        try {
            String username = (String) authentication.getPrincipal();
            Integer userId = (Integer) authentication.getCredentials();

            List<AccessLog> logs = accessLogService.getUserAccessLogs(userId != null ? userId : 1);
            return ResponseEntity.ok(logs);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping
    public ResponseEntity<?> recordAccess(
            @RequestBody Map<String, Object> request,
            HttpServletRequest servletRequest,
            Authentication authentication) {
        try {
            Integer userId = (Integer) authentication.getCredentials();
            Integer infoId = ((Number) request.get("infoId")).intValue();
            String actionType = (String) request.getOrDefault("actionType", "VIEW");
            String reason = (String) request.get("reason");

            if (reason == null || reason.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Reason is required"));
            }

            String ipAddress = getClientIpAddress(servletRequest);
            accessLogService.recordAccess(userId, infoId, actionType, reason, ipAddress);

            return ResponseEntity.ok(Map.of("message", "Access logged successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0];
        }
        return request.getRemoteAddr();
    }
}
