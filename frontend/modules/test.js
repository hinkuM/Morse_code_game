import { test } from "./api.js"
const smallBtn = document.getElementById("small")
const mediumBtn = document.getElementById("medium")
const bigBtn = document.getElementById("big")
const hugeBtn = document.getElementById("huge")
const clear = document.getElementById("clear")

let interval

smallBtn.addEventListener("click", () => {
   interval = setInterval(() => {
      console.log(test());
   }, 1000 / 32)
})
mediumBtn.addEventListener("click", () => {
   interval = setInterval(() => {
      console.log(test());
   }, 1000 / 64)
})
bigBtn.addEventListener("click", () => {
   interval = setInterval(() => {
      console.log(test());
   }, 1000 / 128)
})
hugeBtn.addEventListener("click", () => {
   interval = setInterval(() => {
      console.log(test());
   }, 1000 / 256)
})
clear.addEventListener("click", () => {
   clearInterval(interval)
})
