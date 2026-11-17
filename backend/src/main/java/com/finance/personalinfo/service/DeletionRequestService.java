package com.finance.personalinfo.service;

import com.finance.personalinfo.entity.DeletionRequest;
import com.finance.personalinfo.entity.PersonalInfo;
import com.finance.personalinfo.entity.User;
import com.finance.personalinfo.repository.DeletionRequestRepository;
import com.finance.personalinfo.repository.PersonalInfoRepository;
import com.finance.personalinfo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DeletionRequestService {
    
    private final DeletionRequestRepository deletionRequestRepository;
    private final PersonalInfoRepository personalInfoRepository;
    private final UserRepository userRepository;
    
    public DeletionRequest createDeletionRequest(Integer infoId, Integer userId, String reason) {
        PersonalInfo personalInfo = personalInfoRepository.findById(infoId)
            .orElseThrow(() -> new IllegalArgumentException("Personal info not found"));
        
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        DeletionRequest request = DeletionRequest.builder()
            .personalInfo(personalInfo)
            .customer(personalInfo.getCustomer())
            .requestedBy(user)
            .deletionReason(reason)
            .status(DeletionRequest.RequestStatus.PENDING)
            .build();
        
        return deletionRequestRepository.save(request);
    }
    
    public List<DeletionRequest> getPendingRequests() {
        return deletionRequestRepository.findByStatus(DeletionRequest.RequestStatus.PENDING);
    }

    public DeletionRequest approveDeletion(Integer requestId, String notes) {
        DeletionRequest request = deletionRequestRepository.findById(requestId)
            .orElseThrow(() -> new IllegalArgumentException("Request not found"));

        request.setStatus(DeletionRequest.RequestStatus.APPROVED);

        return deletionRequestRepository.save(request);
    }

    public DeletionRequest rejectDeletion(Integer requestId, String reason) {
        DeletionRequest request = deletionRequestRepository.findById(requestId)
            .orElseThrow(() -> new IllegalArgumentException("Request not found"));

        request.setStatus(DeletionRequest.RequestStatus.REJECTED);

        return deletionRequestRepository.save(request);
    }
}
