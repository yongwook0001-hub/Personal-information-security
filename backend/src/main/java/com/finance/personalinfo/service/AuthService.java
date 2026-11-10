package com.finance.personalinfo.service;

import com.finance.personalinfo.dto.LoginRequest;
import com.finance.personalinfo.dto.LoginResponse;
import com.finance.personalinfo.entity.User;
import com.finance.personalinfo.repository.UserRepository;
import com.finance.personalinfo.security.JwtProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {
    
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;
    
    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByUsername(request.getUsername())
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Invalid password");
        }
        
        if (!user.getIsActive()) {
            throw new IllegalArgumentException("User is inactive");
        }
        
        String token = jwtProvider.generateToken(user.getUserId(), user.getUsername(), user.getRole().toString());
        
        return LoginResponse.builder()
            .token(token)
            .userId(user.getUserId())
            .username(user.getUsername())
            .name(user.getName())
            .role(user.getRole().toString())
            .build();
    }
}
