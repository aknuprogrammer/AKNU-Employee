import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSectionEmployees, getSectionStudents, submitAttendance, updateAttendance, getPendingAttendance, approveAttendance, getAttendances } from '../services/attendanceService';

export const useSectionEmployees = (sectionId) => {
  return useQuery({
    queryKey: ['employees', sectionId],
    queryFn: () => getSectionEmployees(sectionId),
    enabled: !!sectionId,
  });
};

export const useSectionStudents = (sectionId) => {
  return useQuery({
    queryKey: ['students', sectionId],
    queryFn: () => getSectionStudents(sectionId),
    enabled: !!sectionId,
  });
};

export const usePendingAttendance = (sectionId) => {
  return useQuery({
    queryKey: ['attendance', 'pending', sectionId],
    queryFn: () => getPendingAttendance(sectionId),
    enabled: !!sectionId,
  });
};

export const useSubmitAttendance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitAttendance,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'pending', variables.section_id] });
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
    },
  });
};

export const useUpdateAttendance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateAttendance,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
    },
  });
};

export const useApproveAttendance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: approveAttendance,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'pending', data.section_id] });
    },
  });
};

export const useAttendances = (filters = {}) => {
  return useQuery({
    queryKey: ['attendances', filters],
    queryFn: () => getAttendances(filters),
    enabled: true,
  });
};
