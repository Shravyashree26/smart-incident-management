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

    // 1️⃣ CREATE PROJECT
//    @Override
//    public ProjectResponse createProject(CreateProjectRequest request) {
//
//        User manager = userRepository.findById(request.getManagerId())
//                .orElseThrow(() -> new RuntimeException("Manager not found"));
//
//        List<User> members = userRepository.findAllById(request.getMemberIds());
//
//        Project project = Project.builder()
//                .name(request.getName())
//                .description(request.getDescription())
//                .manager(manager)
//                .members(members)
//                .build();
//
//        projectRepository.save(project);
//
//        // Notification
//        notificationInboxService.notifyForProjectEvent(
//                "PROJECT_MEMBER_ADDED",
//                "User added to project " + project.getName(),
//                project
//        );
//
//        //Audit log
//        auditLogService.log(
//                "CREATE_PROJECT",
//                "PROJECT",
//                project.getId(),
//                "Project created with manager " + project.getManager().getEmail()
//        );
//
//        return mapToResponse(project);
//    }

    @Override
    public ProjectResponse createProject(CreateProjectRequest request) {
        // ✅ VALIDATE managerId
        if (request.getManagerId() == null) {
            throw new IllegalArgumentException("Manager ID must not be null");
        }

        // ✅ FETCH manager properly
        User manager = userRepository.findById(request.getManagerId())
                .orElseThrow(() ->
                        new RuntimeException("Manager not found with id: " + request.getManagerId())
                );

        // ✅ FETCH members safely
        List<User> members = new ArrayList<>();
        if (request.getMemberIds() != null && !request.getMemberIds().isEmpty()) {
            members = userRepository.findAllById(request.getMemberIds());
        }

        Project project = Project.builder()
                .name(request.getName())
                .description(request.getDescription())
                .manager(manager)
                .members(members)
                .createdAt(LocalDateTime.now())
                .build();

        Project savedProject = projectRepository.save(project);

        //Notification
        notificationInboxService.notifyForProjectEvent(
                "PROJECT_MEMBER_ADDED",
                "User added to project " + project.getName(),
                project
        );

        //Audit log
        auditLogService.log(
                "CREATE_PROJECT",
                "PROJECT",
                project.getId(),
                "Project created with manager " + project.getManager().getEmail()
        );


        return mapToResponse(project);
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
        return projectRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public ProjectResponse getProjectById(Long id) {

        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        return mapToResponse(project);
    }

    @Override
    public ProjectResponse updateProject(Long id, UpdateProjectRequest request) {

        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        if (request.getName() != null)
            project.setName(request.getName());

        if (request.getDescription() != null)
            project.setDescription(request.getDescription());

        if (request.getManagerId() != null) {
            User manager = userRepository.findById(request.getManagerId())
                    .orElseThrow(() -> new RuntimeException("Manager not found"));
            project.setManager(manager);
        }

        if (request.getMemberIds() != null) {
            List<User> members = userRepository.findAllById(request.getMemberIds());

            if (members.size() != request.getMemberIds().size()) {
                throw new RuntimeException("One or more members not found");
            }
            project.setMembers(members);
        }

        projectRepository.save(project);
        return mapToResponse(project);
    }

    @Override
    public void deleteProject(Long id) {

        if (!projectRepository.existsById(id)) {
            throw new RuntimeException("Project not found");
        }

        projectRepository.deleteById(id);
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
