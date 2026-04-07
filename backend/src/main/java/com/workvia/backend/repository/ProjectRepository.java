package com.workvia.backend.repository;

import com.workvia.backend.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProjectRepository extends JpaRepository<Project, UUID> {
    List<Project> findByCreatedByEmailOrderByCreatedAtDesc(String email);
}