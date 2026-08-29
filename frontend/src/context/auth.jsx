import { createContext, useContext, useEffect, useState } from "react";
import Authorization from "../api/authorization";

const auth = createContext(null);

export function AuthorizationProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      await Authorization({ setUser, setLoading });
    })();
  }, []);

  return (
    <auth.Provider value={{ user, setUser, loading }}>
      {children}
    </auth.Provider>
  );
}

export function useAuth() {
  return useContext(auth);
}