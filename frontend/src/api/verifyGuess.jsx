import { API_BASE } from "./config.jsx";

async function VerifyGuess({ letter, index }) {
   const res = await fetch(`${API_BASE}/room/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ letter, index }),
   });
   if (!res.ok) {
      return false
   }
   return true
}

export default VerifyGuess