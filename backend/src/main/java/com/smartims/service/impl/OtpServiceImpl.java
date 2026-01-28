package com.smartims.service.impl;

import com.smartims.service.EmailService;
import com.smartims.service.OtpService;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class OtpServiceImpl implements OtpService {

    private final EmailService emailService;

    // In-memory store (safe for now, DB later)
    private final Map<String, OtpEntry> otpStore = new ConcurrentHashMap<>();

    private static final int OTP_EXPIRY_MINUTES = 5;

    @Override
    public void generateAndSendOtp(String email) {

        String otp = generateOtp();

        otpStore.put(
                email,
                new OtpEntry(
                        otp,
                        LocalDateTime.now().plusMinutes(5),
                        false
                )
        );

        emailService.sendOtpEmail(email, otp);
    }


    @Override
    public void verifyOtp(String email, String otp) {

        OtpEntry entry = otpStore.get(email);

        if (entry == null) {
            throw new RuntimeException("OTP not found");
        }

        if (entry.getExpiryTime().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("OTP expired");
        }

        if (!entry.getOtp().equals(otp)) {
            throw new RuntimeException("Invalid OTP");
        }

        entry.setVerified(true);
    }

    @Override
    public boolean isOtpVerified(String email) {

        OtpEntry entry = otpStore.get(email);
        return entry != null && entry.isVerified();
    }

    @Override
    public void clearOtp(String email) {
        otpStore.remove(email);
    }

    private String generateOtp() {
        return String.valueOf(100000 + new Random().nextInt(900000));
    }

    // 🔐 Inner class
    private static class OtpEntry {
        private final String otp;
        private final LocalDateTime expiryTime;
        @Setter
        private boolean verified;

        public OtpEntry(String otp, LocalDateTime expiryTime, boolean verified) {
            this.otp = otp;
            this.expiryTime = expiryTime;
            this.verified = verified;
        }

        public String getOtp() {
            return otp;
        }

        public LocalDateTime getExpiryTime() {
            return expiryTime;
        }

        public boolean isVerified() {
            return verified;
        }

    }
}
