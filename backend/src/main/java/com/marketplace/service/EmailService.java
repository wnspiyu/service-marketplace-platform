package com.marketplace.service;

import com.marketplace.entity.Quotation;
import com.marketplace.entity.Task;
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

    @Async
    public void sendTaskNotificationEmail(User provider, Task task) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(provider.getEmail());
            message.setSubject("New Task Available: " + task.getTitle());
            message.setText(String.format(
                    "Dear %s,\n\n" +
                            "A new task is available in your service area:\n\n" +
                            "Title: %s\n" +
                            "Description: %s\n" +
                            "Location: %s\n" +
                            "Budget: $%s - $%s\n\n" +
                            "Please login to view full details and submit your quotation.\n\n" +
                            "View Task: %s/provider/notifications\n\n" +
                            "Best regards,\n%s Team",
                    provider.getFirstName(),
                    task.getTitle(),
                    task.getDescription(),
                    task.getAddress(),
                    task.getBudgetMin() != null ? task.getBudgetMin() : "Not specified",
                    task.getBudgetMax() != null ? task.getBudgetMax() : "Not specified",
                    appBaseUrl,
                    appName
            ));

            mailSender.send(message);
            logger.info("Task notification email sent to: {}", provider.getEmail());
        } catch (Exception e) {
            logger.error("Failed to send task notification email to: {}", provider.getEmail(), e);
        }
    }

    @Async
    public void sendQuotationSubmittedEmail(User customer, Quotation quotation) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(customer.getEmail());
            message.setSubject("New Quotation Received for: " + quotation.getTask().getTitle());
            message.setText(String.format(
                    "Dear %s,\n\n" +
                            "You have received a new quotation for your task:\n\n" +
                            "Task: %s\n" +
                            "Provider: %s %s\n" +
                            "Price: $%s\n" +
                            "Estimated Duration: %s\n" +
                            "Message: %s\n\n" +
                            "Login to view full details and accept/reject the quotation.\n\n" +
                            "View Quotations: %s/customer/tasks/%s\n\n" +
                            "Best regards,\n%s Team",
                    customer.getFirstName(),
                    quotation.getTask().getTitle(),
                    quotation.getServiceProvider().getFirstName(),
                    quotation.getServiceProvider().getLastName(),
                    quotation.getPrice(),
                    quotation.getEstimatedDuration() != null ? quotation.getEstimatedDuration() : "Not specified",
                    quotation.getMessage() != null ? quotation.getMessage() : "No additional message",
                    appBaseUrl,
                    quotation.getTask().getId(),
                    appName
            ));

            mailSender.send(message);
            logger.info("Quotation submitted email sent to: {}", customer.getEmail());
        } catch (Exception e) {
            logger.error("Failed to send quotation submitted email to: {}", customer.getEmail(), e);
        }
    }

    @Async
    public void sendQuotationAcceptedEmail(User provider, Quotation quotation) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(provider.getEmail());
            message.setSubject("Quotation Accepted: " + quotation.getTask().getTitle());
            message.setText(String.format(
                    "Dear %s,\n\n" +
                            "Congratulations! Your quotation has been accepted.\n\n" +
                            "Task: %s\n" +
                            "Your Price: $%s\n" +
                            "Customer: %s %s\n" +
                            "Contact: %s\n\n" +
                            "Please contact the customer to arrange the service delivery.\n\n" +
                            "Best regards,\n%s Team",
                    provider.getFirstName(),
                    quotation.getTask().getTitle(),
                    quotation.getPrice(),
                    quotation.getTask().getCustomer().getFirstName(),
                    quotation.getTask().getCustomer().getLastName(),
                    quotation.getTask().getCustomer().getPhoneNumber() != null ?
                            quotation.getTask().getCustomer().getPhoneNumber() : quotation.getTask().getCustomer().getEmail(),
                    appName
            ));

            mailSender.send(message);
            logger.info("Quotation accepted email sent to: {}", provider.getEmail());
        } catch (Exception e) {
            logger.error("Failed to send quotation accepted email to: {}", provider.getEmail(), e);
        }
    }

    @Async
    public void sendQuotationRejectedEmail(User provider, Quotation quotation) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(provider.getEmail());
            message.setSubject("Quotation Rejected: " + quotation.getTask().getTitle());
            message.setText(String.format(
                    "Dear %s,\n\n" +
                            "Your quotation for the following task has been rejected by the customer:\n\n" +
                            "Task: %s\n" +
                            "Your Price: $%s\n\n" +
                            "We appreciate your interest and encourage you to continue bidding on other tasks.\n\n" +
                            "Best regards,\n%s Team",
                    provider.getFirstName(),
                    quotation.getTask().getTitle(),
                    quotation.getPrice(),
                    appName
            ));

            mailSender.send(message);
            logger.info("Quotation rejected email sent to: {}", provider.getEmail());
        } catch (Exception e) {
            logger.error("Failed to send quotation rejected email to: {}", provider.getEmail(), e);
        }
    }

    @Async
    public void sendQuotationDeclinedEmail(User provider, Quotation quotation) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(provider.getEmail());
            message.setSubject("Quotation Not Selected: " + quotation.getTask().getTitle());
            message.setText(String.format(
                    "Dear %s,\n\n" +
                            "Thank you for submitting your quotation for the following task:\n\n" +
                            "Task: %s\n" +
                            "Your Price: $%s\n\n" +
                            "Unfortunately, the customer has selected another provider for this task.\n\n" +
                            "We appreciate your interest and encourage you to continue bidding on other tasks.\n\n" +
                            "Best regards,\n%s Team",
                    provider.getFirstName(),
                    quotation.getTask().getTitle(),
                    quotation.getPrice(),
                    appName
            ));

            mailSender.send(message);
            logger.info("Quotation declined email sent to: {}", provider.getEmail());
        } catch (Exception e) {
            logger.error("Failed to send quotation declined email to: {}", provider.getEmail(), e);
        }
    }
}
