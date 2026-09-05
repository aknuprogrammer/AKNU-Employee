import api from "@/services/api";

export const payslipService = {
  getPayslips: async () => {
    const { data } = await api.get('/payslips');
    return data;
  },
  getPayslipById: async (id) => {
    const { data } = await api.get(`/payslips/${id}`);
    return data;
  },
  generatePayslip: async (payload) => {
    const { data } = await api.post('/payslips', payload);
    return data;
  },
  updatePayslip: async (id, payload) => {
    const { data } = await api.put(`/payslips/${id}`, payload);
    return data;
  },
  togglePayslipStatus: async (id, is_active) => {
    const { data } = await api.patch(`/payslips/${id}/status`, { is_active });
    return data;
  }
};
