package com.workvia.backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender; // injected mail sender

    // send verification email
    public void sendVerificationEmail(String toEmail, String code) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject("【Workvia】Please verify your email address");

        String verifyUrl = "http://localhost:5173/verify?token=" + code;

        message.setText("Welcome to Workvia!\n\n" +
                "Please click the link below to activate your account (if the link isn't clickable, copy and paste it into your browser's address bar):\n" +
                verifyUrl + "\n\n" +
                "If you did not sign up for a Workvia account, please ignore this email.");

        mailSender.send(message);
    }

    // send password reset email
    public void sendPasswordResetEmail(String toEmail, String resetToken) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject("【Workvia】Password Reset Request");

        String resetUrl = "http://localhost:5173/reset-password?token=" + resetToken;

        message.setText("Hello,\n\n" +
                "We received a request to reset your Workvia password. " +
                "Click the link below to set a new password:\n" +
                resetUrl + "\n\n" +
                "This link will expire in 15 minutes. If you didn't request this, please ignore this email.");

        mailSender.send(message);
    }
}