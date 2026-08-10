process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled rejection:', reason);
});

import express from "express";
import session from "express-session";
import path from "node:path";
import nocache from "nocache";

const app = express();
const __serverFiles = import.meta.dirname;
const PORT = 3000;

app.use(nocache());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__serverFiles, "../client/public")));
app.use(express.static(path.join(__serverFiles, "../client/views")));
app.use(express.static(path.join(__serverFiles, "../client/modules")));

app.use(session({
    secret: "some-secret-key",
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 15 * 60 * 1000
    }
}));

const numberOfRooms = 4
const rooms = new Map()
const users = new Map()

for (let i = 0; i < numberOfRooms; i++) {
    rooms.set("room" + i, { sender: undefined, receiver: undefined })
}

app.get("/", (req, res, next) => {
    res.sendFile("home.html", { root: path.join(__serverFiles, "../client/views") })
})

app.post("/room/info", (req, res, next) => {
    const takenSlots = []
    rooms.forEach((value, key) => {
        takenSlots.push({ sender: (value.sender === undefined) ? false : true, receiver: (value.receiver === undefined) ? false : true })
    })
    return res.status(200).json({ code: "ok", data: takenSlots })
})


app.post("/room/join", (req, res, next) => {
    const { roomNumber, role } = req.body

    if (isNaN(roomNumber)) {
        return res.status(400).json({ code: "roomNumber is non a number" })
    }
    if (parseInt(roomNumber) < 0 || parseInt(roomNumber) > numberOfRooms - 1) {
        return res.status(400).json({ code: "roomNumber is not in range" })
    }
    const roomData = rooms.get("room" + roomNumber)
    if (roomData === undefined) {
        return res.status(400).json({ code: "Room with this number doesn't exist" })
    }
    if (role != "sender" && role != "receiver") {
        return res.status(400).json({ code: "Wrong role" })
    }
    const userConnection = users.get(req.session.id)
    if (userConnection != undefined) {
        return res.status(400).json({ code: "User is already in game" })
    }
    users.set(req.session.id, { room: "room" + roomNumber, role })
    if (role === "sender" && roomData.sender !== undefined) {
        return res.status(400).json({ code: "Sender slot already taken" })
    }
    if (role === "receiver" && roomData.receiver !== undefined) {
        return res.status(400).json({ code: "Receiver slot already taken" })
    }
    if (role === "sender") {
        rooms.set("room" + roomNumber, { sender: req.session.id, receiver: roomData.receiver })
    } else if (role === "receiver") {
        rooms.set("room" + roomNumber, { sender: roomData.sender, receiver: req.session.id })
    }
    console.log(rooms, users);
    return res.status(200).json({ code: "ok" })
})

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));