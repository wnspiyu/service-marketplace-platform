import { TaskStatus } from './task';

export interface Notification {
  id: number;
  taskId: number;
  taskTitle: string;
  taskDescription: string;
  taskAddress: string;
  taskLatitude: number;
  taskLongitude: number;
  searchRadiusKm: number;
  budgetMin?: number;
  budgetMax?: number;
  preferredDate?: string;
  taskStatus: TaskStatus;
  customerName: string;
  categoryName: string;
  isViewed: boolean;
  isDeclined: boolean;
  viewedAt?: string;
  declinedAt?: string;
  createdAt: string;
  distanceKm: number;
  hasQuotation: boolean;
}
