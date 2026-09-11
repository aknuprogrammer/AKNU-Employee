import api from './api';

export const getActivities = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.section_id) params.append('section_id', filters.section_id);
  if (filters.date) params.append('date', filters.date);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.status) params.append('status', filters.status);
  if (filters.search) params.append('search', filters.search);

  const { data } = await api.get(`/activities?${params.toString()}`);
  return data.data;
};

export const submitActivity = async (activityData) => {
  const { data } = await api.post('/activities', activityData);
  return data.data;
};

export const updateActivity = async ({ id, ...activityData }) => {
  const { data } = await api.put(`/activities/${id}`, activityData);
  return data.data;
};

export const approveActivity = async ({ id, status, comments }) => {
  const { data } = await api.put(`/activities/${id}/approve`, {
    approval_status: status,
    section_head_comments: comments
  });
  return data.data;
};
