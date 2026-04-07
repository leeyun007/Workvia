package com.workvia.backend.controller;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class AIController {

    @Value("${workvia.ai.api-key}")
    private String API_KEY;
    
    private final String API_URL = "https://api.deepseek.com/chat/completions";

    // Ignore unknown properties to prevent crashes if the AI returns extra fields
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record AiTaskItem(String title, String description, String priority) {}

    @PostMapping("/breakdown")
    public ResponseEntity<?> breakdownTask(@RequestBody Map<String, String> payload) {
        String title = payload.get("title");
        if (title == null || title.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Please enter a task title first!"));
        }

        // Use mock data if the API key is not configured
        if (API_KEY == null || API_KEY.contains("sk-xxx") || API_KEY.contains("Type here...")) {
             return ResponseEntity.ok(fallbackMockThinking(title));
        }

        try {
            String safeTitle = title.replace("\"", "\\\"");

            String requestBody = """
            {
                "model": "deepseek-chat",
                "messages": [
                    {"role": "system", "content": "You are an experienced Agile Project Manager. Please help me break down the user's task into 3 specific subtasks. You must strictly return a JSON array in the format:[{\\"title\\": \\"Subtask Title\\", \\"description\\": \\"Description\\", \\"priority\\": \\"High\\"}]。Please evaluate the priority as High/Medium/Low based on difficulty. Directly output the array, do not include Markdown markers."},
                    {"role": "user", "content": "Task Title: %s"}
                ],
                "temperature": 0.3
            }
            """.formatted(safeTitle);

            // Execute the POST request to the AI API
            RestClient restClient = RestClient.create();
            String responseStr = restClient.post()
                    .uri(API_URL)
                    .header("Authorization", "Bearer " + API_KEY)
                    .header("Content-Type", "application/json")
                    .body(requestBody)
                    .retrieve()
                    .body(String.class);

            // Parse response using JsonNode for better type safety
            ObjectMapper mapper = new ObjectMapper();
            JsonNode rootNode = mapper.readTree(responseStr);
            String aiContent = rootNode.path("choices").path(0).path("message").path("content").asText();

            aiContent = cleanAiContent(aiContent);

            List<AiTaskItem> taskItems = mapper.readValue(aiContent, new TypeReference<List<AiTaskItem>>() {});
            
            return ResponseEntity.ok(taskItems);

        } catch (Exception e) {
            // Log the error for server-side debugging
            System.err.println("AI Analysis or Request Failed: ");
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "AI parsing failed or network timeout. Please try again later."));
        }
    }

    /**
     * Removes Markdown code block wrappers from the AI response
     */
    private String cleanAiContent(String content) {
        content = content.trim();
        if (content.startsWith("```json")) {
            content = content.substring(7);
        } else if (content.startsWith("```")) {
            content = content.substring(3);
        }
        if (content.endsWith("```")) {
            content = content.substring(0, content.length() - 3);
        }
        return content.trim();
    }

    /**
     * Provides fallback data when the AI service is unavailable or unconfigured
     */
    private List<AiTaskItem> fallbackMockThinking(String title) {
        return List.of(
                new AiTaskItem("Requirement Analysis", "Carefully analyze the business requirements and scope of [" + title + "].", "High"),
                new AiTaskItem("Module Breakdown", "Break down [" + title + "] into executable code modules.", "Medium" ),
                new AiTaskItem("Testing & Deployment", "Complete smoke testing for [" + title + "] and deploy to production.", "Low" )
        );
    }
}