import styles from '../styles/room.module.css'
import { useState, useEffect } from "react";
import LetterPlaceholder from "../components/letterPlaceholder";
import VerifyGuess from "../api/verifyGuess";

function Room() {
   const words = [5, 2, 7, 4, 2]
   const [currentLetterIndex, changeCurrentIndex] = useState({ ready: true, index: 0, letter: 0, word: 0 });
   async function onLetterInput({ letter, wordIndex, letterIndex }) {
      changeCurrentIndex((currentIndex) => {
         currentIndex.ready = false
         return currentIndex
      })
      console.log(letter, wordIndex, letterIndex);

      const result = await VerifyGuess({ letter, index: currentLetterIndex.index })
      changeCurrentIndex((currentIndex) => {
         if (result) {
            currentIndex.index += 1
            currentIndex.letter += 1
            if (currentIndex.letter >= words[wordIndex]) {
               currentIndex.letter = 0
               currentIndex.word += 1
            }
         }
         return { ready: true, letter: currentIndex.letter, word: currentIndex.word, index: currentIndex.index }
      })
      return result
   }
   return (
      <>
         <div id={styles.all}>
            <header id={styles.header}></header>
            <aside id={styles.aside}></aside>
            <main id={styles.main}>
               {words.map((wordLength, index) => (
                  <LetterPlaceholder
                     key={index}
                     wordLength={wordLength}
                     wordIndex={index}
                     currentLetterIndex={currentLetterIndex}
                     onLetterInput={onLetterInput}
                  />
               ))}
            </main>
            <aside id={styles.aside}></aside>
            <footer id={styles.footer}></footer>
         </div>

      </>
   );
}

export default Room