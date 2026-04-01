import api from './api';

import { Quotation, CreateQuotationRequest } from '../types/quotation';

export const quotationService = {
  // Customer endpoints
  getTaskQuotations: async (taskId: number): Promise<Quotation[]> => {
    const response = await api.get(`/customer/tasks/${taskId}/quotations`);
    return response.data;
  },

  acceptQuotation: async (quotationId: number): Promise<void> => {
    await api.put(`/customer/quotations/${quotationId}/accept`);
  },

  rejectQuotation: async (quotationId: number): Promise<void> => {
    await api.put(`/customer/quotations/${quotationId}/reject`);
  },

  // Provider endpoints
  submitQuotation: async (data: CreateQuotationRequest): Promise<Quotation> => {
    const response = await api.post('/provider/quotations', data);
    return response.data;
  },

  getMyQuotations: async (): Promise<Quotation[]> => {
    const response = await api.get('/provider/quotations');
    return response.data;
  },

  withdrawQuotation: async (quotationId: number): Promise<void> => {
    await api.put(`/provider/quotations/${quotationId}/withdraw`);
  },
};
