import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pfAccountSlipsService } from '../services/pfAccountSlipsService';
import { toast } from 'sonner';

export const usePFAccountSlipsList = (enabled = true) => {
  return useQuery({
    queryKey: ["pfSlips"],
    queryFn: async () => {
      return await pfAccountSlipsService.getPFAccountSlips();
    },
    enabled
  });
};

export const useUploadPFAccountSlip = (onSuccess) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData) => pfAccountSlipsService.uploadPFAccountSlip(formData),
    onSuccess: (data) => {
      toast.success("PF Account Slip uploaded successfully!");
      qc.invalidateQueries({ queryKey: ["pfSlips"] });
      if (onSuccess) onSuccess(data);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to upload PF Account Slip");
    }
  });
};

export const useTogglePFAccountSlipStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }) => pfAccountSlipsService.togglePFAccountSlipStatus(id, is_active),
    onSuccess: (data, variables) => {
      toast.success(variables.is_active ? "PF Account Slip document enabled" : "PF Account Slip document disabled");
      qc.invalidateQueries({ queryKey: ["pfSlips"] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to update status");
    }
  });
};

export const useDeletePFAccountSlip = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => pfAccountSlipsService.deletePFAccountSlip(id),
    onSuccess: () => {
      toast.success("PF Account Slip deleted successfully");
      qc.invalidateQueries({ queryKey: ["pfSlips"] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to delete PF Account Slip");
    }
  });
};

export const useMyPFAccountSlipYears = () => {
  return useQuery({
    queryKey: ["my-pf-slip-years"],
    queryFn: async () => {
      return await pfAccountSlipsService.getMyYears();
    }
  });
};

export const useBulkUploadPFAccountSlip = (onSuccess, onError) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData) => pfAccountSlipsService.bulkUploadPFAccountSlip(formData),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["pfSlips"] });
      if (onSuccess) onSuccess(data);
    },
    onError: (error) => {
      if (onError) onError(error);
      else toast.error(error.response?.data?.message || "Failed to bulk upload PF Account Slips");
    }
  });
};
