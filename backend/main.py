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

# SERVER DATA
rooms = {}
users_playing = {}
for i in range(NUMBER_OF_ROOMS):
   rooms[f"room{i}"] = {"sender": None, "receiver": None}

# SQL 
conn = sqlite3.connect('game.db')
conn.execute('''
    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name STRING UNIQUE
    )
''')
# for i in range(NUMBER_OF_ROOMS):
#    conn.execute(
#       "INSERT INTO rooms(name) VALUES (?)",
#       (f"hello{i}",)
#    )

conn.execute('''
    CREATE TABLE IF NOT EXISTS senders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room INTEGER UNIQUE NOT NULL,
      correct_guessses INTEGER DEFAULT 0,
      wrong_guesses INTEGER DEFAULT 0,
      FOREIGN KEY (room) REFERENCES rooms(id)
    )
''')
conn.execute('''
    CREATE TABLE IF NOT EXISTS receivers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room INTEGER UNIQUE NOT NULL,
      correct_guessses INTEGER DEFAULT 0,
      wrong_guesses INTEGER DEFAULT 0,
      FOREIGN KEY (room) REFERENCES rooms(id)
    )
''')
conn.commit()




def check_session(request: Request):
   user_session_id = request.session.get("user_session_id")
   if user_session_id is None:
      raise HTTPException(status_code=400, detail="User has no session ID")
   return user_session_id


def ensure_session(request: Request):
   if request.session.get("user_session_id") is None:
      request.session["user_session_id"] = str(uuid.uuid4())
      request.session["user_attempts"] = 0
      request.session["user_last_attempt"] = None
   return request.session["user_session_id"]



@app.post(f"{API_BASE}/info", status_code=200)
def room_info(request: Request, user_session_id=Depends(ensure_session)):
   return { "code": "ok", "data": rooms }



class Role(str, Enum):
    sender = "sender"
    receiver = "receiver"

class Join(BaseModel):
    roomNumber: int
    role: Role

@app.post(f"{API_BASE}/join", status_code=200)
def join_room(body: Join, request: Request, user_session_id=Depends(ensure_session)):
   if body.roomNumber < 0 or body.roomNumber > NUMBER_OF_ROOMS - 1:
      raise HTTPException(status_code=400, detail="roomNumber is not in range")

   if users_playing.get(user_session_id):
      # TODO redirect to specific room
      raise HTTPException(status_code=400, detail="User is already in game")
   
   room_data = rooms[f"room{body.roomNumber}"]

   if room_data[body.role] is not None:
      raise HTTPException(status_code=400, detail=f"{body.role} slot already taken")

   room_data[body.role] = user_session_id
   users_playing[user_session_id] = {"room": body.roomNumber, "role": body.role}
   redirect = "/waiting"

   if body.role == "sender" and room_data["receiver"] is not None:
      redirect = "/room"
   if body.role == "receiver" and room_data["sender"] is not None:
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
      request.session["user_attempts"] += 1
      request.session["user_last_attempt"] = time.time()
      raise HTTPException(status_code=400, detail="wrong letter")
   
   request.session["user_attempts"] =0
   request.session["user_last_attempt"] = None
   return { "code": "ok" }




@app.post(f"{API_BASE}/room/leave", status_code=200)
def leave_room( request: Request, user_session_id=Depends(check_session)):
   user_data = users_playing.get(user_session_id)

   if user_data is not None:
      rooms[f"""room{user_data["room"]}"""][user_data["role"]] = None
   if users_playing.get(user_session_id) is not None:
      del users_playing[user_session_id]

   request.session["user_session_id"] = str(uuid.uuid4())
   return { "code": "ok" }