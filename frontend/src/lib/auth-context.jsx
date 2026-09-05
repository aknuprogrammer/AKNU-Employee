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
  const [sessionExpired, setSessionExpired] = useState(false);
  const logoutTimerRef = useRef(null);

  useEffect(() => {
    const initAuth = async () => {
      const token = sessionStorage.getItem('token');
      if (token) {
        const decoded = parseJwt(token);
        if (decoded && decoded.exp) {
          const timeRemaining = (decoded.exp * 1000) - Date.now();
          if (timeRemaining <= 0) {
            // Token already expired
            sessionStorage.removeItem('token');
            setSessionExpired(true);
            setLoading(false);
            return;
          } else {
            // Set timer to trigger session expiry
            logoutTimerRef.current = setTimeout(() => {
              setSessionExpired(true);
            }, timeRemaining);
          }
        }

        try {
          const { data } = await api.get('/auth/profile');
          setUser(data);
          setSession({ access_token: token });
          setIsAccountant(data.role === 'accountant' || data.role === 'admin');
          setIsEmployee(data.role === 'employee');
        } catch (error) {
          console.error("Auth init error", error);
          sessionStorage.removeItem('token');
        }
      }
      setLoading(false);
    };
    initAuth();

    return () => {
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    };
  }, []);

  const signOut = async () => {
    sessionStorage.removeItem('token');
    setSession(null);
    setUser(null);
    setIsAccountant(false);
    setIsEmployee(false);
    setSessionExpired(false);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
  };

  return (
    <AuthContext.Provider value={{ session, user, isAccountant, isEmployee, signOut }}>
      {!loading && children}

      <Dialog open={sessionExpired} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()} showClose={false}>
          <DialogHeader>
            <DialogTitle>Session Expired</DialogTitle>
            <DialogDescription>
              For your security, you have been logged out automatically after 1 hour of inactivity. Please log in again to continue.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-start">
            <Button type="button" onClick={() => {
              signOut();
              window.location.href = "/login";
            }} className="w-full">
              <LogOut className="h-4 w-4 mr-2" />
              Go to Login
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
