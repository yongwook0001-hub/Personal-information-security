package com.finance.personalinfo.repository;

import com.finance.personalinfo.entity.DeletionRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface DeletionRequestRepository extends JpaRepository<DeletionRequest, Integer> {
    List<DeletionRequest> findByStatus(DeletionRequest.RequestStatus status);
}
