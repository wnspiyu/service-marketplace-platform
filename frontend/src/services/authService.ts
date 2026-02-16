import api from './api';
import {
  LoginResponse,
  RegisterCustomerRequest,
  RegisterProviderRequest,
} from '../types/user';

export const authService = {
  registerCustomer: async (data: RegisterCustomerRequest): Promise<LoginResponse> => {
    const response = await api.post('/auth/register/customer', data);
    return response.data;
  },

  registerProvider: async (data: RegisterProviderRequest): Promise<LoginResponse> => {
    const response = await api.post('/auth/register/provider', data);
    return response.data;
  },

  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  verifyEmail: async (token: string): Promise<void> => {
    await api.get(`/auth/verify-email/${token}`);
  },
  
  forgotPassword: async (email: string): Promise<void> => {
    await api.post('/auth/forgot-password', { email });
  },

  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    await api.post('/auth/reset-password', { token, newPassword });
  },
};
