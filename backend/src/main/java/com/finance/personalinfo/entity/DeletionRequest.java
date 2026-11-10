package com.finance.personalinfo.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "DeletionRequests", indexes = {
    @Index(name = "idx_status", columnList = "status"),
    @Index(name = "idx_requested_at", columnList = "requested_at"),
    @Index(name = "idx_approved_by", columnList = "approved_by")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeletionRequest {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer requestId;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "info_id", nullable = false)
    private PersonalInfo personalInfo;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requested_by", nullable = false)
    private User requestedBy;
    
    @Column(length = 255)
    private String deletionReason;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RequestStatus status = RequestStatus.PENDING;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by")
    private User approvedBy;
    
    @Column(nullable = false, updatable = false)
    private LocalDateTime requestedAt = LocalDateTime.now();
    
    @Column
    private LocalDateTime approvedAt;
    
    @Column
    private LocalDateTime deletedAt;
    
    @Column(length = 255)
    private String rejectionReason;
    
    public enum RequestStatus {
        PENDING, APPROVED, REJECTED, DELETED
    }
}
