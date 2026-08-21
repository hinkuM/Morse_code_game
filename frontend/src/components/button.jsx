import styles from '../styles/button.module.css'
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import JoinRoom from "../api/joinRoom.jsx";

function Button({ data, roomNumber }) {
   const navigate = useNavigate();
   const [state, setTaken] = useState(data.state);

   async function joinAction() {
      if (state) {
         return
      }
      setTaken(true);
      try {
         const redirect = await JoinRoom({ roomNumber, role: data.role });
         navigate(redirect);
      } catch (err) {
         console.error(err);
         setTaken(false);
      }
   }
   return (
      <button
         id={data.role}
         onClick={joinAction}
         className={`${styles.btn} ${state ? styles.taken : styles.free}`}>
         {data.text}
      </button>
   )

}

export default Button;