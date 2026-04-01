import api from './api';

import { Notification } from '../types/notification';

export const notificationService = {
  getNotifications: async (): Promise<Notification[]> => {
    const response = await api.get('/provider/notifications');
    return response.data;
  },

  getUnviewedNotifications: async (): Promise<Notification[]> => {
    const response = await api.get('/provider/notifications/unviewed');
    return response.data;
  },

  getUnviewedCount: async (): Promise<number> => {
    const response = await api.get('/provider/notifications/unviewed-count');
    return response.data;
  },

  markAsViewed: async (notificationId: number): Promise<void> => {
    await api.put(`/provider/notifications/${notificationId}/view`);
  },

  declineTask: async (notificationId: number): Promise<void> => {
    await api.put(`/provider/notifications/${notificationId}/decline`);
  },
};
