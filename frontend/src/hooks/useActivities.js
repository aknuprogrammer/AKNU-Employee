import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getActivities, submitActivity, approveActivity } from '../services/activityService';

export const useActivities = (filters = {}) => {
  return useQuery({
    queryKey: ['activities', filters],
    queryFn: () => getActivities(filters),
    enabled: true,
  });
};

export const useSubmitActivity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitActivity,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['activities', data.section_id] });
    },
  });
};

export const useApproveActivity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: approveActivity,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['activities', data.section_id] });
    },
  });
};
