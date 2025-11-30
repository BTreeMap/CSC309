import apiClient from './client';

export const promotionsAPI = {
  getPromotions: async (params = {}) => {
    const response = await apiClient.get('/promotions', { params });
    return response.data;
  },

  getPromotion: async (promotionId) => {
    const response = await apiClient.get(`/promotions/${promotionId}`);
    return response.data;
  },

  createPromotion: async (data) => {
    const response = await apiClient.post('/promotions', data);
    return response.data;
  },

  updatePromotion: async (promotionId, data) => {
    const response = await apiClient.patch(`/promotions/${promotionId}`, data);
    return response.data;
  },

  deletePromotion: async (promotionId) => {
    const response = await apiClient.delete(`/promotions/${promotionId}`);
    return response.data;
  },
};

