import { API_BASE } from "./config.jsx";

async function JoinRoom({ roomNumber, role }) {
   const res = await fetch(`${API_BASE}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomNumber, role }),
   });
   if (!res.ok) {
      throw new Error(`JoinRoom error: ${res.status}`);
   }
   const result = await res.json();
   return result.data.redirect;
}

export default JoinRoom