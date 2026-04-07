package com.workvia.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class BarChartDataDTO {
    private String name; 
    
    @JsonProperty("ToDo")
    private int toDo; 

    @JsonProperty("Completed")
    private int completed;
    
    @JsonProperty("InProgress")
    private int inProgress;
    
    @JsonProperty("Overdue")
    private int overdue;
}