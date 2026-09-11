import { createContext, useContext, useState, useEffect, useRef } from "react";
import api from "@/services/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

const parseJwt = (token) => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    return null;
  }
};

const AuthContext = createContext({
  session: null,
  user: null,
  isAccountant: false,
  signOut: async () => {},
});

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [isAccountant, setIsAccountant] = useState(false);
  const [isEmployee, setIsEmployee] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = sessionStorage.getItem('token');
      if (token) {
        try {
          const { data } = await api.get('/auth/profile');
          setUser(data);
          setSession({ access_token: token });
          setIsAccountant(['accountant', 'admin', 'master_admin', 'section_head', 'junior_assistant'].includes(data.role));
          setIsEmployee(data.role === 'employee');
        } catch (error) {
          console.error("Auth init error", error);
          sessionStorage.removeItem('token');
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const signOut = async () => {
    sessionStorage.removeItem('token');
    setSession(null);
    setUser(null);
    setIsAccountant(false);
    setIsEmployee(false);
  };

  return (
    <AuthContext.Provider value={{ session, user, isAccountant, isEmployee, signOut }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
