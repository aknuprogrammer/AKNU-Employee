import { useState } from 'react';
import { authService } from '../services/authService';
import { toast } from 'sonner';

export const useLogin = (onSuccess) => {
  const [loading, setLoading] = useState(false);

  const login = async (credentials) => {
    setLoading(true);
    try {
      const data = await authService.login(credentials);
      sessionStorage.setItem('token', data.token);
      toast.success("Welcome back");
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return { login, loading };
};
