import { role, sentence, verifyGuess } from "./api.js"

const header = document.querySelector("header")
const main = document.querySelector("main")
const footer = document.querySelector("footer")
const morseTableContainer = document.getElementById("translation-table")
const scoringContainer = document.getElementById("scoring")


const morseTranslation = [
   { letter: "A", morse: "• ᠆" },
   { letter: "B", morse: "᠆ • • •" },
   { letter: "C", morse: "᠆ • ᠆ •" },
   { letter: "D", morse: "᠆ • •" },
   { letter: "E", morse: "•" },
   { letter: "F", morse: "• • ᠆ •" },
   { letter: "G", morse: "᠆ ᠆ •" },
   { letter: "H", morse: "• • • •" },
   { letter: "I", morse: "• •" },
   { letter: "J", morse: "• ᠆ ᠆ ᠆" },
   { letter: "K", morse: "• ᠆ •" },
   { letter: "L", morse: "• ᠆ • •" },
   { letter: "M", morse: "᠆ ᠆" },
   { letter: "N", morse: "᠆ •" },
   { letter: "O", morse: "᠆ ᠆ ᠆" },
   { letter: "P", morse: "• ᠆ ᠆ •" },
   { letter: "Q", morse: "᠆ ᠆ • ᠆" },
   { letter: "R", morse: "• ᠆ •" },
   { letter: "S", morse: "• • •" },
   { letter: "T", morse: "᠆" },
   { letter: "U", morse: "• • ᠆" },
   { letter: "V", morse: "• • • ᠆" },
   { letter: "W", morse: "• ᠆ ᠆" },
   { letter: "X", morse: "᠆ • • ᠆" },
   { letter: "Y", morse: "᠆ • ᠆ ᠆" },
   { letter: "Z", morse: "᠆ ᠆ • •" },
   { letter: "1", morse: "• ᠆ ᠆ ᠆ ᠆", number: true },
   { letter: "2", morse: "• • ᠆ ᠆ ᠆", number: true },
   { letter: "3", morse: "• • • ᠆ ᠆", number: true },
   { letter: "4", morse: "• • • • ᠆", number: true },
   { letter: "5", morse: "• • • • •", number: true },
   { letter: "6", morse: "᠆ • • • •", number: true },
   { letter: "7", morse: "᠆ ᠆ • • •", number: true },
   { letter: "8", morse: "᠆ ᠆ ᠆ • •", number: true },
   { letter: "9", morse: "᠆ ᠆ ᠆ ᠆ •", number: true },
   { letter: "0", morse: "᠆ ᠆ ᠆ ᠆ ᠆", number: true },
]

const startDate = Date.now()
setInterval(() => {
   const time = Date.now() - startDate
   const seconds = Math.floor(time / 1000) % 60
   const minutes = Math.floor(Math.floor(time / 1000) / 60)
   header.innerText = (minutes < 10 ? "0" + minutes : minutes) + ":" + (seconds < 10 ? "0" + seconds : seconds)
}, 100)

function morseGrid() {
   for (const info of morseTranslation) {
      const container = document.createElement("div")
      const letter = document.createElement("div")
      const morse = document.createElement("div")

      container.classList.add("translation-block")
      if (info?.number) container.classList.add("number")
      container.setAttribute("id", info.letter)
      letter.classList.add("letter")
      letter.innerText = info.letter
      morse.classList.add("morse")
      morse.innerText = info.morse

      container.append(letter, morse)
      morseTableContainer.append(container)
   }
}

morseGrid()

const currentLetterIndex = { ready: true, index: 0, letter: 0, word: 0 }

class Sender {
   async init() {
      const senderContainer = document.createElement("section")
      senderContainer.setAttribute("id", "input-bar")
      senderContainer.innerText = "Zacznij nadawać"
      footer.append(senderContainer)

      const words = (await sentence()).split(" ")

      for (let i = 0; i < words.length; i++) {
         const word = words[i]
         main.append(LetterPlaceholder(this.onLetterInput, i, word.length, word))

      }
      let time
      let transmitting = false
      window.addEventListener("keydown", (e) => {
         e.preventDefault()
         if (e.code !== "Space" && e.code !== "Enter" && e.code !== "Backspace") {
            return
         }
         if (transmitting) {
            return
         }
         transmitting = true
         time = Date.now()
      })
      window.addEventListener("keyup", (e) => {
         e.preventDefault()
         transmitting = false
         const inputBar = document.getElementById("input-bar")
         if (inputBar.innerText === "Zacznij nadawać") {
            if (e.code === "Space") {
               inputBar.innerText = ""
            } else {
               return
            }
         } else if (inputBar.innerText.length === 0) {
            for (const node of document.getElementById("translation-table").children) {
               node.classList.remove("hint")
            }
            return inputBar.innerText = "Zacznij nadawać"
         }
         if (e.code === "Backspace") {
            inputBar.innerText = inputBar.innerText.slice(0, -2)
            if (inputBar.innerText.length === 0) {
               document.getElementById("translation-cover").classList.add("hidden")
               for (const node of document.getElementById("translation-table").children) {
                  node.classList.remove("hint")
               }
               return inputBar.innerText = "Zacznij nadawać"
            }
         }
         if (inputBar.innerText.length >= 9 && inputBar.innerText != "Zacznij nadawać") {
            return
         }
         if (e.code === "Space") {
            console.log(Date.now() - time);

            if (Date.now() - time > 200) {
               inputBar.innerText += " ᠆"
            } else {
               inputBar.innerText += " •"
            }
         }
         if (e.code === "Enter") {
            const activeDiv = document.getElementById("word" + currentLetterIndex.word).children[currentLetterIndex.letter]
            activeDiv.value = morseTranslation.filter((el) => el.morse.trim() === inputBar.innerText.trim())[0].letter
            const event = new Event('input', {
               bubbles: true,
            })
            activeDiv.dispatchEvent(event)
            inputBar.innerText = "Zacznij nadawać"
         }
         const allMatches = morseTranslation.filter((el) => el.morse.trim().slice(0, inputBar.innerText.trim().length) === inputBar.innerText.trim())
         const allCounterMatches = morseTranslation.filter((el) => el.morse.trim().slice(0, inputBar.innerText.trim().length) != inputBar.innerText.trim())
         for (const id of allCounterMatches) {
            document.getElementById(id.letter).classList.remove("hint")
         }
         for (const id of allMatches) {
            document.getElementById(id.letter).classList.add("hint")
         }
         if (allMatches.length > 0) {
            document.getElementById("translation-cover").classList.remove("hidden")
         } else {
            document.getElementById("translation-cover").classList.add("hidden")
         }
      })
   }

   async onLetterInput(letter, word) {
      const isCorrect =
         letter.toUpperCase() === word[currentLetterIndex.letter].toUpperCase()
      if (!isCorrect) return false
      currentLetterIndex.index += 1
      currentLetterIndex.letter += 1
      if (currentLetterIndex.letter >= word.length) {
         currentLetterIndex.letter = 0
         currentLetterIndex.word += 1
      }
      return true
   }
}
class Receiver {
   async init() {
      const words = (await sentence()).split(" ")

      for (let i = 0; i < words.length; i++) {
         const word = words[i]
         main.append(LetterPlaceholder(this.onLetterInput, i, word.length))
      }
   }

   async onLetterInput(letter, wordLength) {
      currentLetterIndex.ready = false
      const result = await verifyGuess(letter, currentLetterIndex.index)
      currentLetterIndex.ready = true

      if (!result) return false
      currentLetterIndex.index += 1
      currentLetterIndex.letter += 1
      if (currentLetterIndex.letter >= wordLength) {
         currentLetterIndex.letter = 0
         currentLetterIndex.word += 1
      }
      return true
   }
}

const userRole = await role()

if (userRole === "sender") {
   const SenderClass = new Sender()
   await SenderClass.init()
} else if (userRole === "receiver") {
   const ReceiverClass = new Receiver()
   await ReceiverClass.init()
}

function LetterPlaceholder(onLetterInput, wordIndex, wordLength, word = undefined) {
   const container = document.createElement("section")
   container.classList.add("word")
   container.setAttribute("id", "word" + wordIndex)
   for (let i = 0; i < wordLength; i++) {
      const input = document.createElement("input")
      input.classList.add("placeholder")
      if (i === 0 && wordIndex === 0) input.classList.add("active")
      input.placeholder = word ? word[i].toUpperCase() : ""

      input.addEventListener("mouseenter", (e) => {
         if (word) return
         if (currentLetterIndex.letter != i && currentLetterIndex.word != wordIndex) {
            return
         }
         input.classList.add("hover")
      })
      input.addEventListener("mouseleave", (e) => {
         input.classList.remove("hover")
      })
      input.addEventListener("focus", (e) => {
         if (currentLetterIndex.letter != i && currentLetterIndex.word != wordIndex) {
            return input.blur()
         }
         if (word) input.blur()
         input.classList.add("active")
      })
      input.addEventListener("input", async (e) => {
         input.value = input.value.toUpperCase()
         const value = input.value
         if (value.length <= 0) {
            return
         }
         const letter = value.slice(-1)
         if (value.length > 1) {
            input.value = letter
         }

         if (!currentLetterIndex.ready) {
            return console.log("inactive");
         }

         const result = await onLetterInput(letter, word ?? wordLength)
         console.log(result);
         input.classList.add("incorrect")
         if (result) {
            input.classList.remove("incorrect")
            input.classList.add("correct")
            input.classList.remove("active")
            input.blur()
            document.getElementById("word" + currentLetterIndex.word).children[currentLetterIndex.letter].focus()
         }
      })
      container.append(input)
   }
   return container
}