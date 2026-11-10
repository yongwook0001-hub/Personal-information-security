package com.finance.personalinfo.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "PersonalInfo", indexes = {
    @Index(name = "idx_customer", columnList = "customer_id"),
    @Index(name = "idx_type", columnList = "info_type_id")
}, uniqueConstraints = {
    @UniqueConstraint(name = "unique_info", columnNames = {"customer_id", "info_type_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PersonalInfo {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer infoId;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "info_type_id", nullable = false)
    private PersonalInfoType infoType;
    
    @Column(nullable = false, columnDefinition = "LONGBLOB")
    private byte[] infoValue; // 암호화되어 저장됨
    
    @Column(nullable = false, updatable = false)
    private LocalDateTime registeredAt = LocalDateTime.now();
}
