import { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Authorization from "../api/authorization";

const auth = createContext(null);
const PROTECTED_PATHS = ["/room", "/leave", "/waiting"];

export function AuthorizationProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    if (!PROTECTED_PATHS.includes(location.pathname)) {
      setLoading(false);
      return;
    }
    (async () => {
      await Authorization({ setUser, setLoading });
    })();
  }, [location.pathname]);

  return (
    <auth.Provider value={{ user, setUser, loading }}>
      {children}
    </auth.Provider>
  );
}

export function useAuth() {
  return useContext(auth);
}