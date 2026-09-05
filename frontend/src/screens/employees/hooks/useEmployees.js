import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeService } from '../services/employeeService';
import { toast } from 'sonner';
import api from '@/services/api';

export const useDepartments = () => {
  return useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      try {
        return await employeeService.getDepartments();
      } catch {
        return [];
      }
    }
  });
};

export const useCreateDepartment = (onSuccess) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name) => employeeService.createDepartment(name),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["departments"] });
      if (onSuccess) onSuccess(data);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to create department");
    }
  });
};

export const useCategories = () => {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      try {
        return await employeeService.getCategories();
      } catch {
        return [];
      }
    }
  });
};

export const useCreateCategory = (onSuccess) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name) => employeeService.createCategory(name),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      if (onSuccess) onSuccess(data);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to create category");
    }
  });
};

export const useEmployeesList = () => {
  return useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      return await employeeService.getEmployees();
    }
  });
};

export const useToggleEmployeeStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, is_active }) => employeeService.updateEmployeeStatus(id, is_active),
    onSuccess: (data, variables) => {
      toast.success(variables.is_active ? "Employee enabled" : "Employee disabled");
      qc.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to update status");
    }
  });
};

export const useCreateEmployee = (onSuccess) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => employeeService.createEmployee(data),
    onSuccess: () => {
      toast.success("Employee added");
      qc.invalidateQueries({ queryKey: ["employees"] });
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to save employee");
    }
  });
};

export const useBulkImportEmployees = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => employeeService.bulkImport(payload),
    onSuccess: (data, payload) => {
      toast.success(`Imported ${payload.length} employees`);
      qc.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Bulk import failed");
    }
  });
};

export const useUpdateEmployee = (onSuccess) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const res = await api.put(`/employees/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Employee updated");
      qc.invalidateQueries({ queryKey: ["employees"] });
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to update employee");
    }
  });
};

