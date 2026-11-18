package com.finance.personalinfo.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoginResponse {
    private String token;
    private Integer userId;
    private String username;
    private String name;
    private String role;
    private String department;   // 부서 (화면 사이드바·인사말에 표시)
    private String position;     // 직책
}
