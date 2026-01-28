package com.smartims.controller;

import com.smartims.dto.ApiResponse;
import com.smartims.service.OtpService;
import com.smartims.util.ResponseUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.smartims.dto.OtpRequest;
import com.smartims.dto.OtpVerifyRequest;


@RestController
@RequestMapping("/api/auth/otp")
@RequiredArgsConstructor
public class AuthOtpController {

    private final OtpService otpService;

    // STEP 1: Send OTP
    @PostMapping("/send")
    public ResponseEntity<ApiResponse<Void>> sendOtp(
            @RequestBody OtpRequest request) {

        otpService.generateAndSendOtp(request.getEmail());

        return ResponseUtil.success("OTP sent successfully", null);

    }

    // STEP 2: Verify OTP
    @PostMapping("/verify")
    public ResponseEntity<ApiResponse<Void>> verifyOtp(
            @RequestBody OtpVerifyRequest request) {

        otpService.verifyOtp(
                request.getEmail(),
                request.getOtp()
        );

        return ResponseUtil.success("OTP verified successfully", null);
    }

}
