import { useState, useEffect } from "react";
import styles from "../styles/lobby.module.css"
import LobbyBlock from "../components/lobbyBlock.jsx"
import GetRoomInfo from '../api/roomInfo.jsx';

function Lobby() {
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    fetchRoomInfo();
  }, []);

  function fetchRoomInfo() {
    GetRoomInfo()
      .then((data) => {
        setRooms(data);
      })
      .catch((err) => console.log(err));
  }

  return (
    <main id={styles.main}>
      {rooms.map((room, index) => (
        <LobbyBlock key={index} roomNumber={index} room={room} />
      ))}
    </main>

  );
}

export default Lobby;