package com.smartims.service;

public interface EmailService {

    void sendOtpEmail(String email, String otp);

    void sendContactToAdmin(String name, String email, String message);

    void sendContactConfirmationToUser(String email);
}
