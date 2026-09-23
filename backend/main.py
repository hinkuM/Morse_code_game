# uvicorn main:app --host 0.0.0.0 --port 8000

# GLOBAL VARIABLES
API_BASE = "/api"
SENTENCES = [
   "uranium cobalt oxygen".lower(),
   "Azerbejdzan me explode fast us".lower(),
   "This IS working".lower(),
   "Cosmic theme game mhm".lower()
]
SENTENCES_TRIMED = [sentence.replace(" ", "") for sentence in SENTENCES]
NUMBER_OF_ROOMS = 4
BASE_TIMEOUT_IN_SECONDS = 1
MAX_TIMEOUT_ATTEMPTS = 5
TIME_FOR_LOADING = 1000 * 12
TIME_PER_LETTER = 1000 * 12
ROOMS_DB = "rooms"
PLAYERS_DB = "players"
PROGRESS_DB = "progress"
RESULTS_DB= "results"
FRONTEND = "../frontend"


import os
import uuid
import sqlite3
import time
from fastapi import FastAPI, HTTPException, Request, Depends
from pydantic import BaseModel
from starlette.middleware.sessions import SessionMiddleware
from enum import Enum
from dotenv import load_dotenv
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from datetime import datetime, timezone

# ENV
load_dotenv()
ENV_VARIABLES = os.environ 

# ENDPOINT AND SESSION
app = FastAPI()
app.add_middleware(SessionMiddleware, secret_key=ENV_VARIABLES["SESSION_SECRET"])
app.mount("/assets", StaticFiles(directory=FRONTEND), name="assets")

# SERVER DATA
players_attempts_tracker = dict()

# SQL 
def get_db_access():
    conn = sqlite3.connect('game.db', check_same_thread=False)
    try:
      conn.execute("PRAGMA foreign_keys = ON")
      conn.row_factory = sqlite3.Row
      yield conn
      conn.commit()
    except Exception:
      conn.rollback()
      raise
    finally:
      conn.close()

def create_database_tables():
   conn = sqlite3.connect('game.db')
   try:
      cursor = conn.cursor()
      cursor.execute(f'''
         CREATE TABLE IF NOT EXISTS {ROOMS_DB} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            last_join_time INTEGER NOT NULL DEFAULT {0},
            game_started INTEGER DEFAULT 0,
            game_start_time INTEGER NOT NULL DEFAULT {0}
         )
      ''')
      cursor.execute(f'''
         CREATE TABLE IF NOT EXISTS {PLAYERS_DB} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            player_id TEXT NOT NULL UNIQUE,
            room_id INTEGER NOT NULL,
            role TEXT NOT NULL,
            ready INTEGER NOT NULL DEFAULT 0,
            correct_guesses INTEGER NOT NULL DEFAULT 0,
            incorrect_guesses INTEGER NOT NULL DEFAULT 0,
            sentence TEXT NOT NULL,
            FOREIGN KEY (room_id) REFERENCES {ROOMS_DB}(id)
         )
      ''')
      cursor.execute(f'''
         CREATE TABLE IF NOT EXISTS {PROGRESS_DB} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            player_id TEXT NOT NULL UNIQUE,
            tutorial_start INTEGER NOT NULL DEFAULT 0,
            tutorial_end INTEGER NOT NULL DEFAULT 0,
            game_start INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (player_id) REFERENCES {PLAYERS_DB}(player_id) ON DELETE CASCADE
         )
      ''')
      cursor.execute(f'''
         CREATE TABLE IF NOT EXISTS {RESULTS_DB} (
            game_number INTEGER PRIMARY KEY AUTOINCREMENT,
            receiver_id TEXT NOT NULL UNIQUE,
            team_name TEXT NULL DEFAULT NULL,
            room_id INTEGER NOT NULL,
            point_no_error INTEGER NOT NULL DEFAULT 1,
            point_time INTEGER NOT NULL DEFAULT 1,
            sentence TEXT NOT NULL,
            word_one INTEGER NULL DEFAULT NULL,
            word_two INTEGER NULL DEFAULT NULL,
            word_three INTEGER NULL DEFAULT NULL,
            word_four INTEGER NULL DEFAULT NULL,
            word_five INTEGER NULL DEFAULT NULL,
            FOREIGN KEY (room_id) REFERENCES {ROOMS_DB}(id),
            FOREIGN KEY (receiver_id) REFERENCES {PLAYERS_DB}(player_id)
         )
      ''')
      conn.commit()
      for i in range(NUMBER_OF_ROOMS):
         cursor.execute(
            f"INSERT OR REPLACE INTO {ROOMS_DB}(id, name) VALUES (?, ?)",
            [i, f"hello{i}"]
         )
      conn.commit()
   except Exception:
      conn.rollback()
      raise
   finally:
      conn.close()

def player_leave(user_session_id):
   conn = sqlite3.connect('game.db')
   try:
      cursor = conn.cursor()
      cursor.execute(f'''
         UPDATE {ROOMS_DB}
         SET last_join_time = {int(time.time()* 1000)}, game_started = 0
         WHERE id IN (
            SELECT room_id FROM {PLAYERS_DB}
            WHERE player_id = ?
         )
      ''', (user_session_id,))
      cursor.execute(
         f"DELETE FROM {PLAYERS_DB} WHERE player_id = ?",
         (user_session_id,)
      )
      conn.commit()
   except Exception:
      conn.rollback()
      raise
   finally:
      conn.close()


create_database_tables()

class NotAuthenticated(Exception):
    pass

@app.exception_handler(NotAuthenticated)
async def not_authenticated_handler(request: Request, exc: NotAuthenticated):
    return RedirectResponse(url="/")

class Terminate(Exception):
    pass

@app.exception_handler(Terminate)
async def not_authenticated_handler(request: Request, exc: Terminate):
    return RedirectResponse(url="/leave")

def check_session(request: Request, conn: sqlite3.Connection = Depends(get_db_access)):
   user_session_id = request.session.get("user_session_id")
   if user_session_id is None:
      raise NotAuthenticated()
   cursor = conn.cursor()
   cursor.execute(f"SELECT * FROM {PLAYERS_DB} WHERE player_id = (?)", (user_session_id,))
   player_data = cursor.fetchone()
   if player_data is None:
      raise Terminate()
   return user_session_id



def ensure_session(request: Request):
   user_session_id = request.session.get("user_session_id")
   if user_session_id is None:
      request.session["user_session_id"] = str(uuid.uuid4())
      players_attempts_tracker.setdefault(user_session_id, {"user_attempts": 0, "user_last_attempt": None})
   return request.session["user_session_id"]

@app.get("/")
def index(request: Request):
   print(request.session)
   if request.session.get("user_session_room") != None:
      return RedirectResponse(url="/room")
   return FileResponse(f"{FRONTEND}/views/home.html")

@app.get("/waiting")
def index(request: Request, user_session_id=Depends(check_session)):
   return FileResponse(f"{FRONTEND}/views/waiting.html")

@app.get("/room")
def index(request: Request, user_session_id=Depends(check_session), conn: sqlite3.Connection = Depends(get_db_access)):
   cursor = conn.cursor()
   cursor.execute(f"SELECT COUNT(player_id) AS player_count FROM {PLAYERS_DB} WHERE room_id = (?)", (request.session.get("user_session_room"),))
   room_data = cursor.fetchone()
   if room_data["player_count"] == 1:
      return RedirectResponse(url="/waiting")
   if room_data["player_count"] == 2:
      return FileResponse(f"{FRONTEND}/views/room.html")
   return RedirectResponse(url="/waiting")


@app.get("/leave")
def leave_room( request: Request):
   if not request.session["user_session_id"]:
      return RedirectResponse(url="/")
   player_leave(request.session["user_session_id"])
   request.session["user_session_id"] = str(uuid.uuid4())
   request.session["user_session_role"] = None
   request.session["user_session_room"] = None
   return RedirectResponse(url="/")

@app.get("/rooms")
def index(conn: sqlite3.Connection = Depends(get_db_access)):
   cursor = conn.cursor()
   cursor.execute(f"SELECT * FROM {ROOMS_DB}")
   rows = cursor.fetchall()
   return { "code": "ok", "data": rows }


@app.get("/players")
def index(conn: sqlite3.Connection = Depends(get_db_access)):
   cursor = conn.cursor()
   cursor.execute(f"SELECT * FROM {PLAYERS_DB}")
   rows = cursor.fetchall()
   return { "code": "ok", "data": rows }


@app.get("/progress")
def index(conn: sqlite3.Connection = Depends(get_db_access)):
   cursor = conn.cursor()
   cursor.execute(f"SELECT * FROM {PROGRESS_DB}")
   rows = cursor.fetchall()
   return { "code": "ok", "data": rows }


@app.get("/results")
def index(conn: sqlite3.Connection = Depends(get_db_access)):
   cursor = conn.cursor()
   cursor.execute(f"SELECT * FROM {RESULTS_DB}")
   rows = cursor.fetchall()
   return { "code": "ok", "data": rows }


@app.post("/auth")
def authorization(request: Request, user_session_id=Depends(check_session), conn: sqlite3.Connection = Depends(get_db_access)):
   return {"user_session_id": user_session_id}

@app.post("/info", status_code=200)
def room_info(request: Request, user_session_id=Depends(ensure_session), conn: sqlite3.Connection = Depends(get_db_access)):
   rooms = [{Role.sender.value: False, Role.receiver.value: False} for i in range(NUMBER_OF_ROOMS)]
   cursor = conn.cursor()
   cursor.execute(f"SELECT room_id, role FROM {PLAYERS_DB}")
   rows = cursor.fetchall()
   for row in rows:
      rooms[row["room_id"]][row["role"]] = True
   return { "code": "ok", "data": rooms }



class Role(str, Enum):
    sender = "sender"
    receiver = "receiver"

class Join(BaseModel):
    roomNumber: int
    role: Role

@app.post("/join", status_code=200)
def join_room(body: Join, request: Request, user_session_id=Depends(ensure_session), conn: sqlite3.Connection = Depends(get_db_access)):
   if body.roomNumber < 0 or body.roomNumber > NUMBER_OF_ROOMS - 1:
      raise HTTPException(status_code=400, detail="roomNumber is not in range")

   cursor = conn.cursor()
      
   cursor.execute(f"SELECT * FROM {PLAYERS_DB} WHERE player_id = (?)", (user_session_id,))
   player_data = cursor.fetchone()

   if player_data is not None:
      # TODO redirect to specific room
      raise HTTPException(status_code=400, detail="User is already in game")

   cursor.execute(f"SELECT game_started FROM {ROOMS_DB} WHERE id = (?)", (body.roomNumber,))
   room_data = cursor.fetchone()
   if room_data["game_started"] == 1:
      # TODO redirect to specific room
      raise HTTPException(status_code=400, detail="Game has already started")

   cursor.execute(f"SELECT role FROM {PLAYERS_DB} WHERE room_id = (?)", (body.roomNumber,))
   player_data = cursor.fetchone()

   if player_data is not None:
      if player_data["role"] == body.role.value:
         raise HTTPException(status_code=400, detail=f"{body.role.value} slot already taken")

   cursor.execute(f"INSERT INTO {PLAYERS_DB}('player_id', 'room_id', 'role', 'sentence') VALUES (?, ?, ?, ?)", (user_session_id, body.roomNumber, body.role.value, SENTENCES_TRIMED[body.roomNumber]))
   request.session["user_session_role"] = body.role.value
   request.session["user_session_room"] = body.roomNumber

   redirect = "/waiting"
   cursor.execute(f"SELECT COUNT(player_id) AS player_count FROM {PLAYERS_DB} WHERE room_id = (?)", (body.roomNumber,))
   room_data = cursor.fetchone()

   if room_data["player_count"] == 2:
      redirect = "/room"

   return { "code": "REDIRECT", "data": redirect }


class Amount_of_skips(BaseModel):
   amount: int

# WHERE TO START GAME FOR USER IF HE RE-JOINED
@app.post("/room/skips", status_code=200)
def send_sentence(body: Amount_of_skips, request: Request, user_session_id=Depends(check_session), conn: sqlite3.Connection = Depends(get_db_access)):
    if body.amount < 0 or body.amount > 3:
        raise HTTPException(status_code=400, detail="wrong amount of skips")

    cursor = conn.cursor()

    if body.amount == 0:
        cursor.execute(
            f"SELECT (tutorial_start + tutorial_end + game_start) as skips FROM {PROGRESS_DB} WHERE player_id = ?",
            (user_session_id,)
        )
        row = cursor.fetchone()
        if row is None:
            cursor.execute(f"INSERT INTO {PROGRESS_DB} (player_id, tutorial_start, tutorial_end, game_start) VALUES (?, 0, 0, 0)", (user_session_id,))
            return {"code": "ok", "data": 0}
        return {"code": "ok", "data": row["skips"]}

    if body.amount == 1:
        cursor.execute(f"UPDATE {PROGRESS_DB} SET tutorial_start = 1 WHERE player_id = ?", (user_session_id,))
    elif body.amount == 2:
        cursor.execute(f"UPDATE {PROGRESS_DB} SET tutorial_start = 1, tutorial_end = 1 WHERE player_id = ?", (user_session_id,))
    elif body.amount == 3:
        cursor.execute(f"UPDATE {PROGRESS_DB} SET tutorial_start = 1, tutorial_end = 1, game_start = 1 WHERE player_id = ?", (user_session_id,))
    return {"code": "ok", "data": 0}

# WHAT ROLE IS HE PLAYING
@app.post("/room/role", status_code=200)
def send_role(request: Request, user_session_id=Depends(check_session)):
   return { "code": "ok", "data": request.session["user_session_role"] }

# SENDS WORDS/SENTENCE TO USER
@app.post("/room/sentence", status_code=200)
def send_sentence(request: Request, user_session_id=Depends(check_session)):
   return { "code": "ok", "data": SENTENCES[request.session["user_session_room"]] }

# CHECKS AND SENDS WHEN GAME STARTED
@app.post("/room/time", status_code=200)
def send_sentence(request: Request, user_session_id=Depends(check_session), conn: sqlite3.Connection = Depends(get_db_access)):
   cursor = conn.cursor()
   cursor.execute(
      f"SELECT game_start_time FROM {ROOMS_DB} WHERE id = (?)",
      (request.session["user_session_room"],)
   )
   start_time = cursor.fetchone()
   return { "code": "ok", "data": start_time["game_start_time"] }

# SENDS HOW MANY MISTAKES USERS MADE
@app.post("/room/errors", status_code=200)
def send_sentence(request: Request, user_session_id=Depends(check_session), conn: sqlite3.Connection = Depends(get_db_access)):
   cursor = conn.cursor()
   cursor.execute(
      f"SELECT SUM(incorrect_guesses) as errors FROM {PLAYERS_DB} WHERE room_id = (?)",
      (request.session["user_session_room"],)
   )
   errors = cursor.fetchone()
   return { "code": "ok", "data": errors["errors"] }

# SENDS HOW MANY CORRECT GUESSES BOTH PLAYERS SEPERATELY MADE
@app.post("/room/progress", status_code=200)
def send_sentence(request: Request, user_session_id=Depends(check_session), conn: sqlite3.Connection = Depends(get_db_access)):
   cursor = conn.cursor()
   cursor.execute(
      f"SELECT role, correct_guesses FROM {PLAYERS_DB} WHERE room_id = (?)",
      (request.session["user_session_room"],)
   )
   results = cursor.fetchall()
   progress = {Role.sender:  0, Role.receiver: 0}
   for i in range(2):
      progress[results[i]["role"]] = results[i]["correct_guesses"]
   return { "code": "ok", "data": progress }

# CHECKS IF PLAYERS ARE BOTH READY TO PLAY
@app.post("/room/ready", status_code=200)
def send_sentence(request: Request, user_session_id=Depends(check_session), conn: sqlite3.Connection = Depends(get_db_access)):
   cursor = conn.cursor()
   cursor.execute(
      f"UPDATE {PLAYERS_DB} SET ready = 1 WHERE player_id = (?)",
      (user_session_id,)
   )
   cursor.execute(
      f"SELECT ready FROM {PLAYERS_DB} WHERE room_id = (?) AND player_id <> (?)",
      (request.session["user_session_room"], user_session_id)
   )
   isReady = cursor.fetchone()
   cursor.execute(
      f"SELECT game_started FROM {ROOMS_DB} WHERE id = (?)",
      (request.session["user_session_room"],)
   )
   gameReady = cursor.fetchone()
   if request.session["user_session_role"] == Role.receiver:
      cursor.execute(
         f"INSERT OR IGNORE INTO {RESULTS_DB} (receiver_id, room_id, sentence) VALUES (?,?,?)", 
         (user_session_id,request.session["user_session_room"], SENTENCES[request.session["user_session_room"]])
      )
   if isReady["ready"] == 1 and gameReady["game_started"] != 1:
      cursor.execute(
         f"UPDATE {ROOMS_DB} SET game_started = 1, game_start_time = {int(time.time()* 1000 + TIME_FOR_LOADING)} WHERE id = (?)", 
         (request.session["user_session_room"],)
      )
   return { "code": "ok", "data": True if isReady["ready"] == 1 else False }

class Word(BaseModel):
   index: int

# UPDATES RESULTS WITH TIME ON EACH WORD
@app.post("/room/word", status_code=200)
def send_sentence(body: Word,request: Request, user_session_id=Depends(check_session), conn: sqlite3.Connection = Depends(get_db_access)):
   cursor = conn.cursor()
   cursor.execute(
      f"SELECT game_start_time FROM {ROOMS_DB} WHERE id = (?)",
      (request.session["user_session_room"],)
   )
   start_time = cursor.fetchone()["game_start_time"]
   word_time = int((time.time() * 1000 + TIME_FOR_LOADING) - start_time)
   word_index = "one"
   if body.index == 1: word_index = "two"
   elif body.index == 2: word_index = "three"
   elif body.index == 3: word_index = "four"
   elif body.index == 4: word_index = "five"

   cursor.execute(
      f"UPDATE {RESULTS_DB} SET word_{word_index} = (?) WHERE receiver_id = (?)", 
      (word_time, user_session_id)
   )
   return { "code": "ok" }


class Team_name(BaseModel):
   teamName: str

# CHECKS IF GAME WAS FINISHED AND UPDATES RESULTS
@app.post("/room/finish", status_code=200)
def send_sentence(body: Team_name,request: Request, user_session_id=Depends(check_session), conn: sqlite3.Connection = Depends(get_db_access)):
   cursor = conn.cursor()
   cursor.execute(
      f"SELECT correct_guesses, sentence FROM {PLAYERS_DB} WHERE room_id = (?) AND role = 'receiver'",
      (request.session["user_session_room"],)
   )
   current_state = cursor.fetchone()
   if not current_state["correct_guesses"] == len(current_state["sentence"]):
      return { "code": "ok" }
   cursor.execute(
      f"SELECT SUM(incorrect_guesses) as errors FROM {PLAYERS_DB} WHERE room_id = (?)",
      (request.session["user_session_room"],)
   )
   count_errors = cursor.fetchone()
   print(count_errors["errors"])
   no_errors = True if count_errors["errors"] == 0 else False
   cursor.execute(
      f"SELECT word_one, word_two, word_three, word_four, word_five FROM {RESULTS_DB} WHERE receiver_id = (?)",
      (user_session_id,)
   )
   words = cursor.fetchone()
   if words is None:
      raise HTTPException(status_code=400, detail="Wrong times on words")
   
   correct_words = SENTENCES[request.session["user_session_room"]].split(" ")
   in_time = True
   for i in range(5):
      if words[i] > int(len(correct_words[i]) * TIME_PER_LETTER):
         in_time = False

   if len(body.teamName) > 0:
      cursor.execute(f"UPDATE {RESULTS_DB} SET team_name = ?, room_id = ?, point_no_error = ?, point_time = ? WHERE receiver_id = (?)", 
         (body.teamName, request.session["user_session_room"], 1 if no_errors else 0, 1 if in_time else 0, user_session_id)
      )
   cursor.execute(
      f"UPDATE {PLAYERS_DB} SET ready = 0 WHERE player_id = (?)", 
      (user_session_id,)
   )
   return { "code": "ok", "data": {"no_errors": no_errors, "in_time": in_time  } }

# RESTARTS GAME DATA
@app.post("/room/restart", status_code=200)
def restart(request: Request, user_session_id=Depends(check_session), conn: sqlite3.Connection = Depends(get_db_access)):
   cursor = conn.cursor()
   cursor.execute(f"DELETE FROM {PLAYERS_DB} WHERE player_id = (?)", 
      (request.session["user_session_room"],)
   )
   cursor.execute(f'''
      UPDATE {ROOMS_DB}
      SET last_join_time = {int(time.time()* 1000)}, game_started = 0
      WHERE id IN (
         SELECT room_id FROM {PLAYERS_DB}
         WHERE player_id = ?
      )
   ''', (user_session_id,))
   request.session["user_session_id"] = str(uuid.uuid4())
   cursor.execute(
      f"UPDATE {PLAYERS_DB} SET player_id = (?), correct_guesses = 0, incorrect_guesses = 0 WHERE player_id = (?)", 
      (request.session["user_session_id"], user_session_id )
   )
   return {"code": "ok"}

class Guess(BaseModel):
   letter: str
   index: int

# CHECKS IF LETTER IS CORRECT
@app.post("/room/verify", status_code=200)
def verify_guess(body: Guess, request: Request, user_session_id=Depends(check_session), conn: sqlite3.Connection = Depends(get_db_access)):
   user_room = request.session["user_session_room"]

   if players_attempts_tracker.get(user_session_id) is None:
      players_attempts_tracker.setdefault(user_session_id, {"user_attempts": 0, "user_last_attempt": None})   

   if body.index < 0 or body.index >= len(SENTENCES_TRIMED[user_room]):
      raise HTTPException(status_code=400, detail="Index is not in range")
   
   tracker = players_attempts_tracker.get(user_session_id)
   last_attempt = tracker["user_last_attempt"]
   attempts = tracker["user_attempts"]

   print(body.letter, body.index)
   print(SENTENCES_TRIMED[user_room][body.index], body.letter.lower())

   if last_attempt is not None: 
      time_passed = time.time() - last_attempt
      current_timeout = attempts * BASE_TIMEOUT_IN_SECONDS
      if time_passed < current_timeout:
         raise HTTPException(status_code=429, detail="slow down")
      
   cursor = conn.cursor()

   if SENTENCES_TRIMED[user_room][body.index] != body.letter.lower():
      if attempts < MAX_TIMEOUT_ATTEMPTS:
         tracker["user_attempts"] = attempts + 1
      tracker["user_last_attempt"] = time.time()
      cursor.execute(
         f"UPDATE {PLAYERS_DB} SET incorrect_guesses = incorrect_guesses + 1 WHERE player_id = (?)",
         (user_session_id,)
      )
      conn.commit()
      print(user_session_id, cursor.rowcount)
      raise HTTPException(status_code=400, detail="wrong letter")

   cursor.execute(
      f"UPDATE {PLAYERS_DB} SET correct_guesses = correct_guesses + 1 WHERE player_id = (?)",
      (user_session_id,)
   )
   
   tracker["user_attempts"] = 0
   tracker["user_last_attempt"] = None
   return { "code": "ok", "data": True }

class Letter(BaseModel):
   correct: bool

# UPDATES SENDER SCORE
@app.post("/room/senderGuess", status_code=200)
def set_incorrect_counter(body: Letter, request: Request, user_session_id=Depends(check_session), conn: sqlite3.Connection = Depends(get_db_access)):
   cursor = conn.cursor()
   if body.correct:
      cursor.execute(
         f"UPDATE {PLAYERS_DB} SET correct_guesses = correct_guesses + 1 WHERE player_id = (?)",
         (user_session_id,)
      )
   else:
      cursor.execute(
         f"UPDATE {PLAYERS_DB} SET incorrect_guesses = incorrect_guesses + 1 WHERE player_id = (?)",
         (user_session_id,)
      )
   return {"code": "ok"}