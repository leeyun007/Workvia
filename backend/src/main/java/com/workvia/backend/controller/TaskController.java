package com.workvia.backend.controller;

import com.workvia.backend.entity.Project;
import com.workvia.backend.entity.Task;
import com.workvia.backend.entity.TaskHistory;
import com.workvia.backend.entity.User;
import com.workvia.backend.repository.CommentRepository;
import com.workvia.backend.repository.ProjectRepository;
import com.workvia.backend.repository.TaskHistoryRepository;
import com.workvia.backend.repository.TaskRepository;
import com.workvia.backend.repository.UserRepository;
import com.workvia.backend.dto.BarChartDataDTO;
import com.workvia.backend.dto.TaskResponseDTO;
import com.workvia.backend.dto.CommentResponseDTO;
import com.workvia.backend.entity.Attachment;
import com.workvia.backend.entity.Comment;
import com.workvia.backend.repository.AttachmentRepository;
import com.workvia.backend.service.PermissionService; 
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus; 
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.ArrayList;
import java.util.LinkedHashMap;

@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
@Transactional
public class TaskController {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository; 
    private final TaskHistoryRepository taskHistoryRepository;
    private final CommentRepository commentRepository;
    private final AttachmentRepository attachmentRepository; 
    private final NotificationController notificationController;
    private final com.workvia.backend.repository.ProjectMemberRepository projectMemberRepository;
    private final PermissionService permissionService; 
    
    public record TaskRequest(String title, String status, String priority, String description, UUID projectId) {}

    public record CommentRequest(String content, AttachmentRef attachment) {
        public record AttachmentRef(UUID id) {}
    }

    // 1. Get all tasks accessible by the current user across their projects
    @GetMapping
    public ResponseEntity<?> getMyTasks(Authentication authentication) {
        User currentUser = (User) authentication.getPrincipal();

        List<Project> myProjects = projectMemberRepository.findByUserId(currentUser.getId())
                .stream()
                .map(com.workvia.backend.entity.ProjectMember::getProject)
                .toList();

        if (myProjects.isEmpty()) {
            return ResponseEntity.ok(List.of());
        }

        List<Task> accessibleTasks = taskRepository.findByProjectInOrderByCreatedAtDesc(myProjects);
        List<TaskResponseDTO> responseList = accessibleTasks.stream()
            .map(TaskResponseDTO::fromEntity)
            .toList();

        return ResponseEntity.ok(responseList);
    }

    // 2. Create a new task with permission verification
    @PostMapping
    public ResponseEntity<?> createTask(@RequestBody TaskRequest request, Authentication authentication) {
        User currentUser = (User) authentication.getPrincipal();

        if (request.projectId() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Project must be specified!"));
        }

        if (!permissionService.canEdit(currentUser.getId(), request.projectId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Viewers cannot create tasks"));
        }

        Project project = projectRepository.findById(request.projectId()).orElse(null);
        if (project == null) return ResponseEntity.badRequest().body(Map.of("error", "Project not found!"));

        Task newTask = Task.builder()
                .title(request.title())
                .description(request.description())
                .status(request.status() != null ? request.status() : "To Do")
                .priority(request.priority() != null ? request.priority() : "Medium")
                .project(project)      
                .createdBy(currentUser)
                .assignee(currentUser) 
                .build();
        
        Task savedTask = taskRepository.save(newTask);
        
        TaskHistory history = TaskHistory.builder()
                .task(savedTask)
                .oldStatus(null) 
                .newStatus(savedTask.getStatus()) 
                .build();
        taskHistoryRepository.save(history);

        if (savedTask.getAssignee() != null && !savedTask.getAssignee().getId().equals(currentUser.getId())) {
            notificationController.sendNotification(
                    savedTask.getAssignee().getEmail(),
                    "ASSIGNED",
                    currentUser.getFirstName() + " assigned you a new task: " + savedTask.getTitle(),
                    savedTask.getId()
            );
        }

        return ResponseEntity.ok(TaskResponseDTO.fromEntity(savedTask));
    }

    // 3. Bulk create tasks (often used for AI-generated task lists)
    @PostMapping("/bulk")
    public ResponseEntity<?> createTasksBulk(@RequestBody List<TaskRequest> requests, Authentication authentication) {
        User currentUser = (User) authentication.getPrincipal();

        if (requests.isEmpty()) {
            return ResponseEntity.ok(List.of()); 
        }

        UUID projectId = requests.get(0).projectId();
        if (projectId == null) return ResponseEntity.badRequest().body(Map.of("error", "A project must be selected for bulk task creation!"));

        if (!permissionService.canEdit(currentUser.getId(), projectId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Viewers cannot create tasks"));
        }

        Project project = projectRepository.findById(projectId).orElse(null);
        if (project == null) return ResponseEntity.badRequest().body(Map.of("error", "Project not found!"));

        List<Task> newTasks = requests.stream().map(req -> Task.builder()
                .title(req.title())
                .description(req.description())
                .status("To Do") 
                .priority("Medium")
                .project(project) 
                .createdBy(currentUser)
                .assignee(currentUser) 
                .build()
        ).toList(); 

        List<Task> savedTasks = taskRepository.saveAll(newTasks);
        
        List<TaskResponseDTO> responseList = savedTasks.stream()
                .map(TaskResponseDTO::fromEntity)
                .toList();

        return ResponseEntity.ok(responseList);
    }

    // 4. Update task status with role-based restrictions
    @PatchMapping("/{taskId}/status")
    public ResponseEntity<?> updateTaskStatus(@PathVariable UUID taskId, @RequestBody Map<String, String> payload, Authentication authentication) {
        Task task = taskRepository.findById(taskId).orElse(null);
        if (task == null) return ResponseEntity.notFound().build();
        
        User currentUser = (User) authentication.getPrincipal();

        boolean isAdmin = permissionService.isAdmin(currentUser.getId(), task.getProject().getId());
        boolean isAssignee = task.getAssignee() != null && task.getAssignee().getId().equals(currentUser.getId());
        
        if (!isAdmin && !isAssignee) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Only Admin or the Task Assignee can change task status."));
        }
        
        String oldStatus = task.getStatus(); 
        if (oldStatus == null || oldStatus.trim().isEmpty()) {
            oldStatus = "To Do";
        }
        
        String newStatus = payload.get("status");
        if (newStatus == null) return ResponseEntity.badRequest().build();

        if ((newStatus.equalsIgnoreCase("In Progress") || newStatus.equalsIgnoreCase("Done")) && task.getAssignee() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "⚠️ Task must have an Assignee before changing status."));
        }
        
        if (!oldStatus.equals(newStatus)) {
            task.setStatus(newStatus);
            Task savedTask = taskRepository.save(task);

            List<com.workvia.backend.entity.ProjectMember> allMembers = projectMemberRepository.findByProjectId(task.getProject().getId());
                
            for (com.workvia.backend.entity.ProjectMember pm : allMembers) {
                User targetUser = pm.getUser();
                if (!targetUser.getId().equals(currentUser.getId())) {
                    notificationController.sendNotification(
                        targetUser.getEmail(),
                        "SYSTEM", 
                        currentUser.getFirstName() + " moved task '" + task.getTitle() + "' to " + newStatus,
                        task.getId()
                    );
                }
            }
            
            try {
                TaskHistory history = TaskHistory.builder()
                        .task(savedTask)
                        .oldStatus(oldStatus)
                        .newStatus(newStatus)
                        .build();
                taskHistoryRepository.save(history);
            } catch (Exception e) {
                System.out.println("⚠️ Failed to write task history: " + e.getMessage());
            }
            
            return ResponseEntity.ok(TaskResponseDTO.fromEntity(savedTask));
        }
        
        return ResponseEntity.ok(TaskResponseDTO.fromEntity(task));
    }

    // 5. Get aggregated chart data for task completion history
    @GetMapping("/history/chart")
    public ResponseEntity<List<BarChartDataDTO>> getChartData(Authentication authentication) {
        User principal = (User) authentication.getPrincipal();
        List<Map<String, Object>> rawData = taskHistoryRepository.getAggregatedBarData(principal.getEmail());
        
        Map<String, BarChartDataDTO> resultMap = new LinkedHashMap<>();
        
        java.time.LocalDate today = java.time.LocalDate.now();
        java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern("EEE", java.util.Locale.ENGLISH);

        for (int i = 6; i >= 0; i--) {
            String dayName = today.minusDays(i).format(formatter);
            resultMap.put(dayName, new BarChartDataDTO(dayName, 0, 0, 0, 0));
        }
        
        for (Map<String, Object> row : rawData) {
            String dayName = (String) row.get("day_name");
            if (resultMap.containsKey(dayName)) {
                BarChartDataDTO dto = resultMap.get(dayName);
                
                if (row.get("completed") != null) {
                    dto.setCompleted(((Number) row.get("completed")).intValue());
                }
                if (row.get("in_progress") != null) {
                    dto.setInProgress(((Number) row.get("in_progress")).intValue());
                }
                if (row.get("to_do") != null) {
                    dto.setToDo(((Number) row.get("to_do")).intValue());
                }
            }
        }
        
        return ResponseEntity.ok(new ArrayList<>(resultMap.values()));
    }

    // 6. Update general task details (description, due date, and assignee)
    @PatchMapping("/{taskId}/details")
    public ResponseEntity<?> updateTaskDetails(@PathVariable UUID taskId, @RequestBody Map<String, Object> updates, Authentication authentication) {
        Task task = taskRepository.findById(taskId).orElse(null);
        if (task == null) return ResponseEntity.notFound().build();

        User currentUser = (User) authentication.getPrincipal();

        boolean isAdmin = permissionService.isAdmin(currentUser.getId(), task.getProject().getId());
        boolean isAssignee = task.getAssignee() != null && task.getAssignee().getId().equals(currentUser.getId());
        
        if (!isAdmin && !isAssignee) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Only Admin or the Task Assignee can perform this action."));
        }

        if (updates.containsKey("description")) {
            task.setDescription((String) updates.get("description"));
        }

        if (updates.containsKey("dueDate")) {
            String dateStr = (String) updates.get("dueDate");
            task.setDueDate((dateStr == null || dateStr.isEmpty()) ? null : java.time.LocalDate.parse(dateStr));
        }

        if (updates.containsKey("assigneeEmail")) {
            if (!permissionService.isAdmin(currentUser.getId(), task.getProject().getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Only Admins can assign tasks to other user"));
            }

            String email = (String) updates.get("assigneeEmail");
            if (email == null || email.isEmpty() || email.equals("Unassigned")) {
                task.setAssignee(null);
            } else {
                User assignee = userRepository.findByEmail(email).orElse(null);
                boolean isNewAssignee = assignee != null && 
                    (task.getAssignee() == null || !task.getAssignee().getId().equals(assignee.getId()));

                task.setAssignee(assignee);

                if (isNewAssignee && !assignee.getEmail().equals(currentUser.getEmail())) {
                    notificationController.sendNotification(
                        assignee.getEmail(),
                        "ASSIGNED", 
                        currentUser.getFirstName() + " assigned a task to you: " + task.getTitle(),
                        task.getId()
                    );
                }
            }
        }

        Task savedTask = taskRepository.save(task);
        return ResponseEntity.ok(TaskResponseDTO.fromEntity(savedTask));
    }

    // 7. Add a comment and notify mentioned users
    @PostMapping("/{taskId}/comments")
    public ResponseEntity<?> addComment(@PathVariable UUID taskId, @RequestBody CommentRequest request, Authentication authentication) {
       User currentUser = (User) authentication.getPrincipal();
        Task task = taskRepository.findById(taskId).orElseThrow(() -> new RuntimeException("Task not found"));

        if (!permissionService.canEdit(currentUser.getId(), task.getProject().getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Viewers do not have permission to post comments"));
        }

        Comment comment = new Comment();
        comment.setTask(task); 
        comment.setUser(currentUser);
        comment.setContent(request.content());

        if (request.attachment() != null && request.attachment().id() != null) {
            Attachment existingAttachment = attachmentRepository.findById(request.attachment().id()).orElse(null);
            comment.setAttachment(existingAttachment); 
        }

        Comment savedComment = commentRepository.save(comment);
        String content = request.content() == null ? "" : request.content();
        
        List<com.workvia.backend.entity.ProjectMember> members = projectMemberRepository.findByProjectId(task.getProject().getId());
        
        for (com.workvia.backend.entity.ProjectMember pm : members) {
            User targetUser = pm.getUser();
            if (targetUser.getId().equals(currentUser.getId())) continue; 
            
            String fullName = targetUser.getFirstName() + " " + targetUser.getLastName();
            String mentionText = "@" + fullName;
            
            if (content.contains(mentionText)) {
                notificationController.sendNotification(
                    targetUser.getEmail(),
                    "MENTION", 
                    currentUser.getFirstName() + " mentioned you in a comment: " + task.getTitle(),
                    task.getId()
                );
            } 
            else if (task.getAssignee() != null && task.getAssignee().getId().equals(targetUser.getId())) {
                notificationController.sendNotification(
                    targetUser.getEmail(),
                    "SYSTEM", 
                    currentUser.getFirstName() + " commented on your task: " + task.getTitle(),
                    task.getId()
                );
            }
        }

        return ResponseEntity.ok(CommentResponseDTO.fromEntity(savedComment));
    }

    @PatchMapping("/{taskId}/title")
    public ResponseEntity<?> updateTaskTitle(@PathVariable UUID taskId, @RequestBody Map<String, String> payload, Authentication authentication) {
        Task task = taskRepository.findById(taskId).orElseThrow(() -> new RuntimeException("Task not found"));
        User currentUser = (User) authentication.getPrincipal();
        
        boolean isAdmin = permissionService.isAdmin(currentUser.getId(), task.getProject().getId());
        boolean isAssignee = task.getAssignee() != null && task.getAssignee().getId().equals(currentUser.getId());
        
        if (!isAdmin && !isAssignee) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Only Admin or the Task Assignee can perform this action."));
        }

        task.setTitle(payload.get("title"));
        Task savedTask = taskRepository.save(task);
        return ResponseEntity.ok(TaskResponseDTO.fromEntity(savedTask));
    }

    @PatchMapping("/comments/{commentId}")
    public ResponseEntity<?> updateCommentContent(@PathVariable UUID commentId, @RequestBody Map<String, String> payload, Authentication authentication) {
        Comment comment = commentRepository.findById(commentId).orElseThrow(() -> new RuntimeException("Comment not found"));
        User currentUser = (User) authentication.getPrincipal();

        if (!comment.getUser().getId().equals(currentUser.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "You can only modify or delete your own comments."));
        }

        comment.setContent(payload.get("content"));
        Comment savedComment = commentRepository.save(comment);
        return ResponseEntity.ok(CommentResponseDTO.fromEntity(savedComment));
    }

    @DeleteMapping("/{taskId}")
    public ResponseEntity<?> deleteTask(@PathVariable UUID taskId, Authentication authentication) {
        Task task = taskRepository.findById(taskId).orElse(null);
        if (task == null) return ResponseEntity.notFound().build();

        User currentUser = (User) authentication.getPrincipal();

        boolean isAdmin = permissionService.isAdmin(currentUser.getId(), task.getProject().getId());
        boolean isAssignee = task.getAssignee() != null && task.getAssignee().getId().equals(currentUser.getId());
        
        if (!isAdmin && !isAssignee) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Only Admin or the Task Assignee can delete this task."));
        }
    
        try {
            List<TaskHistory> histories = taskHistoryRepository.findAll().stream().filter(h -> h.getTask().getId().equals(taskId)).toList();
            taskHistoryRepository.deleteAll(histories);
            
            List<Attachment> attachments = attachmentRepository.findByTaskId(taskId);
            if (attachments != null && !attachments.isEmpty()) {
                attachmentRepository.deleteAll(attachments);
            }

            taskRepository.deleteById(taskId);
            return ResponseEntity.ok(Map.of("message", "Task deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Database Error: " + e.getMessage()));
        }
    }

    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<?> deleteComment(@PathVariable UUID commentId, Authentication authentication) {
        Comment comment = commentRepository.findById(commentId).orElseThrow(() -> new RuntimeException("Comment not found"));
        User currentUser = (User) authentication.getPrincipal();

        if (!comment.getUser().getId().equals(currentUser.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "You can only modify or delete your own comments."));
        }

        try {
            commentRepository.deleteById(commentId);
            return ResponseEntity.ok(Map.of("message", "Comment deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to delete comment"));
        }
    }

    // Remove attachment and clean up comment if it becomes empty
    @DeleteMapping("/comments/{commentId}/attachment")
    public ResponseEntity<?> removeAttachmentFromComment(@PathVariable UUID commentId, Authentication authentication) {
        try {
            Comment comment = commentRepository.findById(commentId)
                    .orElseThrow(() -> new RuntimeException("Comment not found"));

            User currentUser = (User) authentication.getPrincipal();
            if (!permissionService.canEdit(currentUser.getId(), comment.getTask().getProject().getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "You do not have permission to delete attachments"));
            }

            if (comment.getAttachment() != null) {
                UUID attachmentId = comment.getAttachment().getId();
                comment.setAttachment(null);
                attachmentRepository.deleteById(attachmentId);

                String text = comment.getContent();
                if (text == null || text.trim().isEmpty() || text.trim().equals("Uploaded a file")) {
                    commentRepository.delete(comment);
                    return ResponseEntity.ok(Map.of("message", "Attachment removed and empty comment cleaned up"));
                } else {
                    commentRepository.save(comment);
                }
            }

            return ResponseEntity.ok(Map.of("message", "Attachment removed successfully"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to remove attachment"));
        }
    }
}