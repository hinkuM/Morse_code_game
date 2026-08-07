const numberOfRooms = 4 // later delivered from server

window.addEventListener("load", () => {
   for (let i = 0; i < numberOfRooms; i++) {
      const menu = createRoomMenu(i);
      document.querySelector("main").append(menu)
   }
})

function createRoomMenu(roomNumber) {
   const container = document.createElement("section")
   const roomName = document.createElement("div")
   const roomTitle = document.createElement("div")
   const empty = document.createElement("div")

   container.classList.add("room")
   roomName.classList.add("room-name")
   roomName.innerText = "Room " + roomNumber
   roomTitle.classList.add("room-title")
   roomTitle.innerText = "Join as:"

   container.append(roomName, roomTitle)

   const buttons = [
      { text: "Sender", role: "sender" },
      { text: "Receiver", role: "receiver" }
   ]

   for (let i = 0; i < buttons.length; i++) {
      const data = buttons[i];
      const btn = document.createElement("button")

      btn.innerText = data.text
      btn.classList.add("room-btn")
      btn.addEventListener("click", () => {
         joinRoom(roomNumber, data.role)
      })
      container.append(btn)
   }

   container.append(empty)
   return container
}

function joinRoom(roomNumber, role) {
   $.ajax({
      url: "/room/join",
      type: "POST",
      data: {
         roomNumber,
         role
      },
      success: function (result) {
         console.log(result);
      },
      error: function (result, err) {
         console.log(result, err);

      }
   });
}