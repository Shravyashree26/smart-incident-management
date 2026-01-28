package com.smartims.service.impl;

import com.smartims.entity.OtpDetails;
import com.smartims.service.EmailService;
import com.smartims.service.OtpService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class OtpServiceImpl implements OtpService {

    private final EmailService emailService;

    private static final int OTP_EXPIRY_MINUTES = 5;

    private final Map<String, OtpDetails> otpStore = new ConcurrentHashMap<>();

    @Override
    public void generateAndSendOtp(String email) {

        String otp = String.valueOf(100000 + new Random().nextInt(900000));

        OtpDetails otpDetails = new OtpDetails(
                otp,
                LocalDateTime.now().plusMinutes(OTP_EXPIRY_MINUTES),
                false
        );

        otpStore.put(email, otpDetails);

        emailService.sendOtpEmail(email, otp);
    }

    @Override
    public void verifyOtp(String email, String otp) {

        OtpDetails storedOtp = otpStore.get(email);

        if (storedOtp == null) {
            throw new RuntimeException("OTP not found");
        }

        if (storedOtp.getExpiryTime().isBefore(LocalDateTime.now())) {
            otpStore.remove(email);
            throw new RuntimeException("OTP expired");
        }

        if (!storedOtp.getOtp().equals(otp)) {
            throw new RuntimeException("Invalid OTP");
        }

        otpStore.put(email,
                new OtpDetails(
                        storedOtp.getOtp(),
                        storedOtp.getExpiryTime(),
                        true
                )
        );
    }

    @Override
    public boolean isOtpVerified(String email) {

        OtpDetails otpDetails = otpStore.get(email);
        return otpDetails != null && otpDetails.isVerified();
    }

    @Override
    public void clearOtp(String email) {
        otpStore.remove(email);
    }
}
