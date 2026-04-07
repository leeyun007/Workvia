package com.workvia.backend.repository;

import com.workvia.backend.entity.Project;
import com.workvia.backend.entity.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TaskRepository extends JpaRepository<Task, UUID> {
    List<Task> findByProjectId(UUID projectId);

    List<Task> findByAssigneeId(UUID assigneeId);

    List<Task> findByCreatedByEmailOrderByCreatedAtDesc(String email);

    List<Task> findByProjectInOrderByCreatedAtDesc(List<Project> projects);
}