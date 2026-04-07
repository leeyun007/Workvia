package com.workvia.backend.dto;

import com.workvia.backend.entity.Comment;
import java.time.LocalDateTime;
import java.util.UUID;

public record CommentResponseDTO(
    UUID id,
    String content,
    LocalDateTime createdAt,
    UserResponseDTO user, 
    String fileUrl,     
    String fileName
) {
    public static CommentResponseDTO fromEntity(Comment comment) {
        if (comment == null) return null;
        
        return new CommentResponseDTO(
            comment.getId(),
            comment.getContent(),
            comment.getCreatedAt(),
            UserResponseDTO.fromEntity(comment.getUser()),
            comment.getAttachment() != null ? comment.getAttachment().getFileUrl() : null,
            comment.getAttachment() != null ? comment.getAttachment().getFileName() : null
        );
    }
}