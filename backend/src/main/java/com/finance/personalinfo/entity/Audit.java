package com.finance.personalinfo.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "Audits", indexes = {
    @Index(name = "idx_user", columnList = "user_id"),
    @Index(name = "idx_audit_type", columnList = "audit_type"),
    @Index(name = "idx_audited_at", columnList = "audited_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Audit {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer auditId;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @Column
    private LocalDateTime auditPeriodStart;
    
    @Column
    private LocalDateTime auditPeriodEnd;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AuditType auditType = AuditType.ROUTINE;
    
    @Column
    private Integer accessCount = 0;
    
    @Column(columnDefinition = "JSON")
    private String alertFlags;
    
    @Column(columnDefinition = "LONGTEXT")
    private String auditNotes;
    
    @Column(nullable = false, updatable = false)
    private LocalDateTime auditedAt = LocalDateTime.now();
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "audited_by", nullable = false)
    private User auditedBy;
    
    public enum AuditType {
        ROUTINE, ALERT, INVESTIGATION
    }
}
