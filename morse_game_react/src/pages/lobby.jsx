import { useState, useEffect } from "react";
import '../styles/lobby.css'
import CreateRoomContainer from "../components/roomContainer.jsx"
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
    rooms.map((room, index) => (
      <CreateRoomContainer key={index} roomNumber={index} room={room} />
    ))
  );
}

export default Lobby;