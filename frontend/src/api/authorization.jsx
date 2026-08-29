import { API_BASE } from "./config.jsx";

async function Authorization({ setUser, setLoading }) {
   const res = await fetch(`${API_BASE}/auth`, {
      credentials: "include",
      method: "POST",
   });
   const result = await res.json();
   console.log(result);

   if (!res.ok) {
      setUser(null)
      setLoading(false)
      return
   }
   setUser(result.user_session_id)
   setLoading(false)
   return
}

export default Authorization