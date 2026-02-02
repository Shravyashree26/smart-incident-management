package com.smartims.repository;

import com.smartims.entity.Issue;
import com.smartims.entity.Project;
import com.smartims.enums.IssueStatus;
import com.smartims.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface IssueRepository extends JpaRepository<Issue, Long> {

    long countByStatus(IssueStatus status);

    List<Issue> findByAssignedEngineer(User engineer);

    List<Issue> findByAssignedEngineerId(Long engineerId);

    List<Issue> findByStatus(IssueStatus status);

    @Query("SELECT i.status, COUNT(i) FROM Issue i GROUP BY i.status")
    List<Object[]> countByStatusGroup();

    @Query("SELECT i.severity, COUNT(i) FROM Issue i GROUP BY i.severity")
    List<Object[]> countBySeverityGroup();

    @Query("SELECT i.priorityLevel, COUNT(i) FROM Issue i GROUP BY i.priorityLevel")
    List<Object[]> countByPriorityGroup();

    List<Issue> findBySlaBreachedTrue();

    List<Issue> findByProject(Project project);

    List<Issue> findByProjectAndAssignedEngineer(Project project, User engineer);

    long countByProject(Project project);

    long countByProjectAndStatus(Project project, IssueStatus status);

    long countByProjectAndSlaBreachedTrue(Project project);

    long countByAssignedEngineerAndStatus(User engineer, IssueStatus status);

    long countByAssignedEngineerAndStatusIn(
            User engineer,
            List<IssueStatus> statuses
    );

    long countByProjectInAndStatusIn(
            List<Project> projects,
            List<IssueStatus> statuses
    );

    long countBySlaBreachedTrue();
    long count();

}
