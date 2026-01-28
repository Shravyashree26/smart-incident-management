package com.smartims.service;

public interface OtpService {

    void generateAndSendOtp(String email);

    void verifyOtp(String email, String otp);

    boolean isOtpVerified(String email);

    void clearOtp(String email);
}
