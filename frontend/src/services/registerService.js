import api from './api';

export const getRegisters = async (type, filters = {}) => {
  const params = new URLSearchParams();
  if (type) params.append('type', type);
  
  if (filters.section_id) params.append('section_id', filters.section_id);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.search) params.append('search', filters.search);
  
  const { data } = await api.get(`/registers?${params.toString()}`);
  return data.data;
};

export const submitRegister = async (registerData) => {
  // If there are file attachments, use FormData for multipart upload
  if (registerData.attachments && registerData.attachments.length > 0) {
    const form = new FormData();
    // Append all regular fields (except attachments)
    Object.entries(registerData).forEach(([key, value]) => {
      if (key === 'attachments') return;
      form.append(key, value);
    });
    // Append each file
    Array.from(registerData.attachments).forEach((file) => {
      form.append('attachments', file);
    });
    const { data } = await api.post('/registers', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  }
  // No attachments, fallback to JSON payload
  const { data } = await api.post('/registers', registerData);
  return data.data;
};

export const updateRegister = async ({ id, ...updateData }) => {
  const { data } = await api.put(`/registers/${id}`, updateData);
  return data.data;
};

export const approveRegister = async ({ id, status, comments }) => {
  const { data } = await api.put(`/registers/${id}/approve`, {
    status,
    section_head_comments: comments
  });
  return data.data;
};
