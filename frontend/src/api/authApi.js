import api from "./axios";
import axios from "axios";

export const login = (email, password) => {
  return axios.post("http://localhost:8080/api/auth/login", {
    email,
    password
  });
};

export const register = (data) => {
  return axios.post(
    "http://localhost:8080/api/auth/register",
    data
  );
};

export const getCurrentUser = async () => {
  return api.get("/me");
};

export const requestRegisterOtp = (email) => {
  return axios.post(
    "http://localhost:8080/api/auth/register/request-otp",
    null,
    { params: { email } }
  );
};

export const verifyRegisterOtp = (email, otp) => {
  return axios.post(
    "http://localhost:8080/api/auth/register/verify-otp",
    null,
    { params: { email, otp } }
  );
};

export const requestForgotOtp = (email) =>
  axios.post(
    "http://localhost:8080/api/auth/forgot-password/request-otp",
    null,
    { params: { email } }
  );

export const verifyForgotOtp = (email, otp) => {
  return axios.post(
    "http://localhost:8080/api/auth/forgot-password/verify-otp",
    null,
    { params: { email, otp } }
  );
};

export const resetPassword = (email, newPassword) => {
  return axios.post(
    "http://localhost:8080/api/auth/forgot-password/reset",
    null,
    { params: { email, newPassword } }
  );
};

export const sendContactForm = (data) => {
  return axios.post(
    "http://localhost:8080/api/contact/submit", 
    data
  );
};
