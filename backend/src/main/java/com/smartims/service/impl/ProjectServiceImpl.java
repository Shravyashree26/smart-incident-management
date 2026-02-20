package com.smartims.service.impl;

import com.smartims.dto.CreateProjectRequest;
import com.smartims.dto.ProjectResponse;
import com.smartims.dto.UpdateProjectRequest;
import com.smartims.entity.Project;
import com.smartims.entity.User;
import com.smartims.repository.ProjectRepository;
import com.smartims.repository.UserRepository;
import com.smartims.service.AuditLogService;
import com.smartims.service.NotificationInboxService;
import com.smartims.service.ProjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProjectServiceImpl implements ProjectService {

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final NotificationInboxService notificationInboxService;

    @Override
    public ProjectResponse createProject(CreateProjectRequest request) {

        if (request.getManagerId() == null) {
            throw new IllegalArgumentException("Manager ID must not be null");
        }

        User manager = userRepository.findById(request.getManagerId())
                .orElseThrow(() ->
                        new RuntimeException("Manager not found with id: " + request.getManagerId())
                );

        List<User> members = new ArrayList<>();
        if (request.getMemberIds() != null && !request.getMemberIds().isEmpty()) {
            members = userRepository.findAllById(request.getMemberIds());
        }

        Project project = Project.builder()
                .name(request.getName())
                .description(request.getDescription())
                .manager(manager)
                .company(manager.getCompany())
                .members(members)
                .createdAt(LocalDateTime.now())
                .build();

        Project savedProject = projectRepository.save(project);

        notificationInboxService.notifyForProjectEvent(
                "PROJECT_CREATED",
                "Project created: " + savedProject.getName(),
                savedProject
        );

        auditLogService.log(
                "PROJECT_CREATED",
                "PROJECT",
                savedProject.getId(),
                "Project created with manager " + manager.getEmail()
        );

        return mapToResponse(savedProject);
    }

    @Override
    public List<ProjectResponse> getProjectsForCurrentUser() {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();

        User currentUser = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Project> projects;

        if (currentUser.getRole().name().equals("ADMIN")) {
            projects = projectRepository.findAll();
        } else if (currentUser.getRole().name().equals("MANAGER")) {
            projects = projectRepository.findByManager(currentUser);
        } else {
            projects = projectRepository.findByMembersContaining(currentUser);
        }

        return projects.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<ProjectResponse> getAllProjects() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth != null ? auth.getName() : null;

        // If no authentication, return all projects (shouldn't happen in practice)
        if (email == null) {
            return projectRepository.findAll()
                    .stream()
                    .map(this::mapToResponse)
                    .collect(Collectors.toList());
        }

        User currentUser = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Project> projects;

        // SUPER_ADMIN can see all projects
        if (currentUser.getRole().name().equals("SUPER_ADMIN")) {
            projects = projectRepository.findAll();
        }
        // ADMIN can see only their company's projects
        else if (currentUser.getRole().name().equals("ADMIN")) {
            String company = currentUser.getCompany();
            if (company == null || company.isBlank()) {
                projects = projectRepository.findAll();
            } else {
                projects = projectRepository.findByCompany(company);
            }
        }
        // MANAGER can see only their projects
        else if (currentUser.getRole().name().equals("MANAGER")) {
            projects = projectRepository.findByManager(currentUser);
        }
        // ENGINEER and USER can see only projects they're members of
        else {
            projects = projectRepository.findByMembersContaining(currentUser);
        }

        return projects.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public ProjectResponse getProjectById(Long id) {

        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        // Check access permissions
        validateProjectAccess(project);

        return mapToResponse(project);
    }

    @Override
    public ProjectResponse updateProject(Long id, UpdateProjectRequest request) {

        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        // Check access permissions
        validateProjectAccess(project);

        String oldName = project.getName();

        if (request.getName() != null) {
            project.setName(request.getName());
        }

        if (request.getDescription() != null) {
            project.setDescription(request.getDescription());
        }

        if (request.getManagerId() != null) {
            User manager = userRepository.findById(request.getManagerId())
                    .orElseThrow(() -> new RuntimeException("Manager not found"));
            project.setManager(manager);
            project.setCompany(manager.getCompany());
        }

        if (request.getMemberIds() != null) {
            List<User> members = userRepository.findAllById(request.getMemberIds());

            if (members.size() != request.getMemberIds().size()) {
                throw new RuntimeException("One or more members not found");
            }
            project.setMembers(members);
        }

        Project updatedProject = projectRepository.save(project);

        notificationInboxService.notifyForProjectEvent(
                "PROJECT_UPDATED",
                "Project updated: " + updatedProject.getName(),
                updatedProject
        );

        auditLogService.log(
                "PROJECT_UPDATED",
                "PROJECT",
                updatedProject.getId(),
                "Project updated (old name: " + oldName + ", new name: " + updatedProject.getName() + ")"
        );

        return mapToResponse(updatedProject);
    }

    @Override
    public void deleteProject(Long id) {

        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        // Check access permissions
        validateProjectAccess(project);

        notificationInboxService.notifyForProjectEvent(
                "PROJECT_DELETED",
                "Project deleted: " + project.getName(),
                project
        );

        projectRepository.delete(project);

        auditLogService.log(
                "PROJECT_DELETED",
                "PROJECT",
                id,
                "Project deleted: " + project.getName()
        );
    }

    private void validateProjectAccess(Project project) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth != null ? auth.getName() : null;

        if (email == null) {
            throw new RuntimeException("User not authenticated");
        }

        User currentUser = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // SUPER_ADMIN can access any project
        if (currentUser.getRole().name().equals("SUPER_ADMIN")) {
            return;
        }

        // ADMIN can access projects from their company only
        if (currentUser.getRole().name().equals("ADMIN")) {
            String userCompany = currentUser.getCompany();
            String projectManagerCompany = project.getManager() != null ? project.getManager().getCompany() : null;

            if (userCompany == null || !userCompany.equals(projectManagerCompany)) {
                throw new RuntimeException("Access denied: Project belongs to a different company");
            }
            return;
        }

        // MANAGER can access projects they manage and only from their company
        if (currentUser.getRole().name().equals("MANAGER")) {
            if (!project.getManager().getId().equals(currentUser.getId())) {
                throw new RuntimeException("Access denied: You can only access projects you manage");
            }
            return;
        }

        // ENGINEER and USER can access projects they're members of
        if (!project.getMembers().contains(currentUser)) {
            throw new RuntimeException("Access denied: You are not a member of this project");
        }
    }

    private ProjectResponse mapToResponse(Project project) {
        return ProjectResponse.builder()
                .id(project.getId())
                .name(project.getName())
                .description(project.getDescription())
                .managerName(
                        project.getManager() != null
                                ? project.getManager().getEmail()
                                : null
                )
                .memberNames(
                        project.getMembers()
                                .stream()
                                .map(User::getEmail)
                                .collect(Collectors.toList())
                )
                .build();
    }
}
