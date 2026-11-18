package com.finance.personalinfo.controller;

import java.util.Map;

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
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            LoginResponse response = authService.login(request);
            return ResponseEntity.ok(response);
        } catch (IllegalStateException e) {
            // 권한 해제된 계정 → 403 + 코드 (프론트가 안내 문구 표시)
            return ResponseEntity.status(403).body(Map.of(
                "message", e.getMessage(),
                "code", "ACCOUNT_DISABLED"
            ));
        } catch (IllegalArgumentException e) {
            // 아이디 없음/비밀번호 틀림은 같은 문구로 (어느 쪽이 틀렸는지 알려주지 않음)
            return ResponseEntity.status(401).body(Map.of(
                "message", "아이디 또는 비밀번호가 올바르지 않습니다."
            ));
        }
    }
}
