package com.finance.personalinfo.repository;

import com.finance.personalinfo.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Integer> {
    List<Customer> findByNameContaining(String name);
    List<Customer> findByPhone(String phone);
}
