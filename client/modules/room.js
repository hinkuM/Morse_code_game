const main = document.querySelector("main")
let currentGuessIndex = 0
let lastGuess = ''
const words = [5, 2, 7, 4, 2]



class rulesManager {
   constructor() {

   }

   canFocus(index, placeholderIndex) {
      let usersClickIndex = placeholderIndex
      for (let i = 0; i < index; i++) {
         usersClickIndex += words[i]
      }
      if (usersClickIndex != currentGuessIndex) {
         return false
      }
      return true
   }
}

class gameData {
   constructor() {
      this.startTime
      this.wordsGuessed

   }


}

function pointCounter() {

}

const rules = new rulesManager()


for (let i = 0; i < words.length; i++) {
   const letterAmount = words[i];
   createPlaceholders(letterAmount, i)
}
const allPlaceholders = document.querySelectorAll(".placeholder")


function createPlaceholders(letterAmount, index) {
   const container = document.createElement("section")
   container.setAttribute("id", "word" + index)
   container.classList.add("word")
   for (let i = 0; i < letterAmount; i++) {
      const placeholder = document.createElement("input")
      placeholder.classList.add("placeholder")
      placeholder.addEventListener("mouseenter", () => {
         if (!rules.canFocus(index, i)) {
            return
         }
         placeholder.style.cursor = "pointer"
         placeholder.classList.add("hover")
      })
      placeholder.addEventListener("mouseleave", () => {
         if (!rules.canFocus(index, i)) {
            return
         }
         placeholder.style.cursor = "default"
         placeholder.classList.remove("hover")
      })
      placeholder.addEventListener("focus", () => {
         if (!rules.canFocus(index, i)) {
            return placeholder.blur()
         }
         placeholder.classList.add("active")
      })
      placeholder.addEventListener("blur", () => {
         placeholder.classList.remove("active")
      })
      placeholder.addEventListener("input", () => {
         lastGuess = placeholder.value[placeholder.value.length - 1]
         placeholder.value = lastGuess != undefined ? lastGuess.toUpperCase() : ""
         verifyGuess(placeholder)
      })
      container.append(placeholder)
   }
   main.append(container)
}


function verifyGuess(container) {
   const letter = container.value
   if (letter === undefined || letter.length <= 0) {
      return
   }

   $.ajax({
      url: "/room/verify",
      type: "POST",
      data: {
         letter,
         index: currentGuessIndex
      },
      success: function (result) {
         currentGuessIndex++
         container.classList.remove("incorrect")
         container.classList.add("correct")
         container.blur()
         if (currentGuessIndex < allPlaceholders.length) {
            allPlaceholders[currentGuessIndex].focus()
         }
      },
      error: function (result, err) {
         container.classList.add("incorrect")
      }
   });
}