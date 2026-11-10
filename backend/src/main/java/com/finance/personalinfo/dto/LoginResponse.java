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
}
