package com.workvia.backend.controller;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import org.springframework.beans.factory.annotation.Value;

import java.time.LocalDateTime;
import java.util.Collections;
import com.workvia.backend.entity.User;
import com.workvia.backend.repository.UserRepository;
import com.workvia.backend.security.JwtService;
import com.workvia.backend.service.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final EmailService emailService;

    // Split name into firstName and lastName (Retained for future record usage)
    public record RegisterRequest(String firstName, String lastName, String email, String password) {}
    public record LoginRequest(String email, String password, boolean rememberMe) {}
    public record AuthResponse(
        String token, String name, String email, 
        String firstName, String lastName, 
        String avatarUrl, String jobTitle, String bio,
        String oauthProvider
    ) {}
    public record ForgotPasswordRequest(String email) {}
    public record ResetPasswordRequest(String token, String newPassword) {}

    // 1. User Registration (Email verification sent, no JWT issued yet)
    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody Map<String, String> payload) {
        String firstName = payload.get("firstName");
        String lastName = payload.get("lastName");
        String email = payload.get("email");
        String password = payload.get("password");

        if (userRepository.findByEmail(email).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "⚠️ This email is already registered!"));
        }

        String verificationCode = UUID.randomUUID().toString();

        User user = User.builder()
                .firstName(firstName)
                .lastName(lastName)
                .email(email)
                .password(passwordEncoder.encode(password)) 
                .avatarUrl(firstName != null && !firstName.isEmpty() ? firstName.substring(0, 1).toUpperCase() : "U") 
                .isEmailVerified(false)
                .verificationCode(verificationCode)
                .verificationCodeExpiry(LocalDateTime.now().plusHours(24))
                .build();

        userRepository.save(user);

        emailService.sendVerificationEmail(user.getEmail(), verificationCode);

        return ResponseEntity.ok(Map.of("success", true));
    }

    // 2. Email Activation Endpoint
    @GetMapping("/verify")
    public ResponseEntity<?> verifyEmail(@RequestParam String code) {
        User user = userRepository.findAll().stream()
                .filter(u -> code.equals(u.getVerificationCode()))
                .findFirst()
                .orElse(null);

        if (user == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "invalid"));
        }

        if (user.getVerificationCodeExpiry().isBefore(LocalDateTime.now())) {
            return ResponseEntity.badRequest().body(Map.of("error", "expired"));
        }

        user.setEmailVerified(true);
        user.setVerificationCode(null);
        user.setVerificationCodeExpiry(null);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("success", true));
    }

    // 3. User Login
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        User user = userRepository.findByEmail(request.email()).orElse(null);

        if (user == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "⚠️ Account not found!"));
        }

        if (!user.isEmailVerified()) {
            return ResponseEntity.badRequest().body(Map.of("error", "⚠️ Please click the activation link in your email to verify your account!"));
        }

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            return ResponseEntity.badRequest().body(Map.of("error", "⚠️ Invalid password!"));
        }

        // Pass rememberMe to generate appropriate token duration
        String jwtToken = jwtService.generateToken(user, request.rememberMe());
        return ResponseEntity.ok(new AuthResponse(
                jwtToken, 
                user.getFirstName() + " " + user.getLastName(), 
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getAvatarUrl(),
                user.getJobTitle(),
                user.getBio(),
                user.getOauthProvider()
        ));
    }

    @Value("${workvia.google.client-id}")
    private String googleClientId;

    // 4. Google OAuth Login
    @PostMapping("/google")
    public ResponseEntity<?> googleLogin(@RequestBody Map<String, String> payload) {
        String idTokenString = payload.get("idToken");

        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), new GsonFactory())
                    .setAudience(Collections.singletonList(googleClientId))
                    .build();

            GoogleIdToken idToken = verifier.verify(idTokenString);
            if (idToken != null) {
                GoogleIdToken.Payload googlePayload = idToken.getPayload();

                String email = googlePayload.getEmail();
                String fullName = (String) googlePayload.get("name");
                String pictureUrl = (String) googlePayload.get("picture");

                User user = userRepository.findByEmail(email).orElse(null);
                
                if (user == null) {
                    // Split full name returned by Google
                    String[] nameParts = fullName != null ? fullName.split(" ") : new String[]{"Unknown", "User"};
                    String gFirstName = nameParts.length > 0 ? nameParts[0] : "Unknown";
                    String gLastName = nameParts.length > 1 ? fullName.substring(gFirstName.length()).trim() : "";

                    user = User.builder()
                            .firstName(gFirstName)
                            .lastName(gLastName)
                            .email(email)
                            .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                            .isEmailVerified(true) 
                            .avatarUrl(pictureUrl)
                            .oauthProvider("GOOGLE")
                            .build();
                    userRepository.save(user);
                }

                String jwtToken = jwtService.generateToken(user);
                return ResponseEntity.ok(new AuthResponse(
                        jwtToken, 
                        user.getFirstName() + " " + user.getLastName(), 
                        user.getEmail(),
                        user.getFirstName(),
                        user.getLastName(),
                        user.getAvatarUrl(),
                        user.getJobTitle(),
                        user.getBio(),
                        user.getOauthProvider()
                ));
                
            } else {
                return ResponseEntity.badRequest().body(Map.of("error", "⚠️ Google verification failed (Invalid token)"));
            }
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "⚠️ Server error during Google authentication"));
        }
    }

    // 5. Password Reset Request (Send Email)
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody ForgotPasswordRequest request) {
        User user = userRepository.findByEmail(request.email()).orElse(null);
        if (user == null) {
            // For security, return success even if email is not found to prevent user enumeration
            return ResponseEntity.ok(Map.of("message", "If your email is registered, you will receive a reset link shortly."));
        }

        // Generate a 15-minute expiration token
        String token = UUID.randomUUID().toString();
        user.setResetPasswordToken(token);
        user.setResetPasswordTokenExpiry(LocalDateTime.now().plusMinutes(15));
        userRepository.save(user);

        emailService.sendPasswordResetEmail(user.getEmail(), token);

        return ResponseEntity.ok(Map.of("message", "If your email is registered, you will receive a reset link shortly."));
    }

    // 6. Submit New Password
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody ResetPasswordRequest request) {
        if (request.newPassword() == null || request.newPassword().length() < 8) {
            return ResponseEntity.badRequest().body(Map.of("error", "⚠️ Password must be at least 8 characters long."));
        }
        
        User user = userRepository.findByResetPasswordToken(request.token()).orElse(null);

        if (user == null || user.getResetPasswordTokenExpiry().isBefore(LocalDateTime.now())) {
            return ResponseEntity.badRequest().body(Map.of("error", "⚠️ The reset link is invalid or has expired."));
        }

        user.setPassword(passwordEncoder.encode(request.newPassword()));
        user.setResetPasswordToken(null);
        user.setResetPasswordTokenExpiry(null);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Password has been reset successfully! You can now log in."));
    }

    // 7. Resend Verification Email
    @PostMapping("/resend-verification")
    public ResponseEntity<?> resendVerification(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String oldToken = payload.get("token");

        User user = null;
        
        // Scenario A: Resend requested via email address (e.g., from registration page)
        if (email != null && !email.isEmpty()) {
            user = userRepository.findByEmail(email).orElse(null);
        } 
        // Scenario B: Resend requested via expired token (e.g., from verification link page)
        else if (oldToken != null && !oldToken.isEmpty()) {
            user = userRepository.findAll().stream()
                    .filter(u -> oldToken.equals(u.getVerificationCode()))
                    .findFirst()
                    .orElse(null);
        }

        if (user == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "⚠️ User not found."));
        }

        if (user.isEmailVerified()) {
            return ResponseEntity.badRequest().body(Map.of("error", "⚠️ This email is already verified."));
        }

        // Generate new activation code and update expiry
        String newVerificationCode = UUID.randomUUID().toString();
        user.setVerificationCode(newVerificationCode);
        user.setVerificationCodeExpiry(LocalDateTime.now().plusHours(24));
        userRepository.save(user);

        emailService.sendVerificationEmail(user.getEmail(), newVerificationCode);

        return ResponseEntity.ok(Map.of("success", true, "message", "✅ Verification email resent successfully!"));
    }
}