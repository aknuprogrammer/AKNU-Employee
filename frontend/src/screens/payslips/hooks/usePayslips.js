import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payslipService } from '../services/payslipService';
import { toast } from 'sonner';

export const usePayslipsList = () => {
  return useQuery({
    queryKey: ["payslips"],
    queryFn: async () => {
      return await payslipService.getPayslips();
    }
  });
};

export const usePayslipDetails = (id) => {
  return useQuery({
    queryKey: ["payslips", id],
    queryFn: async () => {
      return await payslipService.getPayslipById(id);
    },
    enabled: !!id
  });
};

export const useGeneratePayslip = (onSuccess) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => payslipService.generatePayslip(payload),
    onSuccess: (data) => {
      toast.success("Payslip generated successfully");
      qc.invalidateQueries({ queryKey: ["payslips"] });
      if (onSuccess) onSuccess(data);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to generate payslip");
    }
  });
};

export const useUpdatePayslip = (onSuccess) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => payslipService.updatePayslip(id, data),
    onSuccess: () => {
      toast.success("Payslip updated successfully");
      qc.invalidateQueries({ queryKey: ["payslips"] });
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to update payslip");
    }
  });
};

export const useTogglePayslipStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }) => payslipService.togglePayslipStatus(id, is_active),
    onSuccess: (data, variables) => {
      toast.success(variables.is_active ? "Payslip enabled" : "Payslip disabled");
      qc.invalidateQueries({ queryKey: ["payslips"] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to update status");
    }
  });
};

