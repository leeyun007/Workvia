package com.workvia.backend.service;

import com.workvia.backend.repository.ProjectMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PermissionService {
    
    private final ProjectMemberRepository projectMemberRepository;

    // check if user is ADMIN
    public boolean isAdmin(UUID userId, UUID projectId) {
        return projectMemberRepository.findByUserIdAndProjectId(userId, projectId)
                .map(m -> "ADMIN".equalsIgnoreCase(m.getRole()))
                .orElse(false);
    }

    // check if user can edit (ADMIN or MEMBER)
    public boolean canEdit(UUID userId, UUID projectId) {
        return projectMemberRepository.findByUserIdAndProjectId(userId, projectId)
                .map(m -> List.of("ADMIN", "MEMBER").contains(m.getRole().toUpperCase()))
                .orElse(false);
    }
}