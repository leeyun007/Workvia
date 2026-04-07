package com.workvia.backend.controller;

import com.workvia.backend.entity.Attachment;
import com.workvia.backend.entity.User;
import com.workvia.backend.repository.AttachmentRepository;
import com.workvia.backend.service.S3Service;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
public class AttachmentController {

    private final AttachmentRepository attachmentRepository;
    private final S3Service s3Service;

    /**
     * Uploads a file directly to AWS S3 and persists metadata to the database
     */
    @PostMapping("/{taskId}/attachments")
    public ResponseEntity<?> uploadFile(
            @PathVariable UUID taskId,
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {

        User currentUser = (User) authentication.getPrincipal();

        try {
            String originalFileName = StringUtils.cleanPath(Objects.requireNonNull(file.getOriginalFilename()));

            // Upload to S3 'attachments' folder and retrieve the public URL
            String s3FileUrl = s3Service.uploadFile(file, "attachments");

            // Save attachment record with the S3 link
            Attachment attachment = Attachment.builder()
                    .taskId(taskId)
                    .userId(currentUser.getId())
                    .fileName(originalFileName)
                    .fileType(file.getContentType())
                    .fileUrl(s3FileUrl) 
                    .build();

            Attachment savedAttachment = attachmentRepository.save(attachment);

            return ResponseEntity.ok(savedAttachment);

        } catch (Exception ex) {
            ex.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of("error", "Could not upload file to S3. Please try again!"));
        }
    }

    /**
     * Retrieves all attachments for a specific task
     */
    @GetMapping("/{taskId}/attachments")
    public ResponseEntity<List<Attachment>> getAttachments(@PathVariable UUID taskId) {
        return ResponseEntity.ok(attachmentRepository.findByTaskId(taskId));
    }
}