package com.smartims.repository;

import com.smartims.entity.Issue;
import com.smartims.enums.IssueStatus;
import com.smartims.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface IssueRepository extends JpaRepository<Issue, Long> {

    long countByStatus(IssueStatus status);

    List<Issue> findByAssignedEngineer(User engineer);

    long countByAssignedEngineer(User engineer);

    List<Issue> findByStatus(IssueStatus status);

    @Query("SELECT i.status, COUNT(i) FROM Issue i GROUP BY i.status")
    List<Object[]> countByStatusGroup();

    @Query("SELECT i.severity, COUNT(i) FROM Issue i GROUP BY i.severity")
    List<Object[]> countBySeverityGroup();

    @Query("SELECT i.priorityLevel, COUNT(i) FROM Issue i GROUP BY i.priorityLevel")
    List<Object[]> countByPriorityGroup();

    List<Issue> findBySlaBreachedTrue();
}
