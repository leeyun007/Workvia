package com.workvia.backend.controller;

import com.workvia.backend.entity.User;
import com.workvia.backend.repository.UserRepository;
import com.workvia.backend.service.S3Service;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.beans.factory.annotation.Value;

import java.util.Map;
import java.util.HashMap;
import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final S3Service s3Service;

    // Retrieve all users from the database
    @GetMapping
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    // Local upload directory fallback (if not using S3 exclusively)
    @Value("${workvia.file.upload-dir}")
    private String uploadDir;

    // Upload avatar to S3 and update user profile
    @PostMapping("/me/avatar")
    public ResponseEntity<?> uploadAvatar(@RequestParam("file") MultipartFile file, Authentication authentication) {
        User currentUser = (User) authentication.getPrincipal();

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("File is empty");
        }

        try {
            String fileUrl = s3Service.uploadFile(file, "avatars");

            // Update database with the new S3 file URL
            currentUser.setAvatarUrl(fileUrl);
            userRepository.save(currentUser);

            Map<String, String> response = new HashMap<>();
            response.put("avatarUrl", fileUrl);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Could not upload the file to S3!");
        }
    }

    // Remove user avatar by resetting URL to null
    @DeleteMapping("/me/avatar")
    public ResponseEntity<?> removeAvatar(Authentication authentication) {
        try {
            User currentUser = (User) authentication.getPrincipal();

            currentUser.setAvatarUrl(null);
            userRepository.save(currentUser);

            return ResponseEntity.ok(Map.of("message", "Avatar removed successfully"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to remove avatar"));
        }
    }

    // Update basic user profile information
    @PutMapping("/me")
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, String> updates, Authentication authentication) {
        User user = (User) authentication.getPrincipal();

        if (updates.containsKey("firstName")) user.setFirstName(updates.get("firstName"));
        if (updates.containsKey("lastName")) user.setLastName(updates.get("lastName"));
        if (updates.containsKey("jobTitle")) user.setJobTitle(updates.get("jobTitle"));
        if (updates.containsKey("bio")) user.setBio(updates.get("bio"));

        userRepository.save(user);

        return ResponseEntity.ok("Profile updated successfully");
    }

    // Change password with current password verification
    @PutMapping("/me/password")
    public ResponseEntity<?> updatePassword(@RequestBody Map<String, String> payload, Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        String currentPassword = payload.get("currentPassword");
        String newPassword = payload.get("newPassword");

        // Verify current password matches the encoded password in DB
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Current password is incorrect."));
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "Password updated successfully!"));
    }
}