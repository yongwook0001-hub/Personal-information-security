package com.finance.personalinfo.repository;

import com.finance.personalinfo.entity.AccessLog;
import com.finance.personalinfo.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AccessLogRepository extends JpaRepository<AccessLog, Integer> {
    List<AccessLog> findByUser(User user);
    
    @Query("SELECT al FROM AccessLog al WHERE al.user.userId = :userId AND al.accessedAt >= :startTime ORDER BY al.accessedAt DESC")
    List<AccessLog> findRecentAccessLogs(@Param("userId") Integer userId, @Param("startTime") LocalDateTime startTime);
    
    @Query("SELECT COUNT(al) FROM AccessLog al WHERE al.user.userId = :userId AND al.accessedAt >= :startTime")
    int countAccessLogsIn24Hours(@Param("userId") Integer userId, @Param("startTime") LocalDateTime startTime);
}
