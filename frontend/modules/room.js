import {
   role, sentence, verifyGuess, senderGuess, skips,
   startTime, errors, isReady, finish, progress, restart, saveWordTime, teamName
} from "./api.js"

const terminalContainer = document.getElementById("content")
const HUMAN_SPEED = 50 //ms
const TIME_PER_LETTER_SECONDS = 20
const MORSE_TRANSLATION = [
   { letter: "A", morse: "•᠆" },
   { letter: "B", morse: "᠆•••" },
   { letter: "C", morse: "᠆•᠆•" },
   { letter: "D", morse: "᠆••" },
   { letter: "E", morse: "•" },
   { letter: "F", morse: "••᠆•" },
   { letter: "G", morse: "᠆᠆•" },
   { letter: "H", morse: "••••" },
   { letter: "I", morse: "••" },
   { letter: "J", morse: "•᠆᠆᠆" },
   { letter: "K", morse: "᠆•᠆" },
   { letter: "L", morse: "•᠆••" },
   { letter: "M", morse: "᠆᠆" },
   { letter: "N", morse: "᠆•" },
   { letter: "O", morse: "᠆᠆᠆" },
   { letter: "P", morse: "•᠆᠆•" },
   { letter: "Q", morse: "᠆᠆•᠆" },
   { letter: "R", morse: "•᠆•" },
   { letter: "S", morse: "•••" },
   { letter: "T", morse: "᠆" },
   { letter: "U", morse: "••᠆" },
   { letter: "V", morse: "•••᠆" },
   { letter: "W", morse: "•᠆᠆" },
   { letter: "X", morse: "᠆••᠆" },
   { letter: "Y", morse: "᠆•᠆᠆" },
   { letter: "Z", morse: "᠆᠆••" },
]
const MORSE_TRANSLATION_MAP = new Map(MORSE_TRANSLATION.map((el) => [el.letter, el.morse]))
const ROLES = Object.freeze({
   SENDER: "sender",
   RECEIVER: "receiver"
})
const TIMINGS = Object.freeze({
   DOT: 325,
   DASH: 1000,
   PAUSE: 250,
})
const USER_ROLE = await role()
let secondPlayerProgress = null
let wordsLengths = null
let previousWordsLength = null



const READY_TIMER = 1000 * 10
const TIME_BEFORE_SKIP_TUTORIAL = 3000
const BASIC_TYPING_SPEED = 18
const MULTI_TYPING_SPEED = 20


const CURRENT_STAGE = await skips(0)
if (CURRENT_STAGE === 1) {
   terminalContainer.classList.add("ready-tutorial")
} else if (CURRENT_STAGE === 2) {
   terminalContainer.classList.add("end-tutorial")
} else if (CURRENT_STAGE === 3) {
   terminalContainer.classList.add("start-game")
}

const currentLetterIndex = { ready: true, letter: 0, word: 0 }
let MAX_LENGTH
let AMOUNT_OF_WORDS

let timeHoldingSpace = null
let isTransmitting = false
let blockInput = false

let progressTracker
let errorTracker
let errorIndicatorTimeout
let clearBadSender
let barInterval
let lastBadInput = 0

function fillPaper() {
   if (USER_ROLE === ROLES.RECEIVER) {
      const text = ["Enter - zatwierdź", "Backspace - usuń"]
      for (let i = 0; i < text.length; i++) {
         const t = document.createElement("p")
         t.innerText = text[i]
         document.querySelector(".paper").append(t)
      }
   } else if (USER_ROLE === ROLES.SENDER) {
      const text = ["Zielony - zatwierdź", "Czerwony - usuń"]
      for (let i = 0; i < text.length; i++) {
         const t = document.createElement("p")
         t.innerText = text[i]
         document.querySelector(".paper").append(t)
      }
   }
}
fillPaper()

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

function LetterPlaceholder({ word, tutorial = undefined } = {}) {
   const container = document.createElement("section")
   container.setAttribute("id", "word")
   if (USER_ROLE === ROLES.SENDER) {
      const pointer = document.createElementNS("http://www.w3.org/2000/svg", "svg")
      const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline")
      pointer.setAttribute("id", "word-pointer")
      pointer.setAttribute("viewBox", "0 0 12 12")
      polyline.setAttribute("points", "0,12 6,0 12,12")
      polyline.classList.add("word-pointer-polyline")
      pointer.append(polyline)
      container.append(pointer)
   }
   for (let i = 0; i < word.length; i++) {
      const input = document.createElement("input")
      input.classList.add("placeholder", "ready")
      input.placeholder = USER_ROLE === ROLES.SENDER ? word[i].toUpperCase() : ""

      input.addEventListener("focus", (e) => {
         input.classList.remove("active")
         if (currentLetterIndex.letter != i || blockInput) return input.blur()
         input.classList.add("active")
         if (USER_ROLE === ROLES.SENDER || tutorial?.disable) return input.blur()
      })
      input.addEventListener("blur", (e) => {
         if (USER_ROLE === ROLES.SENDER || tutorial?.disable) return
         input.classList.remove("active")
         if (currentLetterIndex.letter === i && !blockInput) {
            return input.focus()
         }
      })
      input.addEventListener("input", async (e) => {
         input.value = input.value.toUpperCase()
         if (!input.value.match(/[A-Z]/g)) return input.value = ""
         if (Date.now() - lastBadInput < 1100) return input.value = ""
         if (blockInput) { input.blur(); return input.value = "" }
         const value = input.value
         const letter = value.slice(-1)
         if (value.length <= 0) {
            return
         }
         if (value.length > 1) {
            input.value = letter
         }
         if (!currentLetterIndex.ready) return
         const result = await onLetterInput(USER_ROLE, letter, word, tutorial)
         clearTimeout(clearBadSender)
         if (result) {
            input.classList.add("correct")
            input.classList.remove("active")
            input.value = letter
            input.blur()
            if (USER_ROLE === ROLES.SENDER && tutorial) {
               setTimeout(() => {
                  const pointer = document.getElementById("word-pointer")
                  pointer.style.left = `${30 + currentLetterIndex.letter * (60 + 10) - 8}px`
               }, 1000)
            }
            if (document.getElementById("word") && currentLetterIndex.letter < MAX_LENGTH && (USER_ROLE === ROLES.SENDER || tutorial)) {
               document.querySelectorAll(".placeholder")[currentLetterIndex.letter].focus()
            }
            document.querySelectorAll(".placeholder")[0].classList.remove("active")
         } else {
            lastBadInput = Date.now()
            input.classList.remove("ready")
            clearTimeout(errorIndicatorTimeout)
            errorIndicatorTimeout = setTimeout(() => {
               input.classList.add("ready")
            }, 100)
            if (role === ROLES.SENDER) {
               clearBadSender = setTimeout(() => {
                  input.value = ""
               }, 1500)
            }
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

async function endGame() {
   clearInterval(progressTracker)
   clearInterval(errorTracker)
   if (USER_ROLE === ROLES.RECEIVER) {
      const container = popUp({
         x: -1, y: -1,
         width: 360,
         height: 350,
         titl: "Wpisz nazwę drużyny",
         txt: ""
      })
      terminalContainer.append(container)
      const inp = document.createElement("input")
      const btn = document.createElement("button")
      btn.innerText = "Prześlij"
      document.getElementById("window").children[1].append(inp, btn)
      btn.addEventListener("click", async () => {
         teamName(inp.value)
         const data = await finish()
         const container = popUp({
            x: -1, y: -1,
            width: 360,
            height: 350,
            titl: data.in_time ? "Gratulacje, uratowaliście wszystkie próbki" : "Niestety nie udało się uratować wszystkich próbek",
            txt: data.no_errors ? "Nie przegrzaliście wszystkich serwerów!" : "Wszystkie serwery zostały przegrzane :(",
         })
         terminalContainer.append(container)
         terminalContainer.classList.add("end-game")
      })
   } else if (USER_ROLE === ROLES.SENDER) {
      const data = await finish()
      const container = popUp({
         x: -1, y: -1,
         width: 360,
         height: 350,
         titl: data.in_time ? "Gratulacje, uratowaliście wszystkie próbki" : "Niestety nie udało się uratować wszystkich próbek",
         txt: data.no_errors ? "Nie przegrzaliście wszystkich serwerów!" : "Wszystkie serwery zostały przegrzane :(",
      })
      terminalContainer.append(container)
      terminalContainer.classList.add("end-game")
   }
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
   terminalContainer.classList.add("end-tutorial")
   if (CURRENT_STAGE < 2) skips(2);
}

function finishWord(cb) {
   clearInterval(barInterval)
   const main = document.getElementById("main")
   const word = document.getElementById("word")
   if (word) word.style.opacity = 0
   const correctMark = document.createElementNS("http://www.w3.org/2000/svg", "svg")
   const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline")
   correctMark.setAttribute("id", "main-mark")
   correctMark.setAttribute("viewBox", "0 0 12 12")
   polyline.setAttribute("points", "1,6 3,11 5,11 11,1 9,1 4,8 2,6 1,6")
   polyline.classList.add("main-mar-polyline")
   correctMark.append(polyline)
   correctMark.style.width = 0
   correctMark.style.height = 0
   setTimeout(() => {
      main.innerText = ""
      main.append(correctMark)
      document.getElementById("progress-numbers").innerText = `${currentLetterIndex.word} / ${AMOUNT_OF_WORDS}`
      correctMark.style.width = `${128}px`
      correctMark.style.height = `${128}px`
      setTimeout(() => {
         cb()
      }, 1000)
   }, 1250)
}

class Game {
   constructor() {
      this.timeouts = []
   }

   getTimeouts() {
      return this.timeouts
   }

   async start() {
      clearInterval(progressTracker)
      this.words = (await sentence()).split(" ")
      AMOUNT_OF_WORDS = this.words.length
      this.serverTime = await startTime()
      this.countdown()
      const playersProgress = await progress()
      let sumOfWords = 0
      currentLetterIndex.word = 0
      currentLetterIndex.letter = 0
      currentLetterIndex.ready = true
      while (playersProgress[USER_ROLE] > sumOfWords) {
         if (sumOfWords + this.words[currentLetterIndex.word].length <= playersProgress[USER_ROLE]) {
            sumOfWords += this.words[currentLetterIndex.word].length
            currentLetterIndex.word += 1
         } else {
            currentLetterIndex.letter = playersProgress[USER_ROLE] - sumOfWords
            sumOfWords += currentLetterIndex.letter
         }
      }
      wordsLengths = this.words.slice(0, currentLetterIndex.word).map((el) => el.length)
      previousWordsLength = wordsLengths.length > 0 ? wordsLengths.reduce((a, b) => a + b) : 0
      secondPlayerProgress = (await progress())[USER_ROLE === ROLES.SENDER ? ROLES.RECEIVER : ROLES.SENDER]

      setTimeout(async () => {
         await this.round()
      }, this.serverTime - Date.now() > 0 ? this.serverTime - Date.now() : 0)

      progressTracker = setInterval(async () => {
         wordsLengths = this.words.slice(0, currentLetterIndex.word).map((el) => el.length)
         previousWordsLength = wordsLengths.length > 0 ? wordsLengths.reduce((a, b) => a + b) : 0
         secondPlayerProgress = (await progress())[USER_ROLE === ROLES.SENDER ? ROLES.RECEIVER : ROLES.SENDER]

         // moves pointer on sender
         if (USER_ROLE === ROLES.SENDER && document.getElementById("word-pointer")) {
            const pointer = document.getElementById("word-pointer")
            const fromLeft = (secondPlayerProgress - previousWordsLength >= 0 ? secondPlayerProgress - previousWordsLength : secondPlayerProgress - previousWordsLength + this.words[currentLetterIndex.word - 1].length)
            if (currentLetterIndex.word === AMOUNT_OF_WORDS) {
               pointer.style.left = `${30 + (fromLeft > this.words[currentLetterIndex.word - 1].length ? this.words[currentLetterIndex.word - 1].length : fromLeft) * (60 + 10) - 8}px`
            } else {
               const previous = (secondPlayerProgress < previousWordsLength && currentLetterIndex.letter === 0 ? true : false)
               pointer.style.left = `${30 + (fromLeft > this.words[previous ? currentLetterIndex.word - 1 : currentLetterIndex.word].length ? this.words[previous ? currentLetterIndex.word - 1 : currentLetterIndex.word].length : fromLeft) * (60 + 10) - 8}px`
            }

         }

         // displays letters with light on receiver
         if (USER_ROLE === ROLES.RECEIVER) {
            if (secondPlayerProgress > previousWordsLength + currentLetterIndex.letter) {
               blockInput = false
               const letter = this.words[currentLetterIndex.word][currentLetterIndex.letter]
               this.playMessage(letter, this.lastLetter !== letter)
               this.lastLetter = letter
               if (document.querySelectorAll(".placeholder").length > 0) {
                  document.querySelectorAll(".placeholder")[currentLetterIndex.letter].focus()
               }
            } else {
               blockInput = true
            }
         }
      }, 1000)

      const overheatIcons = document.querySelectorAll(".scoring-icons")
      errorTracker = setInterval(async () => {
         const mistakes = await errors()
         for (let i = 0; i < mistakes; i++) {
            overheatIcons[i].classList.remove("hidden")
         }
         if (mistakes > 2) {
            clearInterval(errorTracker)
         }
      }, 1000)
   }

   async round() {
      this.serverTime = await startTime()
      document.getElementById("progress-numbers").innerText = `${currentLetterIndex.word} / ${AMOUNT_OF_WORDS}`
      await this.mainBuilder()
      if (currentLetterIndex.letter !== 0 || currentLetterIndex.word !== 0) {
         this.rejoinFill()
      }
      if (USER_ROLE === ROLES.SENDER) {
         this.senderEvents()
      }
   }

   rejoinFill() {
      const previous = (secondPlayerProgress < previousWordsLength && currentLetterIndex.letter === 0 ? true : false)
      const word = this.words[previous ? currentLetterIndex.word - 1 : currentLetterIndex.word]
      const allPlaceholders = document.querySelectorAll(".placeholder")
      document.getElementById("progress-numbers").innerText = `${previous ? currentLetterIndex.word - 1 : currentLetterIndex.word} / ${AMOUNT_OF_WORDS}`
      for (let i = 0; i < (previous ? this.words[currentLetterIndex.word - 1].length : currentLetterIndex.letter); i++) {
         const node = allPlaceholders[i];
         node.value = word[i].toUpperCase()
         node.classList.add("correct")
         node.classList.remove("active")
      }
      if (!previous) return
      const checkIfNextWord = setInterval(() => {
         if (secondPlayerProgress === previousWordsLength) {
            finishWord(() => {
               gameControls.round()
            })
            clearInterval(checkIfNextWord)
         }
      }, 500)
   }

   handleKeyDown(e) {
      if ((secondPlayerProgress < previousWordsLength && currentLetterIndex.letter === 0 ? true : false)) return
      if (blockInput) return
      if (document.querySelectorAll(".placeholder").length <= 0) return
      const inputBar = document.getElementById("lights-message-display")
      if (!inputBar) return
      const inputLength = inputBar.children.length
      if (inputLength > 4 && e.code !== "Backspace") return
      const lightProbe = document.getElementById("lights-morse")
      if (!isTransmitting && e.code === "Space") {
         isTransmitting = true
         timeHoldingSpace = Date.now()
         lightProbe.classList.add("on")
      }
   }

   handleKeyUp(e) {
      if ((secondPlayerProgress < previousWordsLength && currentLetterIndex.letter === 0 ? true : false)) return
      if (blockInput) return
      if (document.querySelectorAll(".placeholder").length <= 0) return
      const inputBar = document.getElementById("lights-message-display")
      if (!inputBar) return
      const inputLength = inputBar.children.length
      if (inputLength > 4 && e.code !== "Backspace") return
      const lightProbe = document.getElementById("lights-morse")
      isTransmitting = false
      if (e.code === "Backspace") {
         if (inputLength - 1 <= 0) {
            for (const node of document.getElementById("translation-list").children) {
               node.classList.remove("hide")
            }
            inputBar.children[0].remove()
            return
         }
         inputBar.children[inputLength - 1].remove()
      }

      let morseForSearch = ""
      for (const child of inputBar.children) {
         if (child.classList.contains("morse-dot")) {
            morseForSearch += "•"
         } else if (child.classList.contains("morse-dash")) {
            morseForSearch += "᠆"
         }
      }

      if (e.code === "Space") {
         lightProbe.classList.remove("on")
         if (Date.now() - timeHoldingSpace <= HUMAN_SPEED) return

         if (Date.now() - timeHoldingSpace > TIMINGS.DOT) {
            const dash = document.createElement("div")
            dash.classList.add("morse-dash")
            inputBar.append(dash)
            morseForSearch += "᠆"
         } else {
            const dot = document.createElement("div")
            dot.classList.add("morse-dot")
            inputBar.append(dot)
            morseForSearch += "•"
         }
      }
      if (e.code === "Enter") {
         const activeDiv = document.querySelectorAll(".placeholder")[currentLetterIndex.letter]
         activeDiv.value = MORSE_TRANSLATION.filter((el) => el.morse.trim() === morseForSearch.trim())[0]?.letter ?? ""
         const event = new Event('input', {
            bubbles: true,
         })
         activeDiv.dispatchEvent(event)
         inputBar.innerText = ""
         morseForSearch = ""
      }

      const allMatches = MORSE_TRANSLATION.filter((el) => el.morse.trim().slice(0, morseForSearch.trim().length) === morseForSearch.trim())
      const allCounterMatches = MORSE_TRANSLATION.filter((el) => el.morse.trim().slice(0, morseForSearch.trim().length) != morseForSearch.trim())
      for (const id of allCounterMatches) {
         document.getElementById(id.letter).classList.add("hide")
      }
      for (const id of allMatches) {
         document.getElementById(id.letter).classList.remove("hide")
      }
   }

   senderEvents() {
      window.removeEventListener("keydown", this.handleKeyDown)
      window.addEventListener("keydown", this.handleKeyDown)
      window.removeEventListener("keyup", this.handleKeyUp)
      window.addEventListener("keyup", this.handleKeyUp)
   }

   async mainBuilder(tutorial) {
      if (AMOUNT_OF_WORDS === currentLetterIndex.word && !tutorial) {
         finishWord(endGame)
      }
      const word = tutorial?.text ?? (secondPlayerProgress < previousWordsLength && currentLetterIndex.letter === 0 ? this.words[currentLetterIndex.word - 1] : this.words[currentLetterIndex.word])

      MAX_LENGTH = word.length
      document.getElementById("main").innerText = ""
      document.getElementById("main").append(LetterPlaceholder({
         word,
         tutorial
      }))
      this.timer(word)
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
         const lights = document.createElement("div")
         const title = document.createElement("div")
         const morseContainer = document.createElement("div")
         const messageContainer = document.createElement("div")
         title.setAttribute("id", "lights-title")
         lights.setAttribute("id", "lights")
         lights.classList.add("aside-block")
         morseContainer.setAttribute("id", "lights-morse")
         lights.append(title, messageContainer, morseContainer)
         footerContainer.append(lights)
         if (USER_ROLE === ROLES.RECEIVER) {
            lights.style.width = "180px"
            title.innerText = "Sygnał"
            messageContainer.setAttribute("id", "lights-message")
         } else if (USER_ROLE === ROLES.SENDER) {
            lights.style.width = "250px"
            title.innerText = "Nadawanie"
            messageContainer.setAttribute("id", "lights-message-display")
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
         progressNumbers.innerText = "0 / ?"
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

         asideRight.classList.add("aside")
         asideRight.style.justifyContent = "center"

         asideTranslationContainer.setAttribute("id", "translation")
         asideTranslationContainer.classList.add("aside-block")
         translationTitle.innerText = "Aflabet Morse'a"
         translationTitle.setAttribute("id", "translation-title")
         translationList.setAttribute("id", "translation-list")
         this.createTranslation(translationList)

         asideTranslationContainer.append(translationTitle, translationList)
         asideRight.append(asideTranslationContainer)
         container.append(asideRight)
      }

      return container
   }

   async playTutorial() {
      const word = "ee".toUpperCase()
      AMOUNT_OF_WORDS = 1
      await this.mainBuilder({ text: word })
      document.querySelectorAll(".placeholder")[0].focus()
      document.getElementById("progress-numbers").innerText = `${currentLetterIndex.word} / 1`
      if (USER_ROLE === ROLES.RECEIVER) {
         setTimeout(() => {
            progressTracker = setInterval(async () => {
               if (currentLetterIndex.letter >= word.length) return clearInterval(progressTracker)
               const letter = word[currentLetterIndex.letter]
               this.playMessage(letter, this.lastLetter !== letter)
               this.lastLetter = letter
            }, 100)
         }, 5000)
      }
      if (USER_ROLE === ROLES.SENDER) {
         this.senderEvents()
      }
   }

   playMessage(letter, force) {
      if (!document.getElementById("lights-message")) return
      const messageLight = document.getElementById("lights-message")
      if (this.playing && !force) return
      messageLight.classList.remove("on")
      this.playing = true
      for (const timeout of this.timeouts) {
         messageLight.classList.remove("on")
         clearTimeout(timeout)
         this.timeouts = this.timeouts.filter((el) => el != timeout)
      }
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
            blinking.push(TIMINGS.DOT)
         } else if (morseCode[i] === "᠆") {
            blinking.push(TIMINGS.DASH)
         }
      }
      let counter = 1000
      for (const time of blinking) {
         const timeout = setTimeout(() => {
            morseLight.classList.add("on")
         }, counter)
         const a = setTimeout(() => {
            morseLight.classList.remove("on")
         }, counter + time)
         this.timeouts.push(a)
         this.timeouts.push(timeout)
         counter += time + TIMINGS.PAUSE
      }
      const lightTimeoutEnd = setTimeout(() => {
         messageLight.classList.remove("on")
      }, counter + TIMINGS.PAUSE)
      this.timeouts.push(lightTimeoutEnd)
      const endTimeout = setTimeout(() => {
         this.playing = false
      }, counter + 1000)
      this.timeouts.push(endTimeout)
   }

   countdown() {
      const endTime = this.serverTime - 1000 * 2
      const timer = setInterval(async () => {
         const time = endTime - Date.now()
         if (time <= 0) {
            clearInterval(timer)
            setTimeout(() => {
               document.getElementById("loading-screen").classList.add("hidden")
               setTimeout(() => {
                  document.getElementById("loading-screen").remove()
               }, 1000)
            }, 1000)
            return document.getElementById("window-background").remove()
         }
         const seconds = Math.floor(time / 1000) % 60
         document.getElementById("window").children[0].innerText = "Odliczanie do rozpoczęcia"
         document.getElementById("window").children[1].innerText = seconds
      }, 200)
   }

   timer(word) {
      const time = 1000 * TIME_PER_LETTER_SECONDS * word.length
      const bar = document.getElementById("header-timer-bar")
      bar.style.transition = "none"
      bar.style.width = "100%"

      const onePercentage = time / 100
      const substractTime = (this.serverTime > 0 ? Math.ceil((this.serverTime - Date.now()) / time * 100) : 0) < -100 ? -100 : (this.serverTime > 0 ? Math.ceil((this.serverTime - Date.now()) / time * 100) : 0)
      let currentWidth = 100 + substractTime
      clearInterval(barInterval)
      {
         if (currentWidth > 0) currentWidth -= 1
         bar.style.width = currentWidth + "%"
         if (currentWidth > 60) {
            bar.style.backgroundImage = `repeating-linear-gradient(45deg,
            rgb(0, 229, 0) 0,
            rgba(0, 255, 0, 0.35) 8px,
            #d4000000 8px,
            transparent 16px)`
         }
         else if (currentWidth <= 60 && currentWidth > 20) {
            bar.style.backgroundImage = `repeating-linear-gradient(45deg,
            rgb(229, 187, 0) 0,
            rgba(255, 238, 0, 0.35) 8px,
            #d4000000 8px,
            transparent 16px)`
         }
         else if (currentWidth <= 20) {
            bar.style.backgroundImage = `repeating-linear-gradient(45deg,
               rgb(229, 0, 0) 0,
               rgba(255, 0, 0, 0.35) 8px,
               #d4000000 8px,
               transparent 16px)`
         }
         if (currentWidth <= 0) {
            clearInterval(barInterval)
         }
      }
      bar.style.transition = "width 0.3s ease"
      barInterval = setInterval(() => {
         if (currentWidth > 0) currentWidth -= 1
         bar.style.width = currentWidth + "%"
         if (currentWidth > 60) {
            bar.style.backgroundImage = `repeating-linear-gradient(45deg,
            rgb(0, 229, 0) 0,
            rgba(0, 255, 0, 0.35) 8px,
            #d4000000 8px,
            transparent 16px)`
         }
         else if (currentWidth <= 60 && currentWidth > 20) {
            bar.style.backgroundImage = `repeating-linear-gradient(45deg,
            rgb(229, 187, 0) 0,
            rgba(255, 238, 0, 0.35) 8px,
            #d4000000 8px,
            transparent 16px)`
         }
         else if (currentWidth <= 20) {
            bar.style.backgroundImage = `repeating-linear-gradient(45deg,
               rgb(229, 0, 0) 0,
               rgba(255, 0, 0, 0.35) 8px,
               #d4000000 8px,
               transparent 16px)`
         }
         if (currentWidth <= 0) {
            clearInterval(barInterval)
         }
      }, onePercentage)

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
}
class tutorialText {
   clearTimeouts() {
      for (const timeout of this.timeouts) {
         clearTimeout(timeout)
      }
      this.timeouts = []
   }
   init() {
      this.timeouts = []
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
         word: this.word,
         tutorial: { text: this.word, disable: true }
      }))
      terminalContainer.append(container)
      terminalContainer.classList.add("start-tutorial")
   }
   signal() {
      if (Date.now() - this.lastSkip < TIME_BEFORE_SKIP_TUTORIAL) {
         return terminalContainer.classList.add("start-tutorial")
      }
      this.lastSkip = Date.now()
      document.getElementById("lights").style.zIndex = 4
      const container = popUp({
         x: -1, y: 100,
         width: 400,
         height: USER_ROLE === ROLES.RECEIVER ? 430 : 400,
         ...(USER_ROLE === ROLES.RECEIVER ?
            {
               titl: "Tutaj będzie wyświetlany sygnał od drugiego zespołu, krótki sygnał to •, a długi to ᠆",
               txt: "Świecą się czerwnona lampka oznacza, że nadawana jest litera"
            }
            :
            {
               titl: "Twoim zadaniem jest nadać wiadomość do stacji",
               txt: "Każda litera jest wysyłana osobno i dopiero po zatwierdzeniu przez ciebie"
            })

      })
      document.getElementById("window-background").remove()
      terminalContainer.append(container)
      terminalContainer.classList.add("signal-tutorial")
   }
   singalFunc() {
      this.timeouts = []
      const morseDisplay = document.getElementById("lights-message-display")
      const morseLight = document.getElementById("lights-morse")
      morseDisplay.innerText = ""
      const a = setTimeout(() => {
         morseLight.classList.add("on")
         const a = setTimeout(() => {
            morseLight.classList.remove("on")
            const dot = document.createElement("div")
            dot.classList.add("morse-dot")
            morseDisplay.append(dot)
            const a = setTimeout(() => {
               morseLight.classList.add("on")
               const a = setTimeout(() => {
                  morseLight.classList.remove("on")
                  const dash = document.createElement("div")
                  dash.classList.add("morse-dash")
                  morseDisplay.append(dash)
                  const a = setTimeout(() => {
                     morseLight.classList.add("on")
                     const a = setTimeout(() => {
                        morseLight.classList.remove("on")
                        const dot = document.createElement("div")
                        dot.classList.add("morse-dot")
                        morseDisplay.append(dot)
                     }, TIMINGS.DOT)
                     this.timeouts.push(a)
                  }, TIMINGS.PAUSE)
                  this.timeouts.push(a)
               }, TIMINGS.DASH)
               this.timeouts.push(a)
            }, TIMINGS.PAUSE)
            this.timeouts.push(a)
         }, TIMINGS.DOT)
         this.timeouts.push(a)
      }, 1000)
      this.timeouts.push(a)
   }
   signalTwo() {
      if (Date.now() - this.lastSkip < TIME_BEFORE_SKIP_TUTORIAL) {
         return terminalContainer.classList.add("signal-tutorial")
      }
      this.lastSkip = Date.now()
      const container = popUp({
         x: -1, y: USER_ROLE === ROLES.RECEIVER ? -1 : 100,
         height: USER_ROLE === ROLES.RECEIVER ? 250 : 500,
         width: 360,
         ...(USER_ROLE === ROLES.RECEIVER ?
            {
               titl: "Tak wygląda litera 'K' w kodzie Morse'a",
               txt: "᠆ • ᠆"
            }
            :
            {
               titl: "Możesz nadawać długie lub krótkie sygnały w zależności od tego jak długo przytrzymasz klucz",
               txt: "Zielony przycisk wysyła literę, czerwony przycisk usuwa ostanią kropkę lub kreskę"
            })
      })
      if (USER_ROLE === ROLES.RECEIVER) {
         progressTracker = setInterval(() => {
            gameControls.playMessage("K")
         }, 500)
      } else if (USER_ROLE === ROLES.SENDER) {
         this.singalFunc()
         progressTracker = setInterval(() => {
            this.singalFunc()
         }, 1000 + 1000 + TIMINGS.DASH + TIMINGS.DOT * 2)
      }

      document.getElementById("window-background").remove()
      terminalContainer.append(container)
      terminalContainer.classList.add("signal-two-tutorial")
   }
   mainArea() {
      if (Date.now() - this.lastSkip < TIME_BEFORE_SKIP_TUTORIAL) {
         return terminalContainer.classList.add("signal-two-tutorial")
      }
      this.lastSkip = Date.now()
      clearInterval(progressTracker)
      this.clearTimeouts()
      document.getElementById("lights").style.zIndex = 0
      document.getElementById("main").style.zIndex = 4
      const container = popUp({
         x: -1, y: 470,
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
      this.timeouts = []
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
            const a = setTimeout(() => {
               current.value = letter
               current.classList.add("correct")
               current.classList.remove("active")
               if (i + 1 < this.word.length) {
                  next?.classList.add("active")
               }
            }, 1500 * (i + 1))
            this.timeouts.push(a)
         } else {
            const a = setTimeout(() => {
               current.value = "Z"
               current.classList.remove("ready")
               const a = setTimeout(() => {
                  current.classList.add("ready")
               }, 100)
               this.timeouts.push(a)
            }, 1500 * (i + 1))
            this.timeouts.push(a)
            const b = setTimeout(() => {
               current.value = letter
               current.classList.add("correct")
               current.classList.remove("active")
               if (i + 1 < this.word.length) {
                  next?.classList.add("active")
               }
            }, 1500 * (i + 1) + 1000)
            this.timeouts.push(b)
         }
      }
   }
   mainAreaTwo() {
      if (Date.now() - this.lastSkip < TIME_BEFORE_SKIP_TUTORIAL) {
         return terminalContainer.classList.add("main-tutorial")
      }
      this.lastSkip = Date.now()
      clearInterval(this.tutorialSignal)
      const container = popUp({
         x: -1, y: 470,
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
   mainAreaThree() {
      if (Date.now() - this.lastSkip < TIME_BEFORE_SKIP_TUTORIAL) {
         return terminalContainer.classList.add("main-two-tutorial")
      }
      this.lastSkip = Date.now()
      clearInterval(this.mainAnim)
      this.clearTimeouts()
      const container = popUp({
         x: -1, y: 460,
         height: 420,
         width: 360,
         titl: "Po wysłaniu pierwszej litery drugi zespół będzie mógł zacząć pracę",
         txt: "Mały trójkącik będzie pokazywał, którą litere odszyfrowywuje druga drużyna"
      })
      for (let i = 0; i < document.querySelectorAll(".placeholder").length; i++) {
         const letter = document.querySelectorAll(".placeholder")[i];
         letter.classList.add("correct")
         letter.classList.remove("active")
         letter.value = this.word[i]
      }
      const pointer = document.getElementById("word-pointer")
      for (let i = 0; i < this.word.length; i++) {
         const a = setTimeout(() => {
            pointer.style.left = `${30 + i * (60 + 10) - 8} px`
         }, i * 1000)
         this.timeouts.push(a)
      }
      this.mainTriangle = setInterval(() => {
         this.timeouts = []
         for (let i = 0; i < this.word.length; i++) {
            const a = setTimeout(() => {
               pointer.style.left = `${30 + i * (60 + 10) - 8} px`
            }, i * 1000)
            this.timeouts.push(a)
         }
      }, (this.word.length * 1000 + 1000))
      document.getElementById("window-background").remove()
      terminalContainer.append(container)
      terminalContainer.classList.add("main-three-tutorial")
   }
   translation() {
      if (Date.now() - this.lastSkip < TIME_BEFORE_SKIP_TUTORIAL) {
         return terminalContainer.classList.add("main-two-tutorial")
      }
      this.lastSkip = Date.now()
      clearInterval(this.mainTriangle)
      clearInterval(this.mainAnim)
      this.clearTimeouts()
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
      if (Date.now() - this.lastSkip < TIME_BEFORE_SKIP_TUTORIAL) {
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
      this.timeouts = []
      for (let i = 0; i < document.querySelectorAll(".scoring-icons").length; i++) {
         const server = document.querySelectorAll(".scoring-icons")[i];
         server.classList.add("hidden")
         const a = setTimeout(() => {
            server.classList.remove("hidden")
         }, 1000 * (i + 1))
         this.timeouts.push(a)
      }
   }
   overheatTwo() {
      if (Date.now() - this.lastSkip < TIME_BEFORE_SKIP_TUTORIAL) {
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
      if (Date.now() - this.lastSkip < TIME_BEFORE_SKIP_TUTORIAL) {
         return terminalContainer.classList.add("overheat-two-tutorial")
      }
      clearInterval(this.overheatInter)
      this.clearTimeouts()
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
      if (Date.now() - this.lastSkip < TIME_BEFORE_SKIP_TUTORIAL) {
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
      if (Date.now() - this.lastSkip < TIME_BEFORE_SKIP_TUTORIAL) {
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
      }, TIME_PER_LETTER_SECONDS * 1000 + 500)
      document.getElementById("window-background").remove()
      terminalContainer.append(container)
      terminalContainer.classList.add("time-two-tutorial")
   }
   end() {
      if (Date.now() - this.lastSkip < TIME_BEFORE_SKIP_TUTORIAL) {
         return terminalContainer.classList.add("time-two-tutorial")
      }
      this.lastSkip = Date.now()
      clearTimeout(this.timeInter)
      document.getElementById("header-timer").style.zIndex = 0
      const container = popUp({
         x: -1, y: -1,
         height: 450,
         width: 360,
         titl: (USER_ROLE === ROLES.RECEIVER ?
            "Teraz będziesz mógł się sprawdzić odszyfrowywując słowo na próbę" :
            "Teraz będziesz mógł się sprawdzić wysyłając słowo na próbę"),
         txt: "Próbka i serwery nie są prawdziwe, więc nie przejmuj się jak nie zdążysz albo pomylisz"
      })
      document.getElementById("window-background").remove()
      terminalContainer.append(container)
      terminalContainer.classList.add("finish-tutorial")
   }
}

const gameControls = new Game()

async function onLetterInput(role, letter, word, tutorial = undefined) {
   if (currentLetterIndex.letter > MAX_LENGTH) return
   if (role === ROLES.SENDER) {
      const isCorrect = letter.toUpperCase() === word[currentLetterIndex.letter].toUpperCase()
      if (!tutorial) await senderGuess(isCorrect)
      if (!isCorrect) return false
   }
   if (role === ROLES.RECEIVER) {
      currentLetterIndex.ready = false
      const result = tutorial ? tutorial?.text[currentLetterIndex.letter].toUpperCase() === letter.toUpperCase() :
         await verifyGuess(letter, currentLetterIndex.letter + previousWordsLength)
      currentLetterIndex.ready = true
      if (!result) return false
   }
   secondPlayerProgress = (await progress())[USER_ROLE === ROLES.SENDER ? ROLES.RECEIVER : ROLES.SENDER]

   currentLetterIndex.letter += 1
   if (currentLetterIndex.letter === MAX_LENGTH) {
      currentLetterIndex.letter = 0
      currentLetterIndex.word += 1
      if (currentLetterIndex.word !== AMOUNT_OF_WORDS) {
         if (USER_ROLE === ROLES.SENDER) {
            const checkIfNextWord = setInterval(() => {
               console.log(secondPlayerProgress, previousWordsLength);

               if (secondPlayerProgress === previousWordsLength) {
                  finishWord(() => {
                     gameControls.round()
                  })
                  clearInterval(checkIfNextWord)
               }
            }, 500)
         } else if (USER_ROLE === ROLES.RECEIVER) {
            const timeouts = gameControls.getTimeouts()
            document.getElementById("lights-message").classList.remove("on")
            document.getElementById("lights-morse").classList.remove("on")
            for (const timeout of timeouts) {
               document.getElementById("lights-message").classList.remove("on")
               clearTimeout(timeout)
            }
            finishWord(() => {
               gameControls.round()
            })
            saveWordTime(currentLetterIndex.word - 1)
         }
      }
   }
   if (currentLetterIndex.word === AMOUNT_OF_WORDS) {
      if (role === ROLES.SENDER) tutorial ? finishWord(endTutorial) : (() => {
         const checkIfNextWord = setInterval(() => {
            console.log(secondPlayerProgress, previousWordsLength);
            if (secondPlayerProgress >= previousWordsLength) {
               finishWord(() => {
                  endGame()
               })
               clearInterval(checkIfNextWord)
            }
         }, 500)
      })()


      if (role === ROLES.RECEIVER) tutorial ? finishWord(endTutorial) : (() => {
         saveWordTime(currentLetterIndex.word - 1)
         finishWord(endGame)
      })()

   }

   return true
}

const entryTextReceiver =
   `OMNICORP INDUSTRIES(TM) TERMLINK PROTOCOL
ŁADOWANIE DZIENNIKA ZDARZEŃ...

> SET LOG / READ=INCYDENT_MGLAWICA.LOG

[T-14:32:07]KURS: PRZELOT PRZEZ MGŁAWICĘ, SEKTOR 7-G
[T-14:32:41]WYKRYTO ANOMALIĘ
[T-14:32:58]GŁÓWNY MODUŁ TRANSMISYJNY..............USZKODZONY
[T-14:33:02]POMOCNICZY MODUŁ TRANSMISYJNY..........AKTYWNY
[T-14:33:15]POZOSTAŁE SYSTEMY STATKU...............SPRAWNE

STATUS OGÓLNY: STATEK ZDOLNY DO DALSZEGO LOTU
STATUS ŁĄCZNOŚCI: OGRANICZONA(KANAŁ POMOCNICZY)

POTWIERDŹ UŻYWAJĄC "ENTER", ABY PRZEJŚĆ DALEJ
`

const entryTextSender =
   `OMNICORP INDUSTRIES(TM) TERMLINK PROTOCOL
ŁADOWANIE DZIENNIKA ZDARZEŃ...

> SET LOG / READ=ODBIÓR_MGLAWICA.LOG

[T-14:33:20]ODEBRANO SYGNAŁ AWARYJNY
[T-14:33:24]ŹRÓDŁO: JEDNOSTKA W SEKTORZE 7-G
[T-14:33:40]STAN ZAŁOGI..............................STABILNY
[T-14:33:31]GŁÓWNY KANAŁ ŁĄCZNOŚCI ZE STATKIEM.......ZNISZCZONY
[T-14:33:35]WYKRTYO KANAŁ POMOCNICZY

STAN MISJI: STATEK WRACA NA ZIEMIE
STATUS ŁĄCZNOŚCI: OGRANICZONA(WYŁĄCZNIE KANAŁ POMOCNICZY)

POTWIERDŹ UŻYWAJĄC "ENTER", ABY PRZEJŚĆ DALEJ
`

const tutorialLoadingTextReceiver =
   `[T-15:04:22]ZEBRANO PRÓBKI MINERALNE Z REGIONU MGŁAWICY
[T-15:04:23]KLASYFIKACJA MATERIAŁU..................NIEZNANA
[T-15:04:24]BAZA DANYCH POKŁADOWA...................BRAK WYNIKU

UWAGA: PRÓBKI NIESTABILNE
DO STABILIZACJI WYMAGANA JEST NAZWA MATERIAŁU
NAZWĘ MUSI PRZESŁAĆ BAZA NA ZIEMI

GŁÓWNY MODUŁ USZKODZONY - TRANSMISJA GŁOSOWA NIEDOSTĘPNA
JEDYNY AKTYWNY KANAŁ: TRANSMISJA KODEM MORSE'A (MODUŁ POMOCNICZY)

[T-15:04:25]SPRAWDZANIE UPRAWNIEŃ UŻYTKOWNIKA.............OK
[T-15:04:26]ANALIZA PRZESZKOLENIA UŻYTKOWNIKA.............BŁĄD

WYSTĄPIŁ BŁĄÐ PODCZAS ANALIZY UMIEJĘTNOŚCI
ZE WZGLĘDU NA BRAK INFORMACJI UŻYTKOWNIK MUSI PRZEJŚĆ SZKOLENIE

> USE FILES / READ=SZKOLENIE.EXE

[T-15:04:30]ŁADOWANIE PROGRAMU SZKOLENIE.EXE.............OK
[T-15:04:32]WGRYWANIE PROGRAMU DO PAMIĘCI................OK

POTWIERDŹ UŻYWAJĄC "ENTER", ABY ROZPOCZĄĆ SZKOLENIE
`

const tutorialLoadingTextSender =
   `[T-15:05:01]ODEBRANO ŻĄDANIE IDENTYFIKACJI PRÓBKI
[T-15:05:02]PRZESZUKIWANIE BAZY DANYCH.................WYNIK ZNALEZIONY

UWAGA: PRÓBKI STATKU NIESTABILNE
STACJA NAZIEMNA MUSI PRZESŁAĆ NAZWĘ MATERIAŁU

GŁÓWNY MODUŁ STATKU USZKODZONY - TRANSMISJA GŁOSOWA NIEDOSTĘPNA
JEDYNY AKTYWNY KANAŁ: NADAJNIK KODU MORSE'A

[T-15:05:08]SPRAWDZANIE UPRAWNIEŃ OPERATORA..............OK
[T-15:05:09]ANALIZA PRZESZKOLENIA OPERATORA..............BŁĄD

WYSTĄPIŁ BŁĄD PODCZAS ANALIZY UMIEJĘTNOŚCI
ZE WZGLĘDU NA BRAK INFORMACJI OPERATOR MUSI PRZEJŚĆ SZKOLENIE

> USE FILES / READ=SZKOLENIE.EXE

[T-15:05:12]ŁADOWANIE PROGRAMU SZKOLENIE.EXE.............OK
[T-15:05:14]WGRYWANIE PROGRAMU DO PAMIĘCI................OK

POTWIERDŹ UŻYWAJĄC "ENTER", ABY ROZPOCZĄĆ SZKOLENIE
`

const waiting =
   `[T-15:10:41]SZKOLENIE ZAKOŃCZONE POWODZENIEM
[T-15:10:41]DIAGNOSTYKA URZĄDZEŃ NADAJĄCYCH..........SPRAWNE
[T-15:10:46]KALIBRACJA URZĄDZEŃ NADAJĄCYCH...........GOTOWE
[T-15:10:41]OCZEKIWANIE NA POŁĄCZNIENIE..............GOTOWE

POTWIERDŹ UŻYWAJĄC "ENTER", ABY ROZPOCZĄĆ MISJE
`

const cursor = document.createElement("span");
cursor.className = "cursor";
let typeTimer = null;

function startTyping(text, checkpointClass, timeout = 500) {
   clearTimeout(typeTimer);
   terminalContainer.textContent = "";
   let i = 0;
   setTimeout(() => {
      (function type() {
         terminalContainer.textContent = text.slice(0, i)
         terminalContainer.append(cursor);
         if (i++ < text.length) {
            typeTimer = setTimeout(type, BASIC_TYPING_SPEED + Math.random() * MULTI_TYPING_SPEED)
         } else {
            terminalContainer.classList.add(checkpointClass)
         }
      })();
   }, 500)

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
   ["ready-lore", async () => {
      terminalContainer.classList.remove("ready-lore")
      startTyping(USER_ROLE === ROLES.RECEIVER ? tutorialLoadingTextReceiver : tutorialLoadingTextSender, "ready-tutorial")
   }],
   ["ready-tutorial", () => {
      terminalContainer.classList.remove("ready-tutorial")
      if (CURRENT_STAGE === 0) { skips(1); powerTerminal(); }

      setTimeout(async () => {
         terminalContainer.innerText = ""
         powerTerminal()
         terminalContainer.append(await gameControls.layout())
         tutorialControler.init()
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
      if (USER_ROLE === ROLES.RECEIVER) {
         tutorialControler.translation()
      } else if (USER_ROLE === ROLES.SENDER) {
         tutorialControler.mainAreaThree()
      }
   }],
   ["main-three-tutorial", () => {
      terminalContainer.classList.remove("main-three-tutorial")
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
      await gameControls.playTutorial()
      setTimeout(() => {
         document.getElementById("loading-screen").classList.add("hidden")
         setTimeout(() => {
            document.getElementById("loading-screen").remove()
         }, 1000)
      }, 1000)
   }],
   ["end-tutorial", () => {
      terminalContainer.classList.remove("end-tutorial")
      if (CURRENT_STAGE < 2) powerTerminal()

      setTimeout(() => {
         terminalContainer.innerText = ""
         powerTerminal()
         startTyping(waiting, "start-game")
      }, 2000)
   }],
   ["start-game", async () => {
      terminalContainer.classList.remove("start-game")
      if (CURRENT_STAGE < 3) { skips(3); powerTerminal() }
      setTimeout(async () => {
         terminalContainer.innerText = ""
         terminalContainer.append(await gameControls.layout())
         const container = popUp({
            x: -1, y: -1,
            width: 250,
            height: 250,
            titl: "Nawiązywanie połączenia",
            txt: "..."
         })
         terminalContainer.append(container)
         powerTerminal()
         const checkIfReady = setInterval(async () => {
            if (await isReady()) {
               clearInterval(checkIfReady)
               gameControls.start()
            }
         }, 500)
      }, 2000)
   }],
   ["end-game", async () => {
      terminalContainer.classList.remove("end-tutorial")
      await restartGame()
   }],
])

window.addEventListener("keypress", (e) => {
   if (e.code === "Enter") {
      if (document.getElementById("start") && !document.getElementById("start").classList.contains("hide")) {
         document.getElementById("start").classList.add("hide")
         setTimeout(() => {
            document.getElementById("start").remove()
         }, 2000)
         if (CURRENT_STAGE === 0) {
            setTimeout(() => {
               powerTerminal(() => { startTyping(USER_ROLE === ROLES.RECEIVER ? entryTextReceiver : entryTextSender, "ready-lore") })
            }, 3000)
         }

      }
      const action = allEvents.get(terminalContainer.classList[0])
      if (action) action()
   }
})
