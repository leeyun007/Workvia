package com.workvia.backend.controller;

import com.workvia.backend.dto.ProjectResponseDTO;
import com.workvia.backend.entity.Project;
import com.workvia.backend.entity.ProjectMember;
import com.workvia.backend.entity.User;
import com.workvia.backend.repository.ProjectMemberRepository;
import com.workvia.backend.repository.ProjectRepository;
import com.workvia.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.Optional;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
@Transactional
public class ProjectController {

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final NotificationController notificationController;

    public record ProjectRequest(String name, String description) {}

    // 1. Get project list (Created projects + Joined projects)
    @GetMapping
    public ResponseEntity<?> getMyProjects(Authentication authentication) {
        User currentUser = (User) authentication.getPrincipal();
        String userEmail = currentUser.getEmail(); 

        List<Project> createdProjects = projectRepository.findByCreatedByEmailOrderByCreatedAtDesc(userEmail); 

        List<Project> joinedProjects = projectMemberRepository.findByUserId(currentUser.getId())
                .stream()
                .map(ProjectMember::getProject) 
                .toList();

        java.util.Set<Project> allMyProjects = new java.util.LinkedHashSet<>();
        if (createdProjects != null) {
            allMyProjects.addAll(createdProjects);
        }
        if (joinedProjects != null) {
            allMyProjects.addAll(joinedProjects);
        }

        List<ProjectResponseDTO> dtoList = allMyProjects.stream()
                .map(ProjectResponseDTO::fromEntity)
                .toList();

        return ResponseEntity.ok(dtoList);
    }

    // 2. Create project and automatically bind creator as ADMIN
    @PostMapping
    public ResponseEntity<?> createProject(@RequestBody ProjectRequest request, Authentication authentication) {
        User principal = (User) authentication.getPrincipal();
        String realEmail = principal.getEmail();

        User currentUser = userRepository.findByEmail(realEmail).orElse(null);
        if (currentUser == null) return ResponseEntity.badRequest().body(Map.of("error", "Account not found"));

        Project newProject = Project.builder()
                .name(request.name())
                .description(request.description())
                .status("Active")
                .createdBy(currentUser)
                .build();

        Project savedProject = projectRepository.save(newProject);

        ProjectMember ownerMember = ProjectMember.builder()
                .user(currentUser)
                .project(savedProject)
                .role("ADMIN")
                .joinedAt(LocalDateTime.now())
                .build();
                
        projectMemberRepository.save(ownerMember);

        return ResponseEntity.ok(ProjectResponseDTO.fromEntity(savedProject));
    }

    // 3. Get all project members
    @GetMapping("/{id}/members")
    public ResponseEntity<List<ProjectMember>> getProjectMembers(@PathVariable UUID id) {
        List<ProjectMember> members = projectMemberRepository.findByProjectId(id);
        return ResponseEntity.ok(members);
    }

    // 4. Update project information
    @PatchMapping("/{id}")
    public ResponseEntity<?> updateProject(@PathVariable UUID id, @RequestBody Map<String, String> updates) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Project not found"));
        
        if (updates.containsKey("name")) {
            project.setName(updates.get("name"));
        }
        if (updates.containsKey("description")) {
            project.setDescription(updates.get("description"));
        }
        
        Project savedProject = projectRepository.save(project);
        
        return ResponseEntity.ok(ProjectResponseDTO.fromEntity(savedProject));
    }

    // 5. Delete project
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteProject(@PathVariable UUID id) {
        if (!projectRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        
        projectRepository.deleteById(id);
        
        return ResponseEntity.ok(Map.of("message", "Project deleted successfully"));
    }

    // 6. Invite new member with duplication check and notification
    @PostMapping("/{id}/members")
    public ResponseEntity<?> inviteMember(@PathVariable UUID id, @RequestBody Map<String, String> payload, Authentication authentication) {
        User currentUser = (User) authentication.getPrincipal();
        String email = payload.get("email");
        
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "User with this email does not exist."));
        }
        User userToAdd = userOpt.get();

        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        if (projectMemberRepository.findByUserIdAndProjectId(userToAdd.getId(), id).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "User is already a member of this project."));
        }

        try {
            ProjectMember newMember = ProjectMember.builder()
                    .user(userToAdd)
                    .project(project)
                    .role("MEMBER")
                    .joinedAt(LocalDateTime.now())
                    .build();

            projectMemberRepository.save(newMember);

            notificationController.sendNotification(
                userToAdd.getEmail(), 
                "TEAM", 
                currentUser.getFirstName() + " added you to the project: " + project.getName(), 
                project.getId() 
            );

            return ResponseEntity.ok(Map.of("message", "Member added successfully!"));
            
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "An error occurred while adding the member."));
        }
    }

    // Remove member from project
    @DeleteMapping("/{projectId}/members/{userId}")
    public ResponseEntity<?> removeMember(
            @PathVariable UUID projectId, 
            @PathVariable UUID userId) {
        
        Optional<ProjectMember> memberOpt = projectMemberRepository.findByUserIdAndProjectId(userId, projectId);
        
        if (memberOpt.isPresent()) {
            projectMemberRepository.delete(memberOpt.get());
            return ResponseEntity.ok(Map.of("message", "Member removed successfully"));
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    // 7. Update member role (Restricted to ADMIN)
    @PatchMapping("/{projectId}/members/{userId}/role")
    public ResponseEntity<?> updateMemberRole(
            @PathVariable UUID projectId,
            @PathVariable UUID userId,
            @RequestBody Map<String, String> payload,
            Authentication authentication) {

        User currentUser = (User) authentication.getPrincipal();

        ProjectMember currentMember = projectMemberRepository.findByUserIdAndProjectId(currentUser.getId(), projectId).orElse(null);
        if (currentMember == null || !"ADMIN".equalsIgnoreCase(currentMember.getRole())) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Only Admins can change roles"));
        }

        ProjectMember targetMember = projectMemberRepository.findByUserIdAndProjectId(userId, projectId).orElse(null);
        if (targetMember == null) {
            return ResponseEntity.notFound().build();
        }

        String newRole = payload.get("role");
        if (List.of("ADMIN", "MEMBER", "VIEWER").contains(newRole.toUpperCase())) {
            targetMember.setRole(newRole.toUpperCase());
            projectMemberRepository.save(targetMember);
            return ResponseEntity.ok(Map.of("message", "Role updated successfully"));
        } else {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid role"));
        }
    }
}