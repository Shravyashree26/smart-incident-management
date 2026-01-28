package com.smartims.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class OtpDetails {

    private String otp;
    private LocalDateTime expiryTime;
    private boolean verified;
}
