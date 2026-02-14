export enum UserType {
  CUSTOMER = 'CUSTOMER',
  SERVICE_PROVIDER = 'SERVICE_PROVIDER',
}

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  userType: UserType;
  isEmailVerified: boolean;
}

export interface LoginResponse {
  token: string;
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  userType: UserType;
}

export interface RegisterCustomerRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  address?: string;
}

export interface RegisterProviderRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  categoryId: number;
  businessName?: string;
  bio?: string;
  yearsOfExperience?: number;
  latitude: number;
  longitude: number;
  address: string;
  serviceRadiusKm?: number;
}
