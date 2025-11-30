import apiClient from './client';

export const authAPI = {
  login: async (utorid, password) => {
    const response = await apiClient.post('/auth/tokens', {
      utorid,
      password,
    });
    return response.data;
  },

  requestPasswordReset: async (utorid) => {
    const response = await apiClient.post('/auth/resets', { utorid });
    return response.data;
  },

  resetPassword: async (resetToken, utorid, password) => {
    const response = await apiClient.post(`/auth/resets/${resetToken}`, {
      utorid,
      password,
    });
    return response.data;
  },
};

