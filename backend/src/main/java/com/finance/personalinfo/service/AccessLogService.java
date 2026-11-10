package com.finance.personalinfo.service;

import com.finance.personalinfo.entity.AccessLog;
import com.finance.personalinfo.entity.PersonalInfo;
import com.finance.personalinfo.entity.User;
import com.finance.personalinfo.repository.AccessLogRepository;
import com.finance.personalinfo.repository.PersonalInfoRepository;
import com.finance.personalinfo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AccessLogService {
    
    private final AccessLogRepository accessLogRepository;
    private final UserRepository userRepository;
    private final PersonalInfoRepository personalInfoRepository;
    
    public void recordAccess(Integer userId, Integer infoId, String actionType, String reason, String ipAddress) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        PersonalInfo personalInfo = personalInfoRepository.findById(infoId)
            .orElseThrow(() -> new IllegalArgumentException("Personal info not found"));
        
        AccessLog accessLog = AccessLog.builder()
            .user(user)
            .personalInfo(personalInfo)
            .customer(personalInfo.getCustomer())
            .actionType(AccessLog.ActionType.valueOf(actionType))
            .accessReason(reason)
            .ipAddress(ipAddress)
            .accessedAt(LocalDateTime.now())
            .build();
        
        accessLogRepository.save(accessLog);
    }
    
    public List<AccessLog> getUserAccessLogs(Integer userId) {
        return accessLogRepository.findRecentAccessLogs(userId, LocalDateTime.now().minusDays(30));
    }
}
