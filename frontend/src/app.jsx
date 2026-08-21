// App.jsx
import { Routes, Route } from "react-router-dom";
import Lobby from "./pages/lobby.jsx";
import Room from "./pages/room.jsx";
import Wait from "./pages/wait.jsx";

function App() {
   return (
      <Routes>
         <Route path="/" element={<Lobby />} />
         <Route path="/room" element={<Room />} />
         <Route path="/waiting" element={<Wait />} />
      </Routes>
   );
}

export default App;