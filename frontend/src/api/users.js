import apiClient from './client';

export const usersAPI = {
  getMe: async () => {
    const response = await apiClient.get('/users/me');
    return response.data;
  },

  updateMe: async (data) => {
    const formData = new FormData();
    if (data.name) formData.append('name', data.name);
    if (data.email) formData.append('email', data.email);
    if (data.birthday) formData.append('birthday', data.birthday);
    if (data.avatar) formData.append('avatar', data.avatar);

    const response = await apiClient.patch('/users/me', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  updatePassword: async (oldPassword, newPassword) => {
    const response = await apiClient.patch('/users/me/password', {
      old: oldPassword,
      new: newPassword,
    });
    return response.data;
  },

  getUsers: async (params = {}) => {
    const response = await apiClient.get('/users', { params });
    return response.data;
  },

  getUser: async (userId) => {
    const response = await apiClient.get(`/users/${userId}`);
    return response.data;
  },

  updateUser: async (userId, data) => {
    const response = await apiClient.patch(`/users/${userId}`, data);
    return response.data;
  },

  createUser: async (userData) => {
    const response = await apiClient.post('/users', userData);
    return response.data;
  },
};

