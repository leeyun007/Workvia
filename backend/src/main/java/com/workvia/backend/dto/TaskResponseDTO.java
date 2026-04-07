package com.workvia.backend.dto;

import com.workvia.backend.entity.Task;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record TaskResponseDTO(
    UUID id,
    String title,
    String description,
    String status,
    String priority,
    LocalDate dueDate,
    UUID projectId,
    String projectName,
    UserResponseDTO assignee, 
    List<CommentResponseDTO> comments, 
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    public static TaskResponseDTO fromEntity(Task task) {
        if (task == null) return null;

        return new TaskResponseDTO(
            task.getId(),
            task.getTitle(),
            task.getDescription(),
            task.getStatus(),
            task.getPriority(),
            task.getDueDate(),
            task.getProject() != null ? task.getProject().getId() : null,
            task.getProject() != null ? task.getProject().getName() : null,
            UserResponseDTO.fromEntity(task.getAssignee()),
            task.getComments() != null ? 
            task.getComments().stream().map(CommentResponseDTO::fromEntity).toList() : List.of(),
            task.getCreatedAt(),
            task.getUpdatedAt()
        );
    }
}