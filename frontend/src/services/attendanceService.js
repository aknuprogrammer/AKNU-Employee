import api from './api';

export const getSectionEmployees = async (sectionId) => {
  const { data } = await api.get(`/attendance/employees/${sectionId}`);
  return data.data;
};

export const getSectionStudents = async (sectionId) => {
  const { data } = await api.get(`/attendance/students/${sectionId}`);
  return data.data;
};

export const submitAttendance = async (attendanceData) => {
  const { data } = await api.post('/attendance', attendanceData);
  return data.data;
};

export const getPendingAttendance = async (sectionId) => {
  const { data } = await api.get(`/attendance/pending/${sectionId}`);
  return data.data;
};

export const approveAttendance = async ({ id, status, comments }) => {
  const { data } = await api.put(`/attendance/${id}/approve`, {
    approval_status: status,
    section_head_comments: comments
  });
  return data.data;
};

export const getAttendances = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.section_id) params.append('section_id', filters.section_id);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.search) params.append('search', filters.search);

  const { data } = await api.get(`/attendance?${params.toString()}`);
  return data.data;
};
