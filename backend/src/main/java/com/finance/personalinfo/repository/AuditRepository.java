package com.finance.personalinfo.repository;

import com.finance.personalinfo.entity.Audit;
import com.finance.personalinfo.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AuditRepository extends JpaRepository<Audit, Integer> {
    List<Audit> findByUser(User user);
    List<Audit> findByAuditType(Audit.AuditType auditType);
}
