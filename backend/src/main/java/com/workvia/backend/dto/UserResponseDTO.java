package com.workvia.backend.dto;

import com.workvia.backend.entity.User;
import java.util.UUID;

public record UserResponseDTO(
    UUID id,
    String email,
    String firstName,
    String lastName,
    String avatarUrl,
    String jobTitle
) {
    public static UserResponseDTO fromEntity(User user) {
        if (user == null) return null;
        return new UserResponseDTO(
            user.getId(),
            user.getEmail(),
            user.getFirstName(),
            user.getLastName(),
            user.getAvatarUrl(),
            user.getJobTitle()
        );
    }
}