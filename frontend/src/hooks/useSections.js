import { useQuery } from '@tanstack/react-query';
import { getSections } from '../services/sectionService';

export const useSections = () => {
  return useQuery({
    queryKey: ['sections'],
    queryFn: getSections,
  });
};
