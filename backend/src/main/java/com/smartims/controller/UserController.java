package com.smartims.controller;

import com.smartims.dto.*;
import com.smartims.service.UserService;
import com.smartims.util.ResponseUtil;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/user")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

//    @GetMapping("/profile")
//    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'MANAGER', 'ENGINEER')")
//    public ResponseEntity<ApiResponse<String>> userProfile() {
//
//        return ResponseUtil.success(
//                "User profile access granted",
//                "User profile access granted"
//        );
//    }

    // POST - Create user
    @PostMapping
    public ResponseEntity<ApiResponse<UserResponse>> createUser(
            @RequestBody UserCreateRequest request) {
        UserResponse response = userService.createUser(request);

        return ResponseUtil.success(
                HttpStatus.OK,
                "User created successfully",
                response
        );
    }

    // GET - All users
    @GetMapping
    public ResponseEntity<ApiResponse<List<UserResponse>>> getAllUsers() {

        return ResponseUtil.success(
                HttpStatus.OK,
                "Users fetched successfully",
                userService.getAllUsers()
        );
    }


    // GET - User by ID
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UserResponse>> getUserById(
            @PathVariable Long id) {

        return ResponseUtil.success(
                HttpStatus.OK,
                "User fetched successfully",
                userService.getUserById(id)
        );
    }


    // PUT - Update user
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<UserResponse>> updateUser(
            @PathVariable Long id,
            @RequestBody UserUpdateRequest request) {

        return ResponseUtil.success(
                HttpStatus.OK,
                "User updated successfully",
                userService.updateUser(id, request)
        );
    }


    // DELETE - Delete user
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(
            @PathVariable Long id) {

        userService.deleteUser(id);

        return ResponseUtil.success(
                HttpStatus.OK,
                "User deleted successfully",
                null
        );
    }


    @PutMapping("/{id}/status")
    public ResponseEntity<ApiResponse<Void>> updateUserStatus(
            @PathVariable Long id,
            @RequestBody UpdateUserStatusRequest request) {

        userService.updateUserStatus(id, request.isEnabled());

        return ResponseEntity.ok(
                new ApiResponse<>(
                        HttpStatus.OK.value(),
                        "SUCCESS",
                        request.isEnabled()
                                ? "User enabled successfully"
                                : "User disabled successfully",
                        null,
                        true
                )
        );
    }

    @PutMapping("/{id}/lock")
    public ResponseEntity<ApiResponse<Void>> updateUserLockStatus(
            @PathVariable Long id,
            @RequestBody UpdateUserLockRequest request) {

        userService.updateUserLockStatus(id, request.isLocked());

        return ResponseEntity.ok(
                new ApiResponse<>(
                        HttpStatus.OK.value(),
                        "SUCCESS",
                        request.isLocked()
                                ? "User locked successfully"
                                : "User unlocked successfully",
                        null,
                        true
                )
        );
    }

    @PutMapping("/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @RequestBody ChangePasswordRequest request) {

        userService.changePassword(request);

        return ResponseEntity.ok(
                new ApiResponse<>(
                        HttpStatus.OK.value(),
                        "SUCCESS",
                        "Password changed successfully",
                        null,
                        true
                )
        );
    }

}
