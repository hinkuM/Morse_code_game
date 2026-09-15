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

export function role() {
   return apiRequester(
      {
         method: "POST",
         url: "/room/role",
         contentType: "application/json",
         success: (response) => {
            return response
         },
      }
   )
}

export function sentence() {
   return apiRequester(
      {
         method: "POST",
         url: "/room/sentence",
         contentType: "application/json",
         success: (response) => {
            return response
         },
      }
   )
}

export function verifyGuess(letter, index) {
   return apiRequester(
      {
         method: "POST",
         url: "/room/verify",
         data: { letter, index },
         contentType: "application/json",
         success: (response) => {
            return response
         },
      }
   )
}

export function senderGuess(correct) {
   return apiRequester(
      {
         method: "POST",
         url: "/room/senderGuess",
         data: { correct },
         contentType: "application/json",
         success: (response) => {
            return response
         },
      }
   )
}

export function startTime() {
   return apiRequester(
      {
         method: "POST",
         url: "/room/time",
         contentType: "application/json",
         success: (response) => {
            return response
         },
      }
   )
}

export function errors() {
   return apiRequester(
      {
         method: "POST",
         url: "/room/errors",
         contentType: "application/json",
         success: (response) => {
            return response
         },
      }
   )
}

export function isReady() {
   return apiRequester(
      {
         method: "POST",
         url: "/room/ready",
         contentType: "application/json",
         success: (response) => {
            return response
         },
      }
   )
}

export function gameStarted() {
   return apiRequester(
      {
         method: "POST",
         url: "/room/started",
         contentType: "application/json",
         success: (response) => {
            return response
         },
      }
   )
}

export function finish(teamName) {
   return apiRequester(
      {
         method: "POST",
         url: "/room/finish",
         data: { teamName: teamName ?? "" },
         contentType: "application/json",
         success: (response) => {
            return response
         },
      }
   )
}

export function progress() {
   return apiRequester(
      {
         method: "POST",
         url: "/room/progress",
         contentType: "application/json",
         success: (response) => {
            return response
         },
      }
   )
}

export function restart() {
   return apiRequester(
      {
         method: "POST",
         url: "/room/restart",
         contentType: "application/json",
         success: (response) => {
            return response
         },
      }
   )
}

async function apiRequester({ method, url, data = {}, contentType = null }) {
   const options = {
      method,
      headers: { "Content-Type": contentType ?? "application/json" }
   }

   if (method === "GET") {
      const params = new URLSearchParams(data).toString()
      if (params) url += (url.includes("?") ? "&" : "?") + params
   } else if (data) {
      options.body = JSON.stringify(data)
   }

   const response = await fetch(url, options)
   const body = await response.json().catch(() => null)

   if (!response.ok) {
      return false
   }

   if (body.code === "REDIRECT") {
      window.location.href = body.data
   }

   return body.data
}