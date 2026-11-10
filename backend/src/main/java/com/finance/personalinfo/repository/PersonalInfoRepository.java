package com.finance.personalinfo.repository;

import com.finance.personalinfo.entity.PersonalInfo;
import com.finance.personalinfo.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PersonalInfoRepository extends JpaRepository<PersonalInfo, Integer> {
    List<PersonalInfo> findByCustomer(Customer customer);
    List<PersonalInfo> findByCustomerAndInfoType_InfoTypeId(Customer customer, Integer infoTypeId);
}
