# uvicorn main:app --reload

import os
import uuid
import sqlite3
import time
from fastapi import FastAPI, HTTPException, Request, Depends
from pydantic import BaseModel
from starlette.middleware.sessions import SessionMiddleware
from enum import Enum
from dotenv import load_dotenv

# ENV
load_dotenv()
ENV_VARIABLES = os.environ 

# ENDPOINT AND SESSION
app = FastAPI()
app.add_middleware(SessionMiddleware, secret_key=ENV_VARIABLES["SESSION_SECRET"])

# GLOBAL VARIABLES
API_BASE = "/api"
CORRECT_SENTENCE = "Hello me explode fast uś".replace(" ", '').lower()
NUMBER_OF_ROOMS = 4
BASE_TIMEOUT_IN_SECONDS = 1
MAX_TIMEOUT_ATTEMPTS = 5
ROOMS_DB = "rooms"
ROLES_DB = "roles"
PLAYERS_DB = "players"



# SERVER DATA
players_attempts_tracker = {}

# SQL 
def get_db_access():
    conn = sqlite3.connect('game.db')
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
            game_started INTEGER DEFAULT 0
         )
      ''')
      cursor.execute(f'''
         CREATE TABLE IF NOT EXISTS {PLAYERS_DB} (
            player_id TEXT PRIMARY KEY,
            room_id INTEGER NOT NULL,
            role TEXT NOT NULL,
            correct_guesses INTEGER DEFAULT 0,
            wrong_guesses INTEGER DEFAULT 0,
            FOREIGN KEY (room_id) REFERENCES {ROOMS_DB}(id)
         )
      ''')
      conn.commit()
      for i in range(NUMBER_OF_ROOMS):
         cursor.execute(
            "INSERT OR REPLACE INTO rooms(id, name) VALUES (?, ?)",
            [i, f"hello{i}"]
         )
      conn.commit()
   except Exception:
      conn.rollback()
      raise
   finally:
      conn.close()

create_database_tables()

def check_session(request: Request):
   user_session_id = request.session.get("user_session_id")
   if user_session_id is None:
      raise HTTPException(status_code=400, detail="User has no session ID")
   return user_session_id


def ensure_session(request: Request):
   user_session_id = request.session.get("user_session_id")
   if user_session_id is None:
      request.session["user_session_id"] = str(uuid.uuid4())
      players_attempts_tracker.setdefault(user_session_id, {"user_attempts": 0, "user_last_attempt": None})
   return request.session["user_session_id"]


@app.post(f"{API_BASE}/info", status_code=200)
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

@app.post(f"{API_BASE}/join", status_code=200)
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
   print(player_data)
   print(body.role.value)
   print(Role.receiver.value)

   if player_data is not None:
      if player_data["role"] == body.role.value:
         raise HTTPException(status_code=400, detail=f"{body.role.value} slot already taken")

   cursor.execute(f"INSERT INTO {PLAYERS_DB}('player_id', 'room_id', 'role') VALUES (?, ?, ?)", (user_session_id, body.roomNumber, body.role.value))

   redirect = "/waiting"
   cursor.execute(f"SELECT COUNT(player_id) AS player_count FROM {PLAYERS_DB} WHERE room_id = (?)", (body.roomNumber,))
   room_data = cursor.fetchone()

   if room_data["player_count"] == 2:
      cursor.execute(f"UPDATE {ROOMS_DB} SET game_started=1 WHERE id = (?)", (body.roomNumber,))
      redirect = "/room"

   return { "code": "ok", "data": {"redirect": redirect} }


 
class Guess(BaseModel):
   letter: str
   index: int

@app.post(f"{API_BASE}/room/verify", status_code=200)
def verify_guess(body: Guess, request: Request, user_session_id=Depends(check_session)):
   print(body.letter, body.index)
   if body.index < 0 or body.index >= len(CORRECT_SENTENCE):
      raise HTTPException(status_code=400, detail="Index is not in range")
   
   print(CORRECT_SENTENCE[body.index], body.letter.lower())

   if request.session["user_last_attempt"] is not None: 
      time_passed = time.time() - request.session["user_last_attempt"]
      current_timeout = request.session["user_attempts"] * BASE_TIMEOUT_IN_SECONDS
      if time_passed < current_timeout:
         raise HTTPException(status_code=429, detail="slow down")

   if CORRECT_SENTENCE[body.index] != body.letter.lower():
      if request.session["user_attempts"] < MAX_TIMEOUT_ATTEMPTS:
         request.session["user_attempts"] += 1
      request.session["user_last_attempt"] = time.time()
      raise HTTPException(status_code=400, detail="wrong letter")
   
   request.session["user_attempts"] = 0
   request.session["user_last_attempt"] = None
   return { "code": "ok" }




# @app.post(f"{API_BASE}/room/leave", status_code=200)
# def leave_room( request: Request, user_session_id=Depends(check_session)):
#    user_data = players.get(user_session_id)

#    if user_data is not None:
#       rooms[f"""room{user_data["room"]}"""][user_data["role"]] = None
#    if players.get(user_session_id) is not None:
#       del players[user_session_id]

#    request.session["user_session_id"] = str(uuid.uuid4())
#    return { "code": "ok" }