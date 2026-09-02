import styles from '../styles/room.module.css'
import { useState, useEffect } from "react";
import LetterPlaceholder from "../components/letterPlaceholder";
import VerifyGuess from "../api/verifyGuess";
import GetSentence from '../api/getSentence';
import GetRole from '../api/getRole';

function Room() {
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
   const [role, setRole] = useState([]);
   useEffect(() => {
      async function loadRole() {
         const userRole = await GetRole();
         setRole(userRole);
      }
      loadRole();
   }, []);

   const [wordsLength, setWordsLength] = useState([]);
   useEffect(() => {
      async function loadWords() {
         const sentence = await GetSentence();
         const splitSentence = sentence.split(" ");
         const lengths = splitSentence.map(word => word.length);
         setWordsLength(lengths);
      }
      loadWords();
   }, []);

   if (role === "sender") {
      return <RoomSender morseTranslation={morseTranslation} wordsLength={wordsLength} />;
   } else if (role === "receiver") {
      return <RoomReceiver morseTranslation={morseTranslation} wordsLength={wordsLength} />;
   }
   return null;

}

export default Room

function RoomReceiver({ morseTranslation, wordsLength }) {
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
            if (currentIndex.letter >= wordsLength[wordIndex]) {
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
               {wordsLength.map((wordLength, index) => (
                  <LetterPlaceholder
                     key={index}
                     wordLength={wordLength}
                     wordIndex={index}
                     currentLetterIndex={currentLetterIndex}
                     onLetterInput={onLetterInput}
                  />
               ))}
            </main>
            <aside id={styles.aside}>

               <section id={styles.translationtable}>
                  {morseTranslation.map((block, index) => (
                     <div className={`
                     ${styles.translationblock}
                     ${block.number ? styles.number : ""}
                     `}>
                        <div className={styles.letter}>{block.letter}</div>
                        <div className={styles.morse}>{block.morse}</div>
                     </div>
                  ))}
               </section>
            </aside>
            <footer id={styles.footer}></footer>
         </div >

      </>
   );
}

function RoomSender({ morseTranslation, wordsLength }) {
   const [words, setWords] = useState([]);
   useEffect(() => {
      async function loadWords() {
         const sentence = await GetSentence();
         const splitSentence = sentence.split(" ");
         const words = splitSentence.map(word => word.split(""));
         setWords(words);
      }
      loadWords();
   }, []);

   useEffect(() => {
      let time
      let transmitting = false
      function handleKeyDown(e) {
         e.preventDefault()
         if (transmitting) {
            return
         }
         transmitting = true
         time = Date.now()
      }
      function handleKeyUp(e) {
         e.preventDefault()
         transmitting = false
         if (Date.now() - time > 200) {
            console.log("Dash");
         } else {
            console.log("Dot");
         }
      }

      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);

      return () => {
         window.removeEventListener("keydown", handleKeyDown);
         window.removeEventListener("keyup", handleKeyUp);
      };
   }, []);


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
            if (currentIndex.letter >= wordsLength[wordIndex]) {
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
               {wordsLength.map((wordLength, index) => (
                  <LetterPlaceholder
                     key={index}
                     wordLength={wordLength}
                     wordIndex={index}
                     currentLetterIndex={currentLetterIndex}
                     onLetterInput={onLetterInput}
                  />
               ))}
            </main>
            <aside id={styles.aside}>
               <section id={styles.translationtable}>
                  {morseTranslation.map((block, index) => (
                     <div className={`
                     ${styles.translationblock}
                     ${block.number ? styles.number : ""}
                     `}>
                        <div className={styles.letter}>{block.letter}</div>
                        <div className={styles.morse}>{block.morse}</div>
                     </div>
                  ))}
               </section>
            </aside>
            <footer id={styles.footer}>
               <section id={styles.inputbar}>Zacznij nadawać</section>
            </footer>
         </div >
      </>
   );
}