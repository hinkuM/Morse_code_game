import { useState } from "react";

function LetterPlaceholder({ wordLength, wordIndex, currentLetterIndex, onLetterInput }) {
   const [hoverIndex, changeHoverIndex] = useState(null);
   const [activeIndex, changeActiveIndex] = useState(null);
   const [guessResult, changeGuessResult] = useState(null)

   function handleMouseEnter(wordIndex, letterIndex) {
      if (currentLetterIndex.letter != letterIndex || currentLetterIndex.word != wordIndex) {
         return
      }
      changeHoverIndex(letterIndex)
   }
   function handleMouseLeave() {
      changeHoverIndex(null)
   }
   function handleFocus(e, wordIndex, letterIndex) {
      if (currentLetterIndex.letter != letterIndex || currentLetterIndex.word != wordIndex) {
         return e.target.blur()
      }
      changeActiveIndex(letterIndex)
   }
   function handleBlur() {
      changeActiveIndex(null)
   }

   async function handleInput(e, wordIndex, letterIndex) {
      e.target.value = e.target.value.toUpperCase()
      const value = e.target.value
      if (value.length <= 0) {
         return
      }
      const letter = value.slice(-1)
      if (value.length > 1) {
         e.target.value = letter
      }
      console.log(currentLetterIndex);
      if (!currentLetterIndex.ready) {
         return console.log("inactive");
      }
      const result = await onLetterInput({ letter, wordIndex, letterIndex })
      changeGuessResult(result ? null : false)
      if (result) {
         e.target.blur()
         document.getElementById("word" + currentLetterIndex.word).children[currentLetterIndex.letter].focus()
      }
   }

   return (
      <section id={"word" + wordIndex} className={"word"}>
         {Array.from({ length: wordLength }, (_, letterIndex) => (
            <input
               key={letterIndex}
               maxLength={2}
               className={
                  `
                  placeholder
                  ${wordIndex}
                  ${letterIndex}
                  ${hoverIndex === letterIndex ? "hover" : ""}
                  ${activeIndex === letterIndex ? "active" : ""}
                  ${currentLetterIndex.letter === letterIndex && currentLetterIndex.word === wordIndex && guessResult === false ? "incorrect" : ""}
                  ${(currentLetterIndex.letter > letterIndex && currentLetterIndex.word === wordIndex) || currentLetterIndex.word > wordIndex ? "correct" : ""}
                  `
               }
               onMouseEnter={() => handleMouseEnter(wordIndex, letterIndex)}
               onMouseLeave={handleMouseLeave}
               onFocus={(e) => handleFocus(e, wordIndex, letterIndex)}
               onBlur={handleBlur}
               onInput={(e) => handleInput(e, wordIndex, letterIndex)}
            />
         ))}
      </section>
   );
}

export default LetterPlaceholder