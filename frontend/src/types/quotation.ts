export enum QuotationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
}

export interface Quotation {
  id: number;
  taskId: number;
  taskTitle: string;
  serviceProviderId: number;
  providerName: string;
  providerBusinessName?: string;
  providerEmail: string;
  providerPhone?: string;
  providerRating: number;
  providerTotalReviews: number;
  price: number;
  estimatedDuration?: string;
  message?: string;
  status: QuotationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceProvider {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  categoryId: number;
  categoryName: string;
  businessName?: string;
  bio?: string;
  yearsOfExperience?: number;
  latitude: number;
  longitude: number;
  address: string;
  serviceRadiusKm: number;
  averageRating: number;
  totalReviews: number;
  totalTasksCompleted: number;
  distanceKm?: number;
}
