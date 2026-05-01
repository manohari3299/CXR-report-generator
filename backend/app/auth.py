import os
import time
import jwt
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, File, UploadFile, Form
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import bcrypt
from dotenv import load_dotenv

from .database import supabase

load_dotenv()

router = APIRouter()

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-key-change-me-in-production")
JWT_ALGORITHM = "HS256"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_jwt_token(user_data: dict):
    payload = user_data.copy()
    payload.update({"exp": time.time() + 86400}) # 24 hours
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


class TokenRequest(BaseModel):
    token: str

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/register")
async def register(req: RegisterRequest):
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured.")
    
    # Check if user exists
    existing = supabase.select("users", "email", req.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_pwd = get_password_hash(req.password)
    new_user = {
        "email": req.email,
        "name": req.name,
        "password_hash": hashed_pwd
    }
    
    # Insert
    result = supabase.insert("users", new_user)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create user")
        
    user = result[0]
    # Remove password_hash from response
    user.pop("password_hash", None)
    
    token = create_jwt_token(user)
    return {"status": "success", "user": user, "token": token}


@router.post("/login")
async def login(req: LoginRequest):
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured.")
        
    result = supabase.select("users", "email", req.email)
    if not result:
        raise HTTPException(status_code=401, detail="Invalid credentials")
        
    user = result[0]
    if not user.get("password_hash") or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
        
    user.pop("password_hash", None)
    token = create_jwt_token(user)
    return {"status": "success", "user": user, "token": token}


@router.post("/google")
async def verify_google_token(request: TokenRequest):
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured.")
        
    try:
        idinfo = id_token.verify_oauth2_token(
            request.token, 
            google_requests.Request(), 
            GOOGLE_CLIENT_ID
        )

        email = idinfo.get("email")
        name = idinfo.get("name")
        picture = idinfo.get("picture")
        
        # Check if user exists in our DB
        result = supabase.select("users", "email", email)
        
        if result:
            user = result[0]
            # Optionally update picture if changed
            if not user.get("picture_url") and picture:
                supabase.update("users", {"picture_url": picture}, "email", email)
                user["picture_url"] = picture
        else:
            # Create new user from Google payload
            new_user = {
                "email": email,
                "name": name,
                "picture_url": picture
            }
            res = supabase.insert("users", new_user)
            if not res:
                raise Exception("Failed to create Google user in DB")
            user = res[0]
            
        user.pop("password_hash", None)
        token = create_jwt_token(user)
        return {"status": "success", "user": user, "token": token}
        
    except ValueError as e:
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/update-profile")
async def update_profile(
    email: str = Form(...),
    name: str = Form(...),
    file: Optional[UploadFile] = File(None)
):
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured.")
        
    update_data = {"name": name}
    
    if file:
        # Read file contents
        contents = await file.read()
        file_ext = file.filename.split('.')[-1]
        file_name = f"{email}_{int(time.time())}.{file_ext}"
        
        try:
            supabase.upload_file("avatars", file_name, contents, file.content_type)
            public_url = supabase.get_public_url("avatars", file_name)
            update_data["picture_url"] = public_url
        except Exception as e:
            print("Storage upload failed:", e)
            raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")
            
    # Update DB
    result = supabase.update("users", update_data, "email", email)
    
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
        
    user = result[0]
    user.pop("password_hash", None)
    
    return {"status": "success", "user": user}
