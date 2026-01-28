package com.smartims.service.impl;

import com.smartims.service.EmailService;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender mailSender;

    private static final String SYSTEM_EMAIL = "support@serviceplus.com";

    @Value("${app.mail.from}")
    private String fromEmail;

    @Value("${app.mail.admin}")
    private String adminEmail;

    @Override
    public void sendOtpEmail(String to, String otp) {
        String subject = "Your ServicePlus Verification Code";
        String content = """
                <div style="font-family:Arial,sans-serif">
                    <h2>ServicePlus Verification</h2>
                    <p>Your OTP is:</p>
                    <h1>%s</h1>
                    <p>This OTP is valid for 2 minutes.</p>
                    <p>If you didn’t request this, please ignore.</p>
                </div>
                """.formatted(otp);

        sendHtmlEmail(to, subject, content);
    }

    private void sendHtmlEmail(String to, String subject, String htmlContent) {

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper =
                    new MimeMessageHelper(message, true);

            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);
            helper.setFrom(SYSTEM_EMAIL);

            mailSender.send(message);

        } catch (MessagingException e) {
            throw new RuntimeException("Failed to send email");
        }
    }

    public void sendContactToAdmin(String name, String email, String message) {
        String subject = "New Contact Request – ServicePlus";
        String content = """
                <div style="font-family:Arial,sans-serif">
                    <h2>New Contact Request</h2>
                    <p><b>Name:</b> %s</p>
                    <p><b>Email:</b> %s</p>
                    <p><b>Message:</b></p>
                    <p>%s</p>
                </div>
                """.formatted(name, email, message);

        sendHtmlEmail(SYSTEM_EMAIL, subject, content);
    }

    public void sendContactConfirmationToUser(String to) {
        String subject = "We received your message – ServicePlus";
        String content = """
                <div style="font-family:Arial,sans-serif">
                    <h2>Thank you for contacting ServicePlus</h2>
                    <p>Our team has received your message.</p>
                    <p>We’ll get back to you shortly.</p>
                </div>
                """;

        sendHtmlEmail(to, subject, content);
    }
}
