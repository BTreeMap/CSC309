import apiClient from './client';

export const transactionsAPI = {
  getTransactions: async (params = {}) => {
    const response = await apiClient.get('/transactions', { params });
    return response.data;
  },

  getTransaction: async (transactionId) => {
    const response = await apiClient.get(`/transactions/${transactionId}`);
    return response.data;
  },

  createPurchase: async (data) => {
    const response = await apiClient.post('/transactions', {
      ...data,
      type: 'purchase',
    });
    return response.data;
  },

  createAdjustment: async (data) => {
    const response = await apiClient.post('/transactions', {
      ...data,
      type: 'adjustment',
    });
    return response.data;
  },

  markSuspicious: async (transactionId, suspicious) => {
    const response = await apiClient.patch(`/transactions/${transactionId}/suspicious`, {
      suspicious,
    });
    return response.data;
  },

  getMyTransactions: async (params = {}) => {
    const response = await apiClient.get('/users/me/transactions', { params });
    return response.data;
  },

  createRedemption: async (amount, remark) => {
    const response = await apiClient.post('/users/me/transactions', {
      type: 'redemption',
      amount,
      remark,
    });
    return response.data;
  },

  createTransfer: async (userId, amount, remark) => {
    const response = await apiClient.post(`/users/${userId}/transactions`, {
      type: 'transfer',
      amount,
      remark,
    });
    return response.data;
  },

  processRedemption: async (transactionId) => {
    const response = await apiClient.patch(`/transactions/${transactionId}/processed`, {
      processed: true,
    });
    return response.data;
  },
};

