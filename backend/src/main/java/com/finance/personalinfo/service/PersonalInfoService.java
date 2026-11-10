package com.finance.personalinfo.service;

import com.finance.personalinfo.dto.PersonalInfoDTO;
import com.finance.personalinfo.entity.Customer;
import com.finance.personalinfo.entity.PersonalInfo;
import com.finance.personalinfo.repository.CustomerRepository;
import com.finance.personalinfo.repository.PersonalInfoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PersonalInfoService {
    
    private final PersonalInfoRepository personalInfoRepository;
    private final CustomerRepository customerRepository;
    
    public List<PersonalInfoDTO> getCustomerPersonalInfo(Integer customerId) {
        Customer customer = customerRepository.findById(customerId)
            .orElseThrow(() -> new IllegalArgumentException("Customer not found"));
        
        return personalInfoRepository.findByCustomer(customer)
            .stream()
            .map(this::convertToDTO)
            .collect(Collectors.toList());
    }
    
    public PersonalInfoDTO getPersonalInfoById(Integer infoId) {
        return personalInfoRepository.findById(infoId)
            .map(this::convertToDTO)
            .orElseThrow(() -> new IllegalArgumentException("Personal info not found"));
    }
    
    private PersonalInfoDTO convertToDTO(PersonalInfo info) {
        return PersonalInfoDTO.builder()
            .infoId(info.getInfoId())
            .customerId(info.getCustomer().getCustomerId())
            .infoType(info.getInfoType().getTypeName())
            .sensitivityLevel(info.getInfoType().getSensitivityLevel())
            .registeredAt(info.getRegisteredAt())
            .build();
    }
}
