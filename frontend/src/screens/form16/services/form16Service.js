import api from "@/services/api";

export const form16Service = {
  getForm16s: async () => {
    const { data } = await api.get('/form16');
    return data;
  },
  uploadForm16: async (payload) => {
    const { data } = await api.post('/form16', payload, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },
  toggleForm16Status: async (id, is_active) => {
    const { data } = await api.patch(`/form16/${id}/status`, { is_active });
    return data;
  },
  deleteForm16: async (id) => {
    const { data } = await api.delete(`/form16/${id}`);
    return data;
  },
  downloadForm16Admin: async (id) => {
    const response = await api.get(`/form16/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },
  unlockForm16: async (payload) => {
    const response = await api.post('/form16/unlock', payload, {
      responseType: 'blob',
    });
    return response.data;
  },
  getMyYears: async () => {
    const { data } = await api.get('/form16/my-years');
    return data;
  },
  bulkUploadForm16: async (payload) => {
    const { data } = await api.post('/form16/bulk', payload, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  }
};
