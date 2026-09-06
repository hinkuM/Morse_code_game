export async function roomInfo(roomNumber, role) {
   return apiRequester(
      {
         method: "POST",
         url: "/info",
         contentType: "application/json",
         success: (response) => {
            return response
         },
      }
   )
}


export function joinRoom(roomNumber, role) {
   return apiRequester(
      {
         method: "POST",
         url: "/join",
         data: { roomNumber, role },
         contentType: "application/json",
         success: (response) => { },
      }
   )
}

async function apiRequester({ method, url, data = {}, contentType = null }) {
   const options = {
      method,
      headers: { "Content-Type": contentType ?? "application/json" }
   }
   console.log(data);

   if (method === "GET") {
      const params = new URLSearchParams(data).toString()
      if (params) url += (url.includes("?") ? "&" : "?") + params
   } else if (data) {
      options.body = JSON.stringify(data)
   }

   const response = await fetch(url, options)
   const body = await response.json().catch(() => null)

   if (!response.ok) {
      throw { status: response.status, ...body };
   }

   return body.data
}