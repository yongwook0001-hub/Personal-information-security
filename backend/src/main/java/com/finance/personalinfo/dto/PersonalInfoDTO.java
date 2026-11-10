package com.finance.personalinfo.dto;

import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PersonalInfoDTO {
    private Integer infoId;
    private Integer customerId;
    private String infoType;
    private Integer sensitivityLevel;
    private String infoValue;
    private LocalDateTime registeredAt;
}
