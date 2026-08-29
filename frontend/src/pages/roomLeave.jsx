import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../api/config.jsx";

export default function RoomLeave() {
   const navigate = useNavigate();
   const [error, setError] = useState(null);

   useEffect(() => {
      (async () => {
         try {
            const res = await fetch(`${API_BASE}/leave`, {
               method: "POST",
               credentials: "include",
            });
            if (!res.ok) throw new Error(`Leave failed: ${res.status}`);
         } catch (err) {
            setError(err.message);
         } finally {
            navigate("/", { replace: true });
         }
      })();
   }, [navigate]);

   return <p>Leaving room...</p>;
}