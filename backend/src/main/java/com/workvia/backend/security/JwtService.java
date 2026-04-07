package com.workvia.backend.security;

import com.workvia.backend.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;

import javax.crypto.SecretKey;
import java.util.Date;

@Service
public class JwtService {

    @Value("${workvia.jwt.secret}")
    private String secretKeyString;

    // Generate signing key from secret string
    private SecretKey getSignInKey() {
        return Keys.hmacShaKeyFor(secretKeyString.getBytes());
    }

    // Generate token with dynamic expiration based on rememberMe flag
    public String generateToken(User user, boolean rememberMe) {
        // 7 days if rememberMe is true, otherwise 24 hours
        long expirationTime = rememberMe ? 1000L * 60 * 60 * 24 * 7 : 1000L * 60 * 60 * 24;
        
        return Jwts.builder()
                .subject(user.getEmail())
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + expirationTime))
                .signWith(getSignInKey())
                .compact();
    }
    
    // Overloaded method for compatibility (defaults to 24h expiration)
    public String generateToken(User user) {
        return generateToken(user, false);
    }

    // Extract email (subject) from the JWT
    public String extractEmail(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(getSignInKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return claims.getSubject();
    }

    // Validate if the token belongs to the user and is not expired
    public boolean isTokenValid(String token, User user) {
        final String email = extractEmail(token);
        return (email.equals(user.getEmail())) && !isTokenExpired(token);
    }

    private boolean isTokenExpired(String token) {
        return Jwts.parser().verifyWith(getSignInKey()).build()
                .parseSignedClaims(token).getPayload().getExpiration().before(new Date());
    }
}