package com.workvia.backend.dto;

import com.workvia.backend.entity.Project;
import java.time.LocalDateTime;
import java.util.UUID;

public record ProjectResponseDTO(
    UUID id,
    String name,
    String description,
    String status,
    String creatorName, 
    String creatorAvatar,
    LocalDateTime createdAt
) {
    public static ProjectResponseDTO fromEntity(Project project) {
        if (project == null) return null;
        
        String creatorName = project.getCreatedBy() != null ? 
            project.getCreatedBy().getFirstName() + " " + project.getCreatedBy().getLastName() : "Unknown";
            
        String creatorAvatar = project.getCreatedBy() != null ? 
            project.getCreatedBy().getAvatarUrl() : null;

        return new ProjectResponseDTO(
            project.getId(),
            project.getName(),
            project.getDescription(),
            project.getStatus(),
            creatorName,
            creatorAvatar,
            project.getCreatedAt()
        );
    }
}