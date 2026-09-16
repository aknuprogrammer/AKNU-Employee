import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRegisters, submitRegister, updateRegister, approveRegister } from '../services/registerService';

export const useRegisters = (type, filters = {}) => {
  return useQuery({
    queryKey: ['registers', type, filters],
    queryFn: () => getRegisters(type, filters),
    enabled: true,
  });
};

export const useSubmitRegister = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitRegister,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registers'] });
    },
  });
};

export const useUpdateRegister = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateRegister,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registers'] });
    },
  });
};

export const useApproveRegister = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: approveRegister,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registers'] });
    },
  });
};
