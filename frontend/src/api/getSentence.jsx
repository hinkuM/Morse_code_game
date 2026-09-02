import { API_BASE } from "./config.jsx";

async function GetSentence() {
   const res = await fetch(`${API_BASE}/room/sentence`, { method: "POST" });
   if (!res.ok) {
      console.log(res);

      throw new Error(`GetSentence error: ${res.status}`);
   }
   const result = await res.json();
   return result.data;
}

export default GetSentence