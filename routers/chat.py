from fastapi import FastAPI, Cookie, Response
from fastapi.responses import HTMLResponse, FileResponse, RedirectResponse, Response
import uvicorn
from random import choice
from fastapi.staticfiles import StaticFiles
import os
from fastapi import APIRouter
from typing import Optional
import sql.sql as sql
from sqlalchemy import URL, create_engine, text, insert, ForeignKey, select, update, func, cast, delete
from sqlalchemy.orm import joinedload, selectinload
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
import secrets

class CreateSession(BaseModel):
    username: str
    password: str

router = APIRouter(prefix='/chat',
                   tags=['chat'])

@router.get('')
async def chat(response: Response, session_value: Optional[str] = Cookie(default=None)):
    if session_value:
        async with sql.as_session() as session:
            response = await session.execute(select(sql.Session).filter_by(token=session_value))
            user = response.scalar_one_or_none()
            if user:
                if user.expires_at < datetime.now(timezone.utc):
                    await session.execute(delete(sql.Session).filter_by(token=session_value))
                else:
                    user.expires_at = datetime.now(timezone.utc) + timedelta(days=30)
                    return FileResponse('static/chat.html')
            await session.commit()

    
                
@router.get('/registration')
async def get_registration(session_value: Optional[str] = Cookie(default=None)):
    if not session_value:
        return FileResponse('static/register.html')

@router.post('/api/registration')
async def registration():
    pass