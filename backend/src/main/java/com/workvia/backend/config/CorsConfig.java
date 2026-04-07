package com.workvia.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        // Apply CORS configuration to all endpoints
        registry.addMapping("/**")
                // Allow only the specific frontend origin for security
                .allowedOrigins("http://localhost:5173", "https://workvia-production.up.railway.app", "https://workvia.vercel.app")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH")
                .allowedHeaders("*")
                // Allow credentials such as cookies or Authorization headers
                .allowCredentials(true);
    }
}