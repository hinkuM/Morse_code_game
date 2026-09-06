import { roomInfo, joinRoom } from "./api.js"

const availability = await roomInfo()
const numberOfRooms = availability.length
const rooms = document.querySelectorAll(".container")

for (let i = 0; i < numberOfRooms; i++) {
   const t = availability[i]
   for (const [key, value] of Object.entries(t)) {
   }
}


for (let i = 0; i < rooms.length; i++) {
   const children = rooms[i].children;

   for (let j = 0; j < children.length; j++) {
      const button = children[j];
      if (button.classList.contains("sender")) {
         button.addEventListener("click", () => {
            joinRoom(i, "sender")
         })
         if (availability[i]?.["sender"]) {
            button.classList.add("taken")
         }
      } else if (button.classList.contains("receiver")) {
         button.addEventListener("click", () => {
            joinRoom(i, "receiver")
         })
         if (availability[i]?.["receiver"]) {
            button.classList.add("taken")
         }
      }
   }
}