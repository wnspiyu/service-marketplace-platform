import api from './api';
import {ServiceCategory } from '../types/task';

export const taskService = {
  getAllCategories: async (): Promise<ServiceCategory[]> => {
    const response = await api.get('/categories');
    return response.data;
  }
};
