package com.finance.personalinfo.controller;

import com.finance.personalinfo.dto.LoginRequest;
import com.finance.personalinfo.dto.LoginResponse;
import com.finance.personalinfo.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:8000", "http://127.0.0.1:8000"})
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {
        try {
            LoginResponse response = authService.login(request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(
                LoginResponse.builder()
                    .token(null)
                    .userId(null)
                    .username(request.getUsername())
                    .name(null)
                    .role(null)
                    .build()
            );
        }
    }
}
