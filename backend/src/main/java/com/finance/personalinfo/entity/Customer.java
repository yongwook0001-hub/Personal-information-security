package com.finance.personalinfo.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "Customers", indexes = {
    @Index(name = "idx_name", columnList = "name"),
    @Index(name = "idx_phone", columnList = "phone")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Customer {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer customerId;
    
    @Column(nullable = false, length = 100)
    private String name;
    
    @Column(length = 20)
    private String phone;
    
    @Column(length = 255)
    private String address;
    
    @Column(nullable = false, updatable = false)
    private LocalDateTime registeredAt = LocalDateTime.now();
}
