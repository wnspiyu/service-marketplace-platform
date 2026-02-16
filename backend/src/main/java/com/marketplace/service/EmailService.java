package com.marketplace.service;


import com.marketplace.entity.User;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    @Value("${app.name}")
    private String appName;

    @Value("${app.base-url}")
    private String appBaseUrl;

    @Async
    public void sendVerificationEmail(User user, String token) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(user.getEmail());
            message.setSubject("Verify Your Email Address");
            message.setText(String.format(
                    "Dear %s,\n\n" +
                            "Thank you for registering with %s!\n\n" +
                            "Please click the link below to verify your email address:\n" +
                            "%s/verify-email/%s\n\n" +
                            "This link will expire in 24 hours.\n\n" +
                            "Best regards,\n%s Team",
                    user.getFirstName(),
                    appName,
                    appBaseUrl,
                    token,
                    appName
            ));

            mailSender.send(message);
            logger.info("Verification email sent to: {}", user.getEmail());
        } catch (Exception e) {
            logger.error("Failed to send verification email to: {}", user.getEmail(), e);
        }
    }

    @Async
    public void sendPasswordResetEmail(User user, String token) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(user.getEmail());
            message.setSubject("Password Reset Request");
            message.setText(String.format(
                    "Dear %s,\n\n" +
                            "You have requested to reset your password.\n\n" +
                            "Please click the link below to reset your password:\n" +
                            "%s/reset-password?token=%s\n\n" +
                            "This link will expire in 1 hour.\n\n" +
                            "If you did not request this, please ignore this email.\n\n" +
                            "Best regards,\n%s Team",
                    user.getFirstName(),
                    appBaseUrl,
                    token,
                    appName
            ));

            mailSender.send(message);
            logger.info("Password reset email sent to: {}", user.getEmail());
        } catch (Exception e) {
            logger.error("Failed to send password reset email to: {}", user.getEmail(), e);
        }
    }


}
