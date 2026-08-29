import { Routes, Route } from "react-router-dom";
import Lobby from "./pages/lobby.jsx";
import Room from "./pages/room.jsx";
import RoomLeave from "./pages/roomLeave.jsx";
import Wait from "./pages/wait.jsx";
import ProtectedRoute from "./components/protectedRoute.jsx";

function App() {
   return (
      <Routes>
         <Route path="/" element={<Lobby />} />
         <Route path="/room" element={<ProtectedRoute><Room /></ProtectedRoute>} />
         <Route path="/leave" element={<ProtectedRoute><RoomLeave /></ProtectedRoute>} />
         <Route path="/waiting" element={<ProtectedRoute><Wait /></ProtectedRoute>} />
      </Routes>
   );
}

export default App;