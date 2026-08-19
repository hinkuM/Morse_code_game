import { API_BASE } from "./config.jsx";

async function GetRoomInfo() {
   const res = await fetch(`${API_BASE}/info`, { method: "POST" });
   if (!res.ok) {
      throw new Error(`getRoomInfo error: ${res.status}`);
   }
   const result = await res.json();
   return result.data;
}

export default GetRoomInfo