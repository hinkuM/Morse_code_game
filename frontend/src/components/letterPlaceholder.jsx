import styles from "../styles/letterPlaceholder.module.css"
import { useState, useEffect } from "react";

function LetterPlaceholder({ wordLength, wordIndex, currentLetterIndex, onLetterInput, word = null }) {
   const [hoverIndex, changeHoverIndex] = useState(null);
   const [guessResult, changeGuessResult] = useState(null)


   function handleMouseEnter(wordIndex, letterIndex) {
      if (word) {
         return
      }
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
      console.log(result);

      if (result) {
         e.target.blur()
         document.getElementById("word" + currentLetterIndex.word).children[currentLetterIndex.letter].focus()
      }
   }

   return (
      <section id={"word" + wordIndex} className={styles.word}>
         {Array.from({ length: wordLength }, (_, letterIndex) => (
            <input
               key={letterIndex}
               maxLength={2}
               className={
                  `
                  ${styles.placeholder}
                  ${(hoverIndex === letterIndex && !word) ? styles.hover : ""}
                   ${(currentLetterIndex.letter === letterIndex && currentLetterIndex.word === wordIndex) ? styles.active : ""}
                  ${currentLetterIndex.letter === letterIndex && currentLetterIndex.word === wordIndex && guessResult === false ? styles.incorrect : ""}
                  ${(currentLetterIndex.letter > letterIndex && currentLetterIndex.word === wordIndex) || currentLetterIndex.word > wordIndex ? styles.correct : ""}
                  `
               }
               onMouseEnter={() => handleMouseEnter(wordIndex, letterIndex)}
               onMouseLeave={handleMouseLeave}
               onFocus={(e) => handleFocus(e, wordIndex, letterIndex)}
               onInput={(e) => handleInput(e, wordIndex, letterIndex)}
               placeholder={word ? word[letterIndex].toUpperCase() : ""}
            />
         ))}
      </section>
   );
}

export default LetterPlaceholder