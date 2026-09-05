import api from './api';

export const getGateLogs = async () => {
  const { data } = await api.get('/gatelogs');
  return data.data;
};

export const logEntry = async (logData) => {
  const { data } = await api.post('/gatelogs/entry', logData);
  return data.data;
};

export const logExit = async (id) => {
  const { data } = await api.put(`/gatelogs/${id}/exit`);
  return data.data;
};
