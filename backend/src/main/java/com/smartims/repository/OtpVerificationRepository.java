package com.smartims.repository;

import com.smartims.entity.OtpVerification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OtpVerificationRepository
        extends JpaRepository<OtpVerification, Long> {

    Optional<OtpVerification> findByEmail(String email);

    void deleteByEmail(String email);
}
