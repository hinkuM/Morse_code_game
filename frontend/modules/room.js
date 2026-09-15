import {
   role, sentence, verifyGuess, senderGuess,
   startTime, errors, isReady, gameStarted, finish, progress, restart
} from "./api.js"

const header = document.querySelector("header")
const main = document.querySelector("main")
const footer = document.querySelector("footer")
const morseTableContainer = document.getElementById("translation-table")
const scoringContainer = document.getElementById("scoring")
const MAX_TIME = 5 * 60 * 1000
const MORSE_TRANSLATION = [
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
const MORSE_TRANSLATION_MAP = new Map(MORSE_TRANSLATION.map((el) => [el.letter, el.morse]))
let MAX_LENGTH
let isPlayerReadyInterval
const currentLetterIndex = { ready: true, index: 0, letter: 0, word: 0 }
let timeCheckerInterval
let progressTracker
let teamName
let errorTracker

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
         if (currentLetterIndex.letter != i || currentLetterIndex.word != wordIndex) {
            return
         }
         input.classList.add("hover")
      })
      input.addEventListener("mouseleave", (e) => {
         input.classList.remove("hover")
      })
      input.addEventListener("focus", (e) => {
         if (currentLetterIndex.letter != i || currentLetterIndex.word != wordIndex) {
            return input.blur()
         }
         if (word) input.blur()
         input.classList.add("active")
      })
      input.addEventListener("blur", (e) => {
         input.classList.remove("active")
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
         input.classList.add("incorrect")
         if (result) {
            input.classList.remove("incorrect")
            input.classList.add("correct")
            input.classList.remove("active")
            input.blur()
            if (document.getElementById("word" + currentLetterIndex.word)) {
               document.getElementById("word" + currentLetterIndex.word).children[currentLetterIndex.letter].focus()
            }
         } else {
            document.getElementById("scoring-error").classList.add("lose")
         }
      })
      container.append(input)
   }
   return container
}

async function restartGame() {
   await restart()
   window.location.reload()
}

async function waitForReceiverEnd() {
   document.getElementById("input-bar").remove()
   const waitingContainer = document.createElement("section")
   waitingContainer.setAttribute("id", "waiting")
   waitingContainer.innerText = "Oczekiwanie, aż drugi gracz odszyfruje hasło..."
   footer.append(waitingContainer)
}

async function endGame() {
   clearInterval(timeCheckerInterval)
   clearInterval(progressTracker)
   clearInterval(errorTracker)
   const data = await finish(teamName)
   const score = data.no_errors && data.in_time ? 3 : data.no_errors || data.in_time ? 2 : 1
   const container = document.createElement("dialog")
   const title = document.createElement("div")
   const restart = document.createElement("button")

   container.setAttribute("id", "end")

   title.setAttribute("id", "end-title")
   title.innerText = "Ukończyłeś zadanie! Otrzymujesz " + score + " punkty!"
   restart.innerText = "restart"
   restart.addEventListener("click", async () => {
      await restartGame()
   })

   container.append(title, restart)
   document.body.append(container)
   container.showModal()
}

class Sender {
   async init() {
      const senderContainer = document.createElement("section")
      senderContainer.setAttribute("id", "input-bar")
      senderContainer.innerText = "Zacznij nadawać"
      footer.append(senderContainer)

      const fullSentence = await sentence()
      const words = (fullSentence).split(" ")
      MAX_LENGTH = fullSentence.replace(" ", "").length

      for (let i = 0; i < words.length; i++) {
         const word = words[i]
         main.append(LetterPlaceholder(this.onLetterInput, i, word.length, word))
      }
      let time
      let transmitting = false
      window.addEventListener("keydown", (e) => {
         if (!document.getElementById("input-bar")) return
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
         if (!document.getElementById("input-bar")) return
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
            if (Date.now() - time > 200) {
               inputBar.innerText += " ᠆"
            } else {
               inputBar.innerText += " •"
            }
         }
         if (e.code === "Enter") {
            const activeDiv = document.getElementById("word" + currentLetterIndex.word).children[currentLetterIndex.letter]
            activeDiv.value = MORSE_TRANSLATION.filter((el) => el.morse.trim() === inputBar.innerText.trim())[0].letter
            const event = new Event('input', {
               bubbles: true,
            })
            activeDiv.dispatchEvent(event)
            inputBar.innerText = "Zacznij nadawać"
         }
         const allMatches = MORSE_TRANSLATION.filter((el) => el.morse.trim().slice(0, inputBar.innerText.trim().length) === inputBar.innerText.trim())
         const allCounterMatches = MORSE_TRANSLATION.filter((el) => el.morse.trim().slice(0, inputBar.innerText.trim().length) != inputBar.innerText.trim())
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
      if (currentLetterIndex.index > MAX_LENGTH) return
      const isCorrect =
         letter.toUpperCase() === word[currentLetterIndex.letter].toUpperCase()
      senderGuess(isCorrect)
      if (!isCorrect) return false
      currentLetterIndex.index += 1
      currentLetterIndex.letter += 1
      if (currentLetterIndex.letter >= word.length) {
         currentLetterIndex.letter = 0
         currentLetterIndex.word += 1
      }
      if (currentLetterIndex.index === MAX_LENGTH) {
         waitForReceiverEnd()
      }
      return true
   }
}
class Receiver {
   async init() {
      const fullSentence = await sentence()
      const words = (fullSentence).split(" ")
      MAX_LENGTH = fullSentence.replace(" ", "").length

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
      if (currentLetterIndex.index === MAX_LENGTH) {
         endGame()
      }
      return true
   }
}

class Game {
   async role() {
      this.userRole = await role()
      if (this.userRole === "receiver") {
         const showMorse = document.createElement("button")
         showMorse.innerText = "Pokaż wiadomość"
         showMorse.addEventListener("click", () => {
            gameControls.playCurrentLetter()
         })
         footer.append(showMorse)
      }
   }

   async init() {
      if (this.userRole === "sender") {
         const container = document.createElement("dialog")
         const title = document.createElement("div")
         const name = document.createElement("input")
         const send = document.createElement("button")

         container.setAttribute("id", "round")

         title.setAttribute("id", "round-title")
         title.innerText = "Wpisz nazwę drużyny"
         send.innerText = "Zatwierdź"

         send.addEventListener("click", () => {
            teamName = name.value
            container.remove()
            this.readyDialog()
         })

         container.append(title, name, send)
         document.body.append(container)
         container.showModal()

      } else {
         this.readyDialog()
      }
   }

   readyDialog() {
      const container = document.createElement("dialog")
      const title = document.createElement("div")

      container.setAttribute("id", "round")

      title.setAttribute("id", "round-title")
      title.innerText = "Naciśnij Enter, gdy będziesz gotowy"

      container.append(title)
      document.body.append(container)
      container.showModal()
   }

   countdown() {
      const endTime = Date.now() + 5000
      const timer = setInterval(async () => {
         const time = endTime - Date.now()
         if (time <= 0) {
            clearInterval(timer)
            document.getElementById("round").remove()
            return await this.start()
         }
         const seconds = Math.floor(time / 1000) % 60
         document.getElementById("round-title").innerText = "Gra rozpocznie się za: " + seconds + "s"
      }, 200)
   }

   async start() {
      if (this.userRole === "sender") {
         const SenderClass = new Sender()
         await SenderClass.init()
      } else if (this.userRole === "receiver") {
         const ReceiverClass = new Receiver()
         await ReceiverClass.init()
         document.querySelector(".active").focus()
      }
      const serverTime = new Date(await startTime())
      const timeDifference = new Date().getHours() - serverTime.getHours()
      const startDate = timeDifference != 0 ? serverTime.getTime() + timeDifference * 60 * 60 * 1000 : serverTime.getTime()
      timeCheckerInterval = setInterval(() => {
         const time = Date.now() - startDate - 5000
         const seconds = Math.floor(time / 1000) % 60
         const minutes = Math.floor(Math.floor(time / 1000) / 60)
         header.innerText = (minutes < 10 ? "0" + minutes : minutes) + ":" + (seconds < 10 ? "0" + seconds : seconds)
         if (time > MAX_TIME) {
            document.getElementById("scoring-time").classList.add("lose")
         }
      }, 100)
      const allPlaceholders = document.querySelectorAll(".placeholder")
      progressTracker = setInterval(async () => {
         const data = await progress()
         for (let i = 0; i < data.progress; i++) {
            const child = allPlaceholders[i];
            child.classList.add("ready")
         }
         if (data.progress > 0 && this.userRole === "receiver") {
            this.currentLetter = data.current_letter
         }
         if (this.userRole === "sender" && data.progress === MAX_LENGTH) {
            await endGame()
         }
      }, 1000)

      errorTracker = setInterval(async () => {
         if (await errors() > 0) {
            document.getElementById("scoring-error").classList.add("lose")
            clearInterval(errorTracker)
         }
      }, 3000)

   }

   createTranslation() {
      for (const info of MORSE_TRANSLATION) {
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

   playCurrentLetter() {
      console.log(MORSE_TRANSLATION_MAP.get(this.currentLetter.toUpperCase()));
   }
}

const gameControls = new Game()
window.addEventListener("load", async () => {
   await gameControls.role()
   gameControls.createTranslation()
   if (await gameStarted()) {
      await gameControls.start()
   } else {
      await gameControls.init()
   }
   document.getElementById("loadingScreen").classList.add("hidden")
   setTimeout(() => {
      document.getElementById("loadingScreen").remove()
   }, 1000)
})

window.addEventListener("keypress", (e) => {
   if (e.code === "Enter" && document.getElementById("round-title")) {
      e.preventDefault()
      document.getElementById("round-title").innerText = "Oczekiwanie na drugiego gracza..."
      isPlayerReadyInterval = setInterval(async () => {
         if (await isReady()) {
            clearInterval(isPlayerReadyInterval)
            gameControls.countdown()
         } else {
            document.getElementById("round-title").innerText = "Oczekiwanie na drugiego gracza..."
         }
      }, 500)
   }
})
