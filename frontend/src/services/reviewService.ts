import api from './api';
import { Review, CreateReviewRequest } from '../types/quotation';

export const reviewService = {
  createReview: async (data: CreateReviewRequest): Promise<Review> => {
    const response = await api.post('/customer/reviews', data);
    return response.data;
  },

  getTaskReview: async (taskId: number): Promise<Review> => {
    const response = await api.get(`/customer/reviews/task/${taskId}`);
    return response.data;
  },

  getMyReviews: async (): Promise<Review[]> => {
    const response = await api.get('/provider/reviews');
    return response.data;
  },
};
