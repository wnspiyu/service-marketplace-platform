import api from './api';
import {ServiceCategory, CreateTaskRequest, Task } from '../types/task';

export const taskService = {
  getAllCategories: async (): Promise<ServiceCategory[]> => {
    const response = await api.get('/categories');
    return response.data;
  },

  getCategoryById: async (id: number): Promise<ServiceCategory> => {
    const response = await api.get(`/categories/${id}`);
    return response.data;
  },

  createTask: async (data: CreateTaskRequest): Promise<Task> => {
    const response = await api.post('/customer/tasks', data);
    return response.data;
  },

  getMyTasks: async (): Promise<Task[]> => {
    const response = await api.get('/customer/tasks');
    return response.data;
  },

  getTaskById: async (taskId: number): Promise<Task> => {
    const response = await api.get(`/customer/tasks/${taskId}`);
    return response.data;
  },
};
