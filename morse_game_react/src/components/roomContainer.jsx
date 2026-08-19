import RoomButton from "./roomButton.jsx";

function CreateRoomContainer({ roomNumber, room }) {
   const buttons = [
      { text: "Sender", role: "sender", state: room.sender },
      { text: "Receiver", role: "receiver", state: room.receiver }
   ]
   return (
      <section className="room">
         <div className="room-name">{"Room " + roomNumber}</div>
         <div className="room-title">{"Join as:"}</div>
         {buttons.map((data) => (
            <RoomButton key={data.role} data={data} roomNumber={roomNumber} />
         ))}
         <div></div>
      </section>
   );
}

export default CreateRoomContainer;