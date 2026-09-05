import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { form16Service } from '../services/form16Service';
import { toast } from 'sonner';

export const useForm16List = (enabled = true) => {
  return useQuery({
    queryKey: ["form16s"],
    queryFn: async () => {
      return await form16Service.getForm16s();
    },
    enabled
  });
};

export const useUploadForm16 = (onSuccess) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData) => form16Service.uploadForm16(formData),
    onSuccess: (data) => {
      toast.success("Form 16 uploaded successfully!");
      qc.invalidateQueries({ queryKey: ["form16s"] });
      if (onSuccess) onSuccess(data);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to upload Form 16");
    }
  });
};

export const useToggleForm16Status = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }) => form16Service.toggleForm16Status(id, is_active),
    onSuccess: (data, variables) => {
      toast.success(variables.is_active ? "Form 16 document enabled" : "Form 16 document disabled");
      qc.invalidateQueries({ queryKey: ["form16s"] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to update status");
    }
  });
};

export const useDeleteForm16 = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => form16Service.deleteForm16(id),
    onSuccess: () => {
      toast.success("Form 16 deleted successfully");
      qc.invalidateQueries({ queryKey: ["form16s"] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to delete Form 16");
    }
  });
};

export const useMyForm16Years = () => {
  return useQuery({
    queryKey: ["my-form16-years"],
    queryFn: async () => {
      return await form16Service.getMyYears();
    }
  });
};

export const useBulkUploadForm16 = (onSuccess, onError) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData) => form16Service.bulkUploadForm16(formData),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["form16s"] });
      if (onSuccess) onSuccess(data);
    },
    onError: (error) => {
      if (onError) onError(error);
      else toast.error(error.response?.data?.message || "Failed to bulk upload Form 16");
    }
  });
};
