package com.finance.personalinfo.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "AccessLogs", indexes = {
    @Index(name = "idx_user", columnList = "user_id"),
    @Index(name = "idx_customer", columnList = "customer_id"),
    @Index(name = "idx_accessed_at", columnList = "accessed_at"),
    @Index(name = "idx_info", columnList = "info_id"),
    @Index(name = "idx_composite", columnList = "user_id, accessed_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AccessLog {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer logId;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "info_id", nullable = false)
    private PersonalInfo personalInfo;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ActionType actionType;
    
    @Column(length = 255)
    private String accessReason;
    
    @Column(nullable = false, updatable = false)
    private LocalDateTime accessedAt = LocalDateTime.now();
    
    @Column(length = 45)
    private String ipAddress;
    
    @Column(length = 255)
    private String deviceInfo;
    
    public enum ActionType {
        VIEW, EDIT, DELETE
    }
}
