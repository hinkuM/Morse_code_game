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
   terminalContainer.append(background)
}

function LetterPlaceholder({ onLetterInput, wordIndex, wordLength, word = undefined, tutorial = undefined } = {}) {
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
         if (input.classList.contains("correct")) return
         e.preventDefault()
         input.focus()
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

         const result = await onLetterInput(letter, word ?? wordLength, tutorial)
         if (result) {
            input.classList.add("correct")
            input.classList.remove("active")
            input.blur()
            if (document.getElementById("word" + currentLetterIndex.word)) {
               document.getElementById("word" + currentLetterIndex.word).children[currentLetterIndex.letter].focus()
            }
         } else {
            input.classList.add("incorrect")
            errroIndicatorTimeout = setTimeout(() => {
               input.classList.remove("incorrect")
            }, 500)
            document.querySelectorAll(".scoring-icons.hidden")[0].classList.remove("hidden")
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
   popUp(
      {
         x: -1, y: -1,
         height: 250,
         width: 340,
         titl: "Ukończyłeś szkolenie!",
         txt: "Zatwierdź, aby przejść dalej"
      })
   document.getElementById("progress-numbers").innerText = "1 / 1"
   terminalContainer.classList.add("end-tutorial")
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
      const main = document.getElementById("main")

      for (let i = 0; i < words.length; i++) {
         const word = words[i]
         main.append(LetterPlaceholder({
            onLetterInput: this.onLetterInput,
            wordIndex: i,
            wordLength: word.length,
            word: word,
         }))
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
   async init(tutorial) {
      const fullSentence = tutorial.text ?? await sentence()
      const words = (fullSentence).split(" ")
      MAX_LENGTH = fullSentence.replace(" ", "").length
      const main = document.getElementById("main")

      for (let i = 0; i < words.length; i++) {
         const word = words[i]
         main.append(LetterPlaceholder({
            onLetterInput: this.onLetterInput,
            wordIndex: i,
            wordLength: word.length,
            tutorial
         }))
      }
      document.querySelectorAll(".placeholder")[0].focus()
   }

   async onLetterInput(letter, wordLength, tutorial = undefined) {
      currentLetterIndex.ready = false
      const result = tutorial ? tutorial.text[currentLetterIndex.letter].toUpperCase() === letter.toUpperCase() :
         await verifyGuess(letter, currentLetterIndex.index)
      currentLetterIndex.ready = true

      if (!result) return false
      currentLetterIndex.index += 1
      currentLetterIndex.letter += 1
      if (currentLetterIndex.letter >= wordLength) {
         currentLetterIndex.letter = 0
         currentLetterIndex.word += 1
      }
      if (currentLetterIndex.index === MAX_LENGTH) {
         tutorial ? endTutorial() : endGame()
      }
      return true
   }
}

class Game {
   async role(r) {
      this.userRole = r ?? await role()
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

         asidePointsContainer.classList.add("aside-block")
         scroringTitle.innerText = "Uszkodzone systemy"
         scroringTitle.setAttribute("id", "scoring-title")
         scroringList.setAttribute("id", "scoring-list")
         asidePointsContainer.append(scroringTitle, scroringList)
         for (let i = 0; i < 3; i++) {
            const container = document.createElement("div")
            const fireIcon = document.createElement("div")
            const serverIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg")
            function* iconRectIterator() {
               for (let i = 0; i < 3; i++) {
                  yield {
                     type: "rect", values: new Map([
                        ["x", "6"],
                        ["y", 6 + i * 18],
                        ["width", "38"],
                        ["height", "12"],
                        ["rx", "3"],
                        ["fill", "#4a90d9"],
                     ])
                  }

               }
            }
            function* iconCircleIterator() {
               for (let i = 0; i < 3; i++) {
                  yield {
                     type: "circle", values: new Map([
                        ["cx", "36"],
                        ["cy", 12 + i * 18],
                        ["r", "3"],
                        ["fill", "#f31212"],
                     ])
                  }
               }
            }
            const serverData = [
               {
                  type: "rect", values: new Map([
                     ["x", "0"],
                     ["y", "0"],
                     ["width", "50"],
                     ["height", "60"],
                     ["rx", "6"],
                     ["fill", "#f2f2f2"],
                     ["stroke", "#ccc"],
                     ["stroke-width", "1"],
                  ])
               },
               ...iconCircleIterator(),
               ...iconRectIterator()
            ]

            {
               fireIcon.innerText = "🔥"
               fireIcon.classList.add("scoring-fire")
               serverIcon.setAttribute("viewBox", "0 0 50 60")
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
            container.append(fireIcon, serverIcon)
            scroringList.append(container)
         }

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

         asideTranslationContainer.classList.add("aside-block")
         asideTranslationContainer.setAttribute("id", "translation")
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
      const word = "ukenium"
      new Receiver().init({ text: word })
      document.getElementById("lights-message").classList.add("on")
      progressTracker = setInterval(async () => {
         const guessed = document.querySelectorAll(".placeholder.correct").length
         if (guessed >= word.length) clearInterval(progressTracker)
         this.playMessage(word[guessed])
      }, 1000)
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

   playMessage(letter) {
      if (this.playing) return
      this.playing = true
      const morseLight = document.getElementById("lights-morse")
      const morseCode = MORSE_TRANSLATION_MAP.get(letter.toUpperCase())
      const blinking = []
      for (let i = 0; i < morseCode.length; i++) {
         if (morseCode[i] === "•") {
            blinking.push(250)
         } else if (morseCode[i] === "᠆") {
            blinking.push(750)
         }
      }
      let counter = 0
      for (const time of blinking) {
         setTimeout(() => {
            morseLight.classList.add("on")
            setTimeout(() => {
               morseLight.classList.remove("on")
            }, time)
         }, counter)
         counter += time + 200
      }
      setTimeout(() => {
         this.playing = false
      }, counter + 2000)
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

const gameControls = new Game()


const entryText =
   `OMNICORP INDUSTRIES (TM) TERMLINK PROTOCOL
ENTERING MAINTENANCE MODE...

>SET TERMINAL/INQUIRE

RIT-V300

>SET FILE/PROTECTION=OWNER:RWED ACCOUNTS.F
>SET HALT RESTART/MAINT

INITIALIZING ROBCO INDUSTRIES BOOT AGENT
LOADING DIAGNOSTIC SUBROUTINES........OK
CHECKING SECTOR 0x1A4F.................OK
POTWIERDŹ UŻYWAJĄC "ENTER"
>`

const tutorialLoadingText =
   `
SPRAWDZANIE UPRAWNIEŃ UŻYTKOWNIKA.............OK
ANALIZA PRZESZKOLENIA UŻYTKOWNIKA.............ERROR

WYSTĄPIŁ BŁĄÐ PODCZAS ANALIZY UMIEJĘTNOŚCI W ZAKRESIE NADAWANIA I ODBIERANIA WIADOMOŚCI

ZE WZGLĘDU NA BRAK INFORMACJI UŻYTKONWIK MUSI PRZEJŚĆ SZKOLENIE

>USE SZKOLENIE.EXE

ŁADOWANIE PROGRAMU SZKOLENIE.EXE......................OK
WGRYWANIE PROGRAMU DO PAMIĘCI..................OK

ZATWIERDŹ, ABY ROZPOCZĄĆ SZKOLENIE

`

const terminalContainer = document.getElementById("content")
const cursor = document.createElement("span");
cursor.className = "cursor";
let typeTimer = null;

function startTyping(text, checkpointClass, speed = 1) {
   clearTimeout(typeTimer);
   terminalContainer.textContent = "";
   let i = 0;
   (function type() {
      terminalContainer.textContent = text.slice(0, i);
      terminalContainer.append(cursor);
      if (i++ < text.length) {
         typeTimer = setTimeout(type, 18 + Math.random() * speed)
      } else {
         terminalContainer.classList.add(checkpointClass)
      }
   })();
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

window.addEventListener("keypress", (e) => {
   if (e.code === "Enter" && document.getElementById("start") && !document.getElementById("start").classList.contains("hide")) {
      document.getElementById("start").classList.add("hide")
      setTimeout(() => {
         document.getElementById("start").remove()
      }, 2000)
      setTimeout(() => {
         powerTerminal(() => { startTyping(entryText, "ready-lore") })
      }, 3000)
   }
   if (e.code === "Enter" && terminalContainer.classList.contains("ready-lore")) {
      terminalContainer.classList.remove("ready-lore")
      startTyping(tutorialLoadingText, "ready-tutorial")
   }
   if (e.code === "Enter" && terminalContainer.classList.contains("ready-tutorial")) {
      terminalContainer.classList.remove("ready-tutorial")
      powerTerminal()

      setTimeout(async () => {
         terminalContainer.innerText = ""
         powerTerminal()
         await gameControls.role("receiver")
         terminalContainer.append(await gameControls.layout())
         await gameControls.tutorial()
         // if (await gameStarted()) {
         //    await gameControls.start()
         // } else {
         //    await gameControls.init()
         // }
         document.getElementById("loading-screen").classList.add("hidden")
         setTimeout(() => {
            document.getElementById("loading-screen").remove()
         }, 1000)
      }, 2000)
   }
   if (e.code === "Enter" && terminalContainer.classList.contains("end-tutorial")) {
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
   }
   if (e.code === "Enter" && document.getElementById("round-title") && !document.getElementById("round-team")) {
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
