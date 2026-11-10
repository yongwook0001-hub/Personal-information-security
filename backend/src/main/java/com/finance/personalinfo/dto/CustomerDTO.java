package com.finance.personalinfo.dto;

import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerDTO {
    private Integer customerId;
    private String name;
    private String phone;
    private String address;
    private LocalDateTime registeredAt;
}
