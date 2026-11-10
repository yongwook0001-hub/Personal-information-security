package com.finance.personalinfo.service;

import com.finance.personalinfo.dto.CustomerDTO;
import com.finance.personalinfo.entity.Customer;
import com.finance.personalinfo.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CustomerService {
    
    private final CustomerRepository customerRepository;
    
    public List<CustomerDTO> searchByName(String name) {
        return customerRepository.findByNameContaining(name)
            .stream()
            .map(this::convertToDTO)
            .collect(Collectors.toList());
    }
    
    public CustomerDTO getCustomerById(Integer customerId) {
        return customerRepository.findById(customerId)
            .map(this::convertToDTO)
            .orElseThrow(() -> new IllegalArgumentException("Customer not found"));
    }
    
    private CustomerDTO convertToDTO(Customer customer) {
        return CustomerDTO.builder()
            .customerId(customer.getCustomerId())
            .name(customer.getName())
            .phone(customer.getPhone())
            .address(customer.getAddress())
            .registeredAt(customer.getRegisteredAt())
            .build();
    }
}
