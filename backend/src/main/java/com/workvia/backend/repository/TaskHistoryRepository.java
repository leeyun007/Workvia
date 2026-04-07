package com.workvia.backend.repository;

import com.workvia.backend.entity.TaskHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface TaskHistoryRepository extends JpaRepository<TaskHistory, UUID> {
   @Query(value = """
            WITH RECURSIVE last_7_days AS (
                SELECT CAST(CURRENT_DATE - INTERVAL '6 days' AS DATE) AS d
                UNION ALL
                SELECT CAST(d + INTERVAL '1 day' AS DATE) FROM last_7_days WHERE d < CURRENT_DATE
            ),
            TaskDailySnapshot AS (
                SELECT 
                    d.d as report_date,
                    t.id as task_id,
                    (
                        SELECT th.new_status
                        FROM task_history th
                        WHERE th.task_id = t.id AND th.changed_at < d.d + INTERVAL '1 day'
                        ORDER BY th.changed_at DESC
                        LIMIT 1
                    ) as end_of_day_status
                FROM last_7_days d
                CROSS JOIN tasks t
                WHERE t.project_id IN (
                    SELECT pm.project_id FROM project_members pm JOIN users u ON pm.user_id = u.id WHERE u.email = :email
                )
            )
            SELECT 
                trim(to_char(report_date, 'Dy')) as day_name,
                CAST(EXTRACT(ISODOW FROM report_date) AS INTEGER) as day_index,
                COUNT(*) FILTER (WHERE end_of_day_status = 'Done') as completed,
                COUNT(*) FILTER (WHERE end_of_day_status IN ('In Progress', 'IN_PROGRESS')) as in_progress,
                COUNT(*) FILTER (WHERE end_of_day_status IN ('To Do', 'TODO')) as to_do
            FROM TaskDailySnapshot
            WHERE end_of_day_status IS NOT NULL 
            GROUP BY report_date, day_name, day_index
            ORDER BY report_date
            """, nativeQuery = true)
    List<Map<String, Object>> getAggregatedBarData(@Param("email") String email);
}