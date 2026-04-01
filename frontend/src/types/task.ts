export interface ServiceCategory {
  id: number;
  name: string;
  description: string;
  iconUrl: string;
}

export interface CreateTaskRequest {
  title: string;
  description: string;
  categoryId: number;
  latitude: number;
  longitude: number;
  address: string;
  searchRadiusKm: number;
  budgetMin?: number;
  budgetMax?: number;
  preferredDate?: string;
}

export enum TaskStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface Task {
  id: number;
  customerId: number;
  customerName: string;
  customerEmail: string;
  categoryId: number;
  categoryName: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  address: string;
  searchRadiusKm: number;
  budgetMin?: number;
  budgetMax?: number;
  preferredDate?: string;
   status: TaskStatus;
  selectedQuotationId?: string;
  quotationCount: number;
  createdAt: string;
  updatedAt: string;
}

