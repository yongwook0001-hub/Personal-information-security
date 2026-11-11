package com.finance.personalinfo.controller;

import com.finance.personalinfo.dto.CustomerDTO;
import com.finance.personalinfo.service.CustomerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:8000", "http://127.0.0.1:8000"})
public class CustomerController {

    private final CustomerService customerService;

    @GetMapping
    public ResponseEntity<List<CustomerDTO>> searchCustomers(@RequestParam(required = false) String name) {
        if (name == null || name.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        List<CustomerDTO> customers = customerService.searchByName(name);
        return ResponseEntity.ok(customers);
    }

    @GetMapping("/{customerId}")
    public ResponseEntity<CustomerDTO> getCustomerById(@PathVariable Integer customerId) {
        try {
            CustomerDTO customer = customerService.getCustomerById(customerId);
            return ResponseEntity.ok(customer);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
