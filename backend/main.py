import os
import uuid
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from starlette.middleware.sessions import SessionMiddleware
from enum import Enum
from dotenv import load_dotenv

load_dotenv()
ENV_VARIABLES = os.environ 

app = FastAPI()
app.add_middleware(SessionMiddleware, secret_key=ENV_VARIABLES["SESSION_SECRET"])
API_BASE = "/api"


correct_sentence = "Hello me explode fast uś".replace(" ", '').lower()
numberOfRooms = 4

rooms = {}
users_playing = {}

for i in range(numberOfRooms):
   rooms[f"room{i}"] = {"sender": None, "receiver": None}
 
class Guess(BaseModel):
   letter: str
   index: int

@app.post(f"{API_BASE}/room/verify", status_code=200)
def verify_guess(body: Guess, request: Request):
   print(body.letter, body.index)
   if body.index < 0 or body.index >= len(correct_sentence):
      raise HTTPException(status_code=400, detail="index is not in range")
   print(correct_sentence[body.index], body.letter.lower())
   if correct_sentence[body.index] == body.letter.lower():
      return { "code": "ok" }
   raise HTTPException(status_code=400, detail="wrong letter")

@app.post(f"{API_BASE}/info", status_code=200)
def room_info(request: Request):
   if request.session.get("user_session_id") is None:
      request.session["user_session_id"] = str(uuid.uuid4())
   return { "code": "ok", "data": rooms }

class Role(str, Enum):
    sender = "sender"
    receiver = "receiver"

class Join(BaseModel):
    roomNumber: int
    role: Role

@app.post(f"{API_BASE}/join", status_code=200)
def join_room(body: Join, request: Request):
   if body.roomNumber < 0 or body.roomNumber > numberOfRooms - 1:
      raise HTTPException(status_code=400, detail="roomNumber is not in range")
   
   user_session_id = request.session.get("user_session_id")

   if not user_session_id:
      raise HTTPException(status_code=400, detail="User has no session ID")
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