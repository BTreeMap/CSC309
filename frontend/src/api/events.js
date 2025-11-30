import apiClient from './client';

export const eventsAPI = {
  getEvents: async (params = {}) => {
    const response = await apiClient.get('/events', { params });
    return response.data;
  },

  getEvent: async (eventId) => {
    const response = await apiClient.get(`/events/${eventId}`);
    return response.data;
  },

  createEvent: async (data) => {
    const response = await apiClient.post('/events', data);
    return response.data;
  },

  updateEvent: async (eventId, data) => {
    const response = await apiClient.patch(`/events/${eventId}`, data);
    return response.data;
  },

  deleteEvent: async (eventId) => {
    const response = await apiClient.delete(`/events/${eventId}`);
    return response.data;
  },

  addOrganizer: async (eventId, utorid) => {
    const response = await apiClient.post(`/events/${eventId}/organizers`, { utorid });
    return response.data;
  },

  removeOrganizer: async (eventId, userId) => {
    const response = await apiClient.delete(`/events/${eventId}/organizers/${userId}`);
    return response.data;
  },

  addGuest: async (eventId, utorid) => {
    const response = await apiClient.post(`/events/${eventId}/guests`, { utorid });
    return response.data;
  },

  removeGuest: async (eventId, userId) => {
    const response = await apiClient.delete(`/events/${eventId}/guests/${userId}`);
    return response.data;
  },

  rsvpEvent: async (eventId) => {
    const response = await apiClient.post(`/events/${eventId}/guests/me`);
    return response.data;
  },

  cancelRsvp: async (eventId) => {
    const response = await apiClient.delete(`/events/${eventId}/guests/me`);
    return response.data;
  },

  awardPoints: async (eventId, data) => {
    const response = await apiClient.post(`/events/${eventId}/transactions`, {
      type: 'event',
      ...data,
    });
    return response.data;
  },
};

