const numberOfRooms = 4 // later delivered from server

window.addEventListener("load", () => {
   for (let i = 0; i < numberOfRooms; i++) {
      const menu = createRoomMenu(i);
      document.querySelector("main").append(menu)
   }
   roomInfo()
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
      btn.setAttribute("id", data.role)
      btn.addEventListener("click", () => {
         btn.classList.add("taken")
         btn.classList.remove("free")
         joinRoom(roomNumber, data.role)
      })
      container.append(btn)
   }

   container.append(empty)
   return container
}

function showSlotsStatus(rooms) {
   const containers = document.querySelectorAll(".room")
   for (let i = 0; i < containers.length; i++) {
      const roomContainer = containers[i];
      const senderDiv = roomContainer.querySelector("#sender")
      const receiverDiv = roomContainer.querySelector("#receiver")
      senderDiv.classList.remove("taken", "free")
      receiverDiv.classList.remove("taken", "free")
      senderDiv.classList.add((rooms[i].sender) ? "taken" : "free")
      receiverDiv.classList.add((rooms[i].receiver) ? "taken" : "free")
   }
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
         roomInfo()
      },
      error: function (result, err) {
         console.log(result, err);
         roomInfo()
      }
   });
}

function roomInfo() {
   $.ajax({
      url: "/room/info",
      type: "POST",
      success: function (result) {
         showSlotsStatus(result.data)
      },
      error: function (result, err) {
         console.log(result, err);
      }
   });
}