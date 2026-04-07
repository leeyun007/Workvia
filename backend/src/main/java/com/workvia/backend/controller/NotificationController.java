package com.workvia.backend.controller;

import com.workvia.backend.entity.Notification;
import com.workvia.backend.entity.User;
import com.workvia.backend.repository.NotificationRepository;
import com.workvia.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    
    // Spring Boot template for sending messages via WebSocket
    private final SimpMessagingTemplate messagingTemplate;

    // 1. Get all notification history for the current user
    @GetMapping
    public ResponseEntity<List<Notification>> getMyNotifications(Authentication authentication) {
        User currentUser = (User) authentication.getPrincipal();
        List<Notification> notifications = notificationRepository.findByUserIdOrderByCreatedAtDesc(currentUser.getId());
        return ResponseEntity.ok(notifications);
    }

    // 2. Mark all unread notifications as read
    @PatchMapping("/read-all")
    public ResponseEntity<?> markAllAsRead(Authentication authentication) {
        User currentUser = (User) authentication.getPrincipal();
        List<Notification> unreadNotifs = notificationRepository.findByUserIdOrderByCreatedAtDesc(currentUser.getId())
                .stream().filter(n -> !n.isRead()).toList();
        
        unreadNotifs.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(unreadNotifs);
        
        return ResponseEntity.ok(Map.of("message", "All marked as read"));
    }

    // 3. Trigger and push real-time notifications (Internal usage for other controllers)
    public void sendNotification(String targetEmail, String type, String messageText, UUID referenceId) {
        User targetUser = userRepository.findByEmail(targetEmail).orElse(null);
        if (targetUser == null) return;

        // Save to database for persistence
        Notification notif = Notification.builder()
                .userId(targetUser.getId())
                .type(type)
                .message(messageText)
                .referenceId(referenceId)
                .isRead(false)
                .build();
        Notification savedNotif = notificationRepository.save(notif);

        // Push real-time notification to user via WebSocket (/user/queue/notifications)
        messagingTemplate.convertAndSendToUser(
                targetEmail, 
                "/queue/notifications", 
                savedNotif
        );
    }
}