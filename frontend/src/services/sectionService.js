import api from './api';

export const getSections = async () => {
  const { data } = await api.get('/sections');
  return data.data;
};
