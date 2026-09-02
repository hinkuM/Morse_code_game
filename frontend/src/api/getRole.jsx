import { API_BASE } from "./config.jsx";

async function GetRole() {
   const res = await fetch(`${API_BASE}/room/role`, { method: "POST" });
   if (!res.ok) {
      console.log(res);

      throw new Error(`GetRole error: ${res.status}`);
   }
   const result = await res.json();
   return result.data;
}

export default GetRole