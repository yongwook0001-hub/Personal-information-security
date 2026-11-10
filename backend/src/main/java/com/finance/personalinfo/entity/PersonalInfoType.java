package com.finance.personalinfo.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "PersonalInfoTypes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PersonalInfoType {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer infoTypeId;
    
    @Column(nullable = false, unique = true, length = 50)
    private String typeName;
    
    @Column
    private Integer sensitivityLevel; // 1~5
    
    @Column(length = 255)
    private String description;
}
