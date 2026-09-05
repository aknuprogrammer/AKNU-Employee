import api from "@/services/api";

export const pfAccountSlipsService = {
  getPFAccountSlips: async () => {
    const { data } = await api.get('/pf-slips');
    return data;
  },
  uploadPFAccountSlip: async (payload) => {
    const { data } = await api.post('/pf-slips', payload, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },
  togglePFAccountSlipStatus: async (id, is_active) => {
    const { data } = await api.patch(`/pf-slips/${id}/status`, { is_active });
    return data;
  },
  deletePFAccountSlip: async (id) => {
    const { data } = await api.delete(`/pf-slips/${id}`);
    return data;
  },
  downloadPFAccountSlipAdmin: async (id) => {
    const response = await api.get(`/pf-slips/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },
  unlockPFAccountSlip: async (payload) => {
    const response = await api.post('/pf-slips/unlock', payload, {
      responseType: 'blob',
    });
    return response.data;
  },
  getMyYears: async () => {
    const { data } = await api.get('/pf-slips/my-years');
    return data;
  },
  bulkUploadPFAccountSlip: async (payload) => {
    const { data } = await api.post('/pf-slips/bulk', payload, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  }
};
