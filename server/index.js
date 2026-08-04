process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled rejection:', reason);
});

import express from "express";
import path from "node:path";
import nocache from "nocache";

const app = express();
const __serverFiles = import.meta.dirname;
const PORT = 3000;

app.use(express.json());
app.use(nocache());
app.use(express.static(path.join(__serverFiles, "../client/public")));
app.use(express.static(path.join(__serverFiles, "../client/views")));
app.use(express.static(path.join(__serverFiles, "../client/modules")));


app.get("/", (req, res, next) => {
    res.sendFile("home.html", { root: path.join(__serverFiles, "../client/views") })
})

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));