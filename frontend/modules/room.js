import {
   role, sentence, verifyGuess, senderGuess,
   startTime, errors, isReady, gameStarted, finish, progress, restart
} from "./api.js"

const headerTimer = document.getElementById("header-timer")
const footer = document.querySelector("footer")
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
]
const MORSE_TRANSLATION_MAP = new Map(MORSE_TRANSLATION.map((el) => [el.letter, el.morse]))
let MAX_LENGTH
let isPlayerReadyInterval
const currentLetterIndex = { ready: true, index: 0, letter: 0, word: 0 }
let timeCheckerInterval
let progressTracker
let teamName
let errorTracker
let errroIndicatorTimeout
let barInterval
let lastBadInput = 0
let lastInput = ""

function popUp({ x, y, titl, txt, height, width }) {
   const background = document.createElement("div")
   const container = document.createElement("div")
   const title = document.createElement("div")
   const text = document.createElement("div")

   background.setAttribute("id", "window-background")
   container.setAttribute("id", "window")
   container.style.width = width + "px"
   container.style.height = height + "px"
   container.style.top = y + "px"
   if (y === -1) {
      container.style.top = "calc(50% - " + height / 2 + "px)"
   }
   container.style.left = x + "px"
   if (x === -1) {
      container.style.left = "calc(50% - " + width / 2 + "px)"
   }
   title.innerText = titl
   text.innerText = txt
   container.append(title, text)
   background.append(container)
   return background
}

function LetterPlaceholder({ role, wordIndex = 0, word, tutorial = undefined } = {}) {
   const container = document.createElement("section")
   container.classList.add("word")
   container.setAttribute("id", "word" + wordIndex)
   for (let i = 0; i < word.length; i++) {
      const input = document.createElement("input")
      input.classList.add("placeholder", "ready")
      if (i === 0 && wordIndex === 0) input.classList.add("active")
      input.placeholder = role === "sender" ? word[i].toUpperCase() : ""

      input.addEventListener("focus", (e) => {
         if (currentLetterIndex.letter != i || currentLetterIndex.word != wordIndex) {
            return input.blur()
         }
         if (role === "sender" || tutorial?.disable) input.blur()
         input.classList.add("active")
      })
      input.addEventListener("blur", (e) => {
         if (input.classList.contains("correct")) return
         e.preventDefault()
         input.focus()
      })
      input.addEventListener("input", async (e) => {
         input.value = input.value.toUpperCase()
         if (!input.value.toUpperCase().match(/[A-Z]/g)) return input.value = (input.value.length === 1) ? input.value : lastInput
         if (Date.now() - lastBadInput < 1100) return input.value = (input.value.length === 1) ? input.value : lastInput
         const value = input.value
         const letter = value.slice(-1)
         lastInput = letter
         if (value.length <= 0) {
            return
         }
         if (value.length > 1) {
            input.value = letter
         }

         if (!currentLetterIndex.ready) {
            return console.log("inactive");
         }

         const result = await onLetterInput(role, letter, word, tutorial)
         if (result) {
            input.classList.add("correct")
            input.classList.remove("active")
            input.blur()
            if (document.getElementById("word" + currentLetterIndex.word)) {
               document.getElementById("word" + currentLetterIndex.word).children[currentLetterIndex.letter].focus()
            }
         } else {
            lastBadInput = Date.now()
            input.classList.remove("ready")
            errroIndicatorTimeout = setTimeout(() => {
               input.classList.add("ready")
            }, 100)
            if (document.querySelectorAll(".scoring-icons.hidden").length > 0) {
               document.querySelectorAll(".scoring-icons.hidden")[0].classList.remove("hidden")
            }
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

function endTutorial() {
   const container = popUp(
      {
         x: -1, y: -1,
         height: 250,
         width: 340,
         titl: "Ukończyłeś szkolenie!",
         txt: "Zatwierdź, aby przejść dalej"
      })
   terminalContainer.append(container)
   document.getElementById("progress-numbers").innerText = "1 / 1"
   terminalContainer.classList.add("end-tutorial")
}

async function Sender() {
   const senderContainer = document.createElement("section")
   senderContainer.setAttribute("id", "input-bar")
   senderContainer.innerText = "Zacznij nadawać"
   footer.append(senderContainer)

   const word = await sentence()
   MAX_LENGTH = word.length
   const main = document.getElementById("main")
   main.append(LetterPlaceholder({
      role: "sender",
      word,
   }))
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
async function Receiver(tutorial) {
   const word = tutorial.text ?? await sentence()
   MAX_LENGTH = word.length
   const main = document.getElementById("main")

   main.append(LetterPlaceholder({
      role: "receiver",
      word,
      tutorial
   }))
   document.querySelectorAll(".placeholder")[0].focus()
}

async function onLetterInput(role, letter, word, tutorial = undefined) {
   if (currentLetterIndex.index > MAX_LENGTH) return
   if (role === "sender") {
      const isCorrect =
         letter.toUpperCase() === word[currentLetterIndex.letter].toUpperCase()
      senderGuess(isCorrect)
      if (!isCorrect) return false
   }
   if (role === "receiver") {
      currentLetterIndex.ready = false
      const result = tutorial ? tutorial.text[currentLetterIndex.letter].toUpperCase() === letter.toUpperCase() :
         await verifyGuess(letter, currentLetterIndex.index)
      currentLetterIndex.ready = true
      if (!result) return false
   }

   currentLetterIndex.index += 1
   currentLetterIndex.letter += 1
   if (currentLetterIndex.letter >= word.length) {
      currentLetterIndex.letter = 0
      currentLetterIndex.word += 1
   }
   if (currentLetterIndex.index === MAX_LENGTH) {
      if (role === "sender") waitForReceiverEnd()
      if (role === "receiver") tutorial ? endTutorial() : endGame()
   }
   return true
}

class Game {
   async role(r) {
      this.userRole = r ?? await role()
      this.timeouts = []
   }

   async layout() {
      const container = document.createElement("section")
      container.setAttribute("id", "game-layout")

      // loading screen
      {
         const loadingScreen = document.createElement("section")
         loadingScreen.innerText = "Ładowanie..."
         loadingScreen.setAttribute("id", "loading-screen")
         container.append(loadingScreen)
      }
      // header
      {
         const headerContainer = document.createElement("section")
         const timer = document.createElement("div")
         const timerBar = document.createElement("div")
         headerContainer.setAttribute("id", "header")
         timer.setAttribute("id", "header-timer")
         timerBar.setAttribute("id", "header-timer-bar")
         timer.append(timerBar)
         headerContainer.append(timer)
         container.append(headerContainer)
      }
      // main
      {
         const mainContainer = document.createElement("section")
         mainContainer.setAttribute("id", "main")
         container.append(mainContainer)
      }
      // footer
      {
         const footerContainer = document.createElement("section")
         footerContainer.setAttribute("id", "footer")
         if (this.userRole === "receiver") {
            const lights = document.createElement("div")
            const title = document.createElement("div")
            const messageContainer = document.createElement("div")
            const morseContainer = document.createElement("div")
            title.innerText = "Sygnał"
            title.setAttribute("id", "lights-title")
            lights.setAttribute("id", "lights")
            lights.classList.add("aside-block")
            messageContainer.setAttribute("id", "lights-message")
            morseContainer.setAttribute("id", "lights-morse")
            lights.append(title, messageContainer, morseContainer)
            footerContainer.append(lights)
         }
         container.append(footerContainer)
      }
      // aside left
      {
         const asideLeft = document.createElement("section")
         const asidePointsContainer = document.createElement("section")
         const scroringTitle = document.createElement("div")
         const scroringList = document.createElement("div")
         const asideProgressContainer = document.createElement("section")
         const progressTitle = document.createElement("section")
         const progressNumbers = document.createElement("section")

         asideLeft.classList.add("aside")
         asideLeft.style.justifyContent = "space-between"

         asidePointsContainer.setAttribute("id", "overheat")
         asidePointsContainer.classList.add("aside-block")
         scroringTitle.innerText = "Przegrzane serwery"
         scroringTitle.setAttribute("id", "scoring-title")
         scroringList.setAttribute("id", "scoring-list")
         asidePointsContainer.append(scroringTitle, scroringList)
         for (let i = 0; i < 3; i++) {
            const container = document.createElement("div")
            const serverIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg")
            function* iconLinetIterator() {
               for (let i = 0; i < 2; i++) {
                  yield {
                     type: "line", values: new Map([
                        ["x1", "6"],
                        ["y1", 39 + i * 8],
                        ["x2", "26"],
                        ["y2", 39 + i * 8],
                        ["stroke", "var(--fg)"],
                        ["stroke-width", "2"],
                        ["opacity", "0.85"],
                     ])
                  }

               }
            }
            function* iconPathIterator() {
               for (let i = 0; i < 3; i++) {
                  const lines = [
                     ["d", "M8 6 C 6 12, 12 14, 9 20"],
                     ["d", "M16 2 C 13 10, 20 12, 15 18"],
                     ["d", "M24 6 C 22 12, 27 15, 23 21"],
                  ]
                  yield {
                     type: "path", values: new Map([
                        lines[i],
                        ["stroke", "var(--err)"],
                        ["stroke-width", "2"],
                        ["stroke-linecap", "round"],
                        ["fill", "none"],
                     ])
                  }
               }
            }
            const serverData = [
               {
                  type: "rect", values: new Map([
                     ["x", "2"],
                     ["y", "6"],
                     ["width", "28"],
                     ["height", "48"],
                     ["rx", "2"],
                     ["fill", "none"],
                     ["stroke", "var(--fg)"],
                     ["stroke-width", "2.5"],
                  ])
               },
               ...iconPathIterator(),
               ...iconLinetIterator()
            ]

            {
               serverIcon.setAttribute("viewBox", "0 0 32 56")
               serverIcon.classList.add("scoring-server")
               for (const info of serverData) {
                  const icon = document.createElementNS("http://www.w3.org/2000/svg", info.type)
                  for (const [key, value] of info.values) {
                     icon.setAttribute(key, value)
                  }
                  serverIcon.append(icon)
               }
            }

            container.classList.add("hidden")
            container.classList.add("scoring-icons")
            container.append(serverIcon)
            scroringList.append(container)
         }

         asideProgressContainer.setAttribute("id", "progress")
         asideProgressContainer.classList.add("aside-block")
         progressTitle.setAttribute("id", "progress-title")
         progressTitle.innerText = "Ustabilizowane próbki"
         progressNumbers.setAttribute("id", "progress-numbers")
         progressNumbers.innerText = "0 / 1"
         asideProgressContainer.append(progressTitle, progressNumbers)

         asideLeft.append(asidePointsContainer, asideProgressContainer)
         container.append(asideLeft)
      }
      // aside right
      {
         const asideRight = document.createElement("section")
         const asideTranslationContainer = document.createElement("section")
         const translationTitle = document.createElement("div")
         const translationList = document.createElement("div")
         const translationCover = document.createElement("div")

         asideRight.classList.add("aside")
         asideRight.style.justifyContent = "center"

         asideTranslationContainer.setAttribute("id", "translation")
         asideTranslationContainer.classList.add("aside-block")
         translationTitle.innerText = "Aflabet Morse'a"
         translationTitle.setAttribute("id", "translation-title")
         translationList.setAttribute("id", "translation-list")
         this.createTranslation(translationList)
         translationCover.setAttribute("id", "translation-cover")
         translationCover.classList.add("hidden")

         asideTranslationContainer.append(translationTitle, translationList, translationCover)
         asideRight.append(asideTranslationContainer)
         container.append(asideRight)
      }

      return container
   }

   async tutorial() {
      const word = "ukenium".toUpperCase()
      await Receiver({ text: word })
      this.timer(word)
      setTimeout(() => {
         progressTracker = setInterval(async () => {
            const guessed = document.querySelectorAll(".placeholder.correct").length
            if (guessed >= word.length) clearInterval(progressTracker)
            this.playMessage(word[guessed], this.lastLetter !== word[guessed])
            this.lastLetter = word[guessed]
         }, 100)
      }, 5000)
   }

   async init() {
      if (this.userRole === "sender") {
         const container = document.createElement("dialog")
         const title = document.createElement("div")
         const name = document.createElement("input")
         const send = document.createElement("button")

         container.setAttribute("id", "round-team")

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

   playMessage(letter, force) {
      const messageLight = document.getElementById("lights-message")
      if (this.playing && !force) return
      for (const timeout of this.timeouts) {
         clearTimeout(timeout)
      }
      this.timeouts = []
      this.playing = true
      messageLight.classList.remove("on")
      const lightTimeout = setTimeout(() => {
         messageLight.classList.add("on")
      }, 400)
      this.timeouts.push(lightTimeout)
      const morseLight = document.getElementById("lights-morse")
      morseLight.classList.remove("on")
      const morseCode = MORSE_TRANSLATION_MAP.get(letter.toUpperCase())
      const blinking = []
      for (let i = 0; i < morseCode.length; i++) {
         if (morseCode[i] === "•") {
            blinking.push(250)
         } else if (morseCode[i] === "᠆") {
            blinking.push(750)
         }
      }
      let counter = 1000
      for (const time of blinking) {
         const timeout = setTimeout(() => {
            morseLight.classList.add("on")
            setTimeout(() => {
               morseLight.classList.remove("on")
            }, time)
         }, counter)
         this.timeouts.push(timeout)
         counter += time + 200
      }
      const lightTimeoutEnd = setTimeout(() => {
         messageLight.classList.remove("on")
      }, counter + 200)
      this.timeouts.push(lightTimeoutEnd)
      const endTimeout = setTimeout(() => {
         this.playing = false
      }, counter + 1000)
      this.timeouts.push(endTimeout)
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

   timer(word) {
      const time = 1000 * 10 * word.length
      const bar = document.getElementById("header-timer-bar")
      bar.style.transition = "none"
      bar.style.width = "100%"
      bar.style.backgroundImage = `repeating-linear-gradient(45deg,
            rgb(0, 229, 0) 0,
            rgba(0, 255, 0, 0.35) 8px,
            #d4000000 8px,
            transparent 16px)`

      const onePercentage = time / 100
      let currentWidth = 100
      setTimeout(() => {
         clearInterval(barInterval)
         bar.style.transition = "width 0.3s ease"
         barInterval = setInterval(() => {
            currentWidth -= 1
            bar.style.width = currentWidth + "%"
            if (currentWidth === 60) {
               bar.style.backgroundImage = `repeating-linear-gradient(45deg,
            rgb(229, 187, 0) 0,
            rgba(255, 238, 0, 0.35) 8px,
            #d4000000 8px,
            transparent 16px)`
            }
            if (currentWidth === 20) {
               bar.style.backgroundImage = `repeating-linear-gradient(45deg,
            rgb(229, 0, 0) 0,
            rgba(255, 0, 0, 0.35) 8px,
            #d4000000 8px,
            transparent 16px)`
            }
            if (currentWidth === 0) {
               clearInterval(barInterval)
            }
         }, onePercentage)
      }, 300)
   }

   async start() {
      if (this.userRole === "sender") {
         await Sender()
      } else if (this.userRole === "receiver") {
         await Receiver()
         document.querySelector(".active").focus()
      }
      const serverTime = new Date(await startTime())
      const timeDifference = new Date().getHours() - serverTime.getHours()
      const startDate = timeDifference != 0 ? serverTime.getTime() + timeDifference * 60 * 60 * 1000 : serverTime.getTime()
      timeCheckerInterval = setInterval(() => {
         const time = Date.now() - startDate - 5000
         const seconds = Math.floor(time / 1000) % 60
         const minutes = Math.floor(Math.floor(time / 1000) / 60)
         headerTimer.innerText = (minutes < 10 ? "0" + minutes : minutes) + ":" + (seconds < 10 ? "0" + seconds : seconds)
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

   createTranslation(table) {
      for (const info of MORSE_TRANSLATION) {
         const container = document.createElement("div")
         const letter = document.createElement("div")
         const morse = document.createElement("div")

         container.classList.add("translation-block")
         container.setAttribute("id", info.letter)
         letter.classList.add("letter")
         letter.innerText = info.letter
         morse.classList.add("morse")
         for (let i = 0; i < info.morse.length; i++) {
            const symbol = document.createElement("span")
            if (info.morse[i] === "•") {
               symbol.classList.add("morse-dot")
            } else if (info.morse[i] === "᠆") {
               symbol.classList.add("morse-dash")
            }
            morse.append(symbol)
         }

         container.append(letter, morse)
         table.append(container)
      }
   }

   playCurrentLetter() {
      console.log(MORSE_TRANSLATION_MAP.get(this.currentLetter.toUpperCase()));
   }
}
const waitBeforeSkip = 3000
class tutorialText {
   init() {
      this.lastSkip = Date.now()
      const container = popUp({
         x: -1, y: -1,
         width: 360,
         height: 350,
         titl: "Witaj na szkoleniu, teraz dowiesz się jak odbierać kod Morse'a",
         txt: "Kliknij 'Enter', aby przejść dalej"
      })
      this.word = "test".toUpperCase()
      const main = document.getElementById("main")
      main.append(LetterPlaceholder({
         role: "receiver",
         word: this.word,
         tutorial: { text: this.word, disable: true }
      }))
      terminalContainer.append(container)
      terminalContainer.classList.add("start-tutorial")
   }
   signal() {
      if (Date.now() - this.lastSkip < waitBeforeSkip) {
         return terminalContainer.classList.add("start-tutorial")
      }
      this.lastSkip = Date.now()
      document.getElementById("lights").style.zIndex = 4
      const container = popUp({
         x: -1, y: 100,
         width: 400,
         height: 430,
         titl: "Tutaj będzie wyświetlany sygnał od drugiego zespołu, krótki sygnał to •, a długi to ᠆",
         txt: "Świecą się czerwnona lampka oznacza, że nadawana jest litera"
      })
      document.getElementById("window-background").remove()
      terminalContainer.append(container)
      terminalContainer.classList.add("signal-tutorial")
   }
   signalTwo() {
      if (Date.now() - this.lastSkip < waitBeforeSkip) {
         return terminalContainer.classList.add("signal-tutorial")
      }
      this.lastSkip = Date.now()
      const container = popUp({
         x: -1, y: -1,
         height: 250,
         width: 360,
         titl: "Tak wygląda litera 'K' w kodzie Morse'a",
         txt: "• ᠆ •"
      })
      setTimeout(() => {
         this.tutorialSignal = setInterval(async () => {
            gameControls.playMessage("K")
         }, 500)
      }, 1000)
      document.getElementById("window-background").remove()
      terminalContainer.append(container)
      terminalContainer.classList.add("signal-two-tutorial")
   }
   mainArea() {
      if (Date.now() - this.lastSkip < waitBeforeSkip) {
         return terminalContainer.classList.add("signal-two-tutorial")
      }
      this.lastSkip = Date.now()
      clearInterval(this.tutorialSignal)
      document.getElementById("lights").style.zIndex = 0
      document.getElementById("main").style.zIndex = 4
      const container = popUp({
         x: -1, y: 500,
         height: 350,
         width: 360,
         titl: "Powyżej będą znajdować się odszyfrowane litery, które wpiszesz",
         txt: "Postaraj się to zrobić bezbłędnie i jak najszybciej"
      })
      document.getElementById("window-background").remove()
      terminalContainer.append(container)
      terminalContainer.classList.add("main-tutorial")
   }
   mainFunc() {
      for (let i = 0; i < this.word.length; i++) {
         const letter = this.word[i];
         if (document.querySelectorAll(".placeholder").length <= 0) return
         const current = document.querySelectorAll(".placeholder")[i]
         let next
         if (i + 1 < this.word.length) {
            next = document.querySelectorAll(".placeholder")[i + 1]
         }
         current.classList.remove("active")
         current.classList.remove("correct")
         current.value = ""
         if (i === 0) {
            current.classList.add("active")
         }
         if (i !== 2) {
            setTimeout(() => {
               current.value = letter
               current.classList.add("correct")
               current.classList.remove("active")
               if (i + 1 < this.word.length) {
                  next?.classList.add("active")
               }
            }, 1500 * (i + 1))
         } else {
            setTimeout(() => {
               current.value = "Z"
               current.classList.remove("ready")
               setTimeout(() => {
                  current.classList.add("ready")
               }, 100)
            }, 1500 * (i + 1))
            setTimeout(() => {
               current.value = letter
               current.classList.add("correct")
               current.classList.remove("active")
               if (i + 1 < this.word.length) {
                  next?.classList.add("active")
               }
            }, 1500 * (i + 1) + 1000)
         }
      }
   }
   mainAreaTwo() {
      if (Date.now() - this.lastSkip < waitBeforeSkip) {
         return terminalContainer.classList.add("main-tutorial")
      }
      this.lastSkip = Date.now()
      clearInterval(this.tutorialSignal)
      const container = popUp({
         x: -1, y: 500,
         height: 360,
         width: 360,
         titl: "Każda litera to osobna instrukcja dla komputera",
         txt: "Jeśli odszyfrujesz całe słowo to uda Ci się ustabilizować próbkę"
      })
      this.mainFunc()
      this.mainAnim = setInterval(() => {
         this.mainFunc()
      }, (this.word.length * 1500 + 2000))
      document.getElementById("window-background").remove()
      terminalContainer.append(container)
      terminalContainer.classList.add("main-two-tutorial")
   }
   translation() {
      if (Date.now() - this.lastSkip < waitBeforeSkip) {
         return terminalContainer.classList.add("main-two-tutorial")
      }
      this.lastSkip = Date.now()
      clearInterval(this.mainAnim)
      document.getElementById("main").innerText = ""
      document.getElementById("main").style.zIndex = 0
      document.getElementById("translation").style.zIndex = 4
      const container = popUp({
         x: -1, y: 50,
         height: 300,
         width: 360,
         titl: "Jeżeli nie znasz alfabetu Morse'a, nic nie szkodzi",
         txt: "Po prawej stronie zawsze będzie tabelka z literami"
      })
      document.getElementById("window-background").remove()
      terminalContainer.append(container)
      terminalContainer.classList.add("translation-tutorial")
   }
   overheat() {
      if (Date.now() - this.lastSkip < waitBeforeSkip) {
         return terminalContainer.classList.add("translation-tutorial")
      }
      this.lastSkip = Date.now()
      document.getElementById("translation").style.zIndex = 0
      document.getElementById("overheat").style.zIndex = 4
      const container = popUp({
         x: 50, y: 300,
         height: 400,
         width: 360,
         titl: "Każda wprowadzona przez ciebie litera obciąża serwer",
         txt: "Jeśli wpisana litera jest poprawna nic się nie stanie, ale..."
      })
      document.getElementById("window-background").remove()
      terminalContainer.append(container)
      terminalContainer.classList.add("overheat-tutorial")
   }
   overheatFunc() {
      for (let i = 0; i < document.querySelectorAll(".scoring-icons").length; i++) {
         const server = document.querySelectorAll(".scoring-icons")[i];
         server.classList.add("hidden")
         setTimeout(() => {
            server.classList.remove("hidden")
         }, 1000 * (i + 1))
      }
   }
   overheatTwo() {
      if (Date.now() - this.lastSkip < waitBeforeSkip) {
         return terminalContainer.classList.add("overheat-tutorial")
      }
      this.lastSkip = Date.now()
      const container = popUp({
         x: 50, y: 300,
         height: 500,
         width: 360,
         titl: "Jeżeli ty lub drugi zespół pomylicię się to przegrzejecie serwer",
         txt: "Przegrzanie wszystkich serwerów utrudni potem pracę ludziom na Ziemii, więc się nie pomylcie :D"
      })
      this.overheatFunc()
      this.overheatInter = setInterval(() => {
         this.overheatFunc()
      }, 4000)
      document.getElementById("window-background").remove()
      terminalContainer.append(container)
      terminalContainer.classList.add("overheat-two-tutorial")
   }
   progress() {
      if (Date.now() - this.lastSkip < waitBeforeSkip) {
         return terminalContainer.classList.add("overheat-two-tutorial")
      }
      clearInterval(this.overheatInter)
      setTimeout(() => {
         for (let i = 0; i < document.querySelectorAll(".scoring-icons").length; i++) {
            const server = document.querySelectorAll(".scoring-icons")[i];
            server.classList.add("hidden")
         }
      }, 6000)


      this.lastSkip = Date.now()
      document.getElementById("overheat").style.zIndex = 0
      document.getElementById("progress").style.zIndex = 4
      const container = popUp({
         x: 50, y: 150,
         height: 350,
         width: 360,
         titl: "Tutaj możesz zobaczyć ile próbek zostało Ci jeszcze do ustabilizowania",
         txt: "Nawet te zniszczone będą uwzględnione"
      })
      document.getElementById("window-background").remove()
      terminalContainer.append(container)
      terminalContainer.classList.add("progress-tutorial")
   }
   timeLimit() {
      if (Date.now() - this.lastSkip < waitBeforeSkip) {
         return terminalContainer.classList.add("progress-tutorial")
      }
      this.lastSkip = Date.now()
      document.getElementById("progress").style.zIndex = 0
      document.getElementById("header-timer").style.zIndex = 4
      const container = popUp({
         x: -1, y: -1,
         height: 320,
         width: 360,
         titl: "Powyżej pokazany jest aktualny stan próbki",
         txt: "Każda próbka ma osobny czas życia, ale jest on ograniczony"
      })
      document.getElementById("window-background").remove()
      terminalContainer.append(container)
      terminalContainer.classList.add("time-tutorial")
   }
   timeLimitTwo() {
      if (Date.now() - this.lastSkip < waitBeforeSkip) {
         return terminalContainer.classList.add("time-tutorial")
      }
      this.lastSkip = Date.now()
      const container = popUp({
         x: -1, y: -1,
         height: 350,
         width: 360,
         titl: "Próbka może być w trzech stanach: zielony, pomarańczowy, czerwony",
         txt: "Dopóki widać pasek, próbkę da się uratować"
      })
      gameControls.timer("t")
      this.timeInter = setTimeout(() => {
         gameControls.timer("t")
      }, 10500)
      document.getElementById("window-background").remove()
      terminalContainer.append(container)
      terminalContainer.classList.add("time-two-tutorial")
   }
   end() {
      if (Date.now() - this.lastSkip < waitBeforeSkip) {
         return terminalContainer.classList.add("time-two-tutorial")
      }
      this.lastSkip = Date.now()
      clearTimeout(this.timeInter)
      document.getElementById("header-timer").style.zIndex = 0
      const container = popUp({
         x: -1, y: -1,
         height: 400,
         width: 360,
         titl: "Teraz będziesz musiał odszyfrować słowo na próbę",
         txt: "Próbka i serwery nie są prawdziwe, więc nie przejmuj się jak nie zdążysz albo pomylisz"
      })
      document.getElementById("window-background").remove()
      terminalContainer.append(container)
      terminalContainer.classList.add("finish-tutorial")
   }
}

const gameControls = new Game()


const entryText =
   `OMNICORP INDUSTRIES (TM) TERMLINK PROTOCOL
ŁADOWANIE DZIENNIKA ZDARZEŃ...

>SET LOG/READ=INCYDENT_MGLAWICA.LOG

[T-14:32:07] KURS: PRZELOT PRZEZ MGŁAWICĘ, SEKTOR 7-G
[T-14:32:41] WYKRYTO ANOMALIĘ
[T-14:32:58] GŁÓWNY MODUŁ TRANSMISYJNY..............USZKODZONY
[T-14:33:02] POMOCNICZY MODUŁ TRANSMISYJNY..........AKTYWNY
[T-14:33:15] POZOSTAŁE SYSTEMY STATKU...............SPRAWNE

STATUS OGÓLNY: STATEK ZDOLNY DO DALSZEGO LOTU
STATUS ŁĄCZNOŚCI: OGRANICZONA (KANAŁ POMOCNICZY)

POTWIERDŹ UŻYWAJĄC "ENTER", ABY PRZEJŚĆ DALEJ
`

const tutorialLoadingText =
   `[T-15:04:22] ZEBRANO PRÓBKI MINERALNE Z REGIONU MGŁAWICY
[T-15:04:23] KLASYFIKACJA MATERIAŁU..................NIEZNANA
[T-15:04:24] BAZA DANYCH POKŁADOWA...................BRAK WYNIKU

UWAGA: PRÓBKI NIESTABILNE
DO STABILIZACJI WYMAGANA JEST NAZWA MATERIAŁU
NAZWĘ MUSI PRZESŁAĆ BAZA NA ZIEMI

GŁÓWNY MODUŁ USZKODZONY - TRANSMISJA GŁOSOWA NIEDOSTĘPNA
JEDYNY AKTYWNY KANAŁ: TRANSMISJA KODEM MORSE'A (MODUŁ POMOCNICZY)
   
[T-15:04:25] SPRAWDZANIE UPRAWNIEŃ UŻYTKOWNIKA.............OK
[T-15:04:26] ANALIZA PRZESZKOLENIA UŻYTKOWNIKA.............BŁĄD

WYSTĄPIŁ BŁĄÐ PODCZAS ANALIZY UMIEJĘTNOŚCI
ZE WZGLĘDU NA BRAK INFORMACJI UŻYTKOWNIK MUSI PRZEJŚĆ SZKOLENIE

>USE FILES/READ=SZKOLENIE.EXE

[T-15:04:30] ŁADOWANIE PROGRAMU SZKOLENIE.EXE.............OK
[T-15:04:32] WGRYWANIE PROGRAMU DO PAMIĘCI................OK

POTWIERDŹ UŻYWAJĄC "ENTER", ABY ROZPOCZĄĆ SZKOLENIE
`

const terminalContainer = document.getElementById("content")
const cursor = document.createElement("span");
cursor.className = "cursor";
let typeTimer = null;

function startTyping(text, checkpointClass, timeout = 500, speed = 20) {
   clearTimeout(typeTimer);
   terminalContainer.textContent = "";
   let i = 0;
   setTimeout(() => {
      (function type() {
         terminalContainer.textContent = text.slice(0, i);
         terminalContainer.append(cursor);
         if (i++ < text.length) {
            typeTimer = setTimeout(type, 18 + Math.random() * speed)
         } else {
            terminalContainer.classList.add(checkpointClass)
         }
      })();
   }, timeout)

}



const screen = document.getElementById("screen")
const afterglow = document.getElementById("afterglow");
let isOn = false;
let busy = false;

function onAnimEnd(name, cb) {
   function handler(e) {
      if (e.animationName !== name) return;
      screen.removeEventListener("animationend", handler);
      cb();
   }
   screen.addEventListener("animationend", handler);
}

function powerTerminal(onStart) {
   if (busy) return;
   busy = true;

   if (isOn) {
      // turning off
      clearTimeout(typeTimer);
      screen.classList.remove("powering-on");
      screen.classList.add("powering-off");

      onAnimEnd("powerOff", () => {
         screen.classList.remove("powering-off");
         screen.classList.add("crt-off");
         afterglow.classList.remove("show");
         void afterglow.offsetWidth; // restart animation
         afterglow.classList.add("show");
         isOn = false;
         busy = false;
      });
   } else {
      // turning on
      afterglow.classList.remove("show");
      screen.classList.remove("crt-off");
      screen.classList.add("powering-on");

      onAnimEnd("powerOn", () => {
         screen.classList.remove("powering-on");
         isOn = true;
         busy = false;
         if (onStart) onStart()
      });
   }
}
const tutorialControler = new tutorialText()
const allEvents = new Map([
   ["ready-lore", () => {
      terminalContainer.classList.remove("ready-lore")
      startTyping(tutorialLoadingText, "ready-tutorial")
   }],
   ["ready-tutorial", () => {
      terminalContainer.classList.remove("ready-tutorial")
      powerTerminal()

      setTimeout(async () => {
         terminalContainer.innerText = ""
         powerTerminal()
         await gameControls.role("receiver")
         terminalContainer.append(await gameControls.layout())
         tutorialControler.init()
         // if (await gameStarted()) {
         //    await gameControls.start()
         // } else {
         //    await gameControls.init()
         // }
      }, 2000)
   }],
   ["start-tutorial", () => {
      terminalContainer.classList.remove("start-tutorial")
      tutorialControler.signal()
   }],
   ["signal-tutorial", () => {
      terminalContainer.classList.remove("signal-tutorial")
      tutorialControler.signalTwo()
   }],
   ["signal-two-tutorial", () => {
      terminalContainer.classList.remove("signal-two-tutorial")
      tutorialControler.mainArea()
   }],
   ["main-tutorial", () => {
      terminalContainer.classList.remove("main-tutorial")
      tutorialControler.mainAreaTwo()
   }],
   ["main-two-tutorial", () => {
      terminalContainer.classList.remove("main-two-tutorial")
      tutorialControler.translation()
   }],
   ["translation-tutorial", () => {
      terminalContainer.classList.remove("translation-tutorial")
      tutorialControler.overheat()
   }],
   ["overheat-tutorial", () => {
      terminalContainer.classList.remove("overheat-tutorial")
      tutorialControler.overheatTwo()
   }],
   ["overheat-two-tutorial", () => {
      terminalContainer.classList.remove("overheat-two-tutorial")
      tutorialControler.progress()
   }],
   ["progress-tutorial", () => {
      terminalContainer.classList.remove("progress-tutorial")
      tutorialControler.timeLimit()
   }],
   ["time-tutorial", () => {
      terminalContainer.classList.remove("time-tutorial")
      tutorialControler.timeLimitTwo()
   }],
   ["time-two-tutorial", () => {
      terminalContainer.classList.remove("time-two-tutorial")
      tutorialControler.end()
   }],
   ["finish-tutorial", async () => {
      terminalContainer.classList.remove("finish-tutorial")
      document.getElementById("window-background").remove()
      await gameControls.tutorial()
      // if (await gameStarted()) {
      //    await gameControls.start()
      // } else {
      //    await gameControls.init()
      // }
      setTimeout(() => {
         document.getElementById("loading-screen").classList.add("hidden")
         setTimeout(() => {
            document.getElementById("loading-screen").remove()
         }, 1000)
      }, 1000)
   }],
   ["end-tutorial", () => {
      terminalContainer.classList.remove("end-tutorial")
      powerTerminal()

      // setTimeout(async () => {
      //    terminalContainer.innerText = ""
      //    powerTerminal()
      //    await gameControls.role("sender")
      //    terminalContainer.append(await gameControls.layout())
      //    await gameControls.tutorial()
      //    // if (await gameStarted()) {
      //    //    await gameControls.start()
      //    // } else {
      //    //    await gameControls.init()
      //    // }
      //    document.getElementById("loading-screen").classList.add("hidden")
      //    setTimeout(() => {
      //       document.getElementById("loading-screen").remove()
      //    }, 1000)
      // }, 2000)
   }],
])
window.addEventListener("keypress", (e) => {
   if (e.code === "Enter") {
      if (document.getElementById("start") && !document.getElementById("start").classList.contains("hide")) {
         document.getElementById("start").classList.add("hide")
         setTimeout(() => {
            document.getElementById("start").remove()
         }, 2000)
         setTimeout(() => {
            powerTerminal(() => { startTyping(entryText, "ready-lore") })
         }, 3000)
      }
      const action = allEvents.get(terminalContainer.classList[0])
      if (action) action()
      if (document.getElementById("round-title") && !document.getElementById("round-team")) {
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
   }

})
