import styles from '../styles/lobbyBlock.module.css'
import Button from "./button.jsx";

function LobbyBlock({ roomNumber, room }) {
   const buttons = [
      { text: "Sender", role: "sender", state: room.sender },
      { text: "Receiver", role: "receiver", state: room.receiver }
   ]
   return (
      <section className={styles.container}>
         <div className={styles.name}>{"Room " + roomNumber}</div>
         <div className={styles.title}>{"Join as:"}</div>
         {buttons.map((data) => (
            <Button key={data.role} data={data} roomNumber={roomNumber} />
         ))}
         <div></div>
      </section>
   );
}

export default LobbyBlock;