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
import secrets, bcrypt, random

def gen_id():
    return random.randint(10_000_000, 99_999_999)

class Post_Session(BaseModel):
    username: str
    password: str

router = APIRouter(prefix='/chat',
                   tags=['chat'])

@router.get('')
async def chat(response: Response, session: Optional[str] = Cookie(default=None)):
    if session:
        async with sql.as_session() as as_session:
            query = await as_session.execute(select(sql.Session).filter_by(token=session))
            user = query.scalar_one_or_none()
            if user:
                if user.expires_at < datetime.utcnow()  :
                    await as_session.execute(delete(sql.Session).filter_by(token=session))
                    await as_session.commit()
                    response.delete_cookie(key='session')
                    return RedirectResponse('/chat/registration')
                else:
                    user.expires_at = datetime.utcnow()   + timedelta(days=30)
                    await as_session.commit()
            else:
                response.delete_cookie(key='session')
                return RedirectResponse('/chat/registration')
    else:
        return RedirectResponse('/chat/registration')

            
    path = os.path.join("static", "chat.html")
    return FileResponse(path)
    
                
@router.get('/registration')
async def get_registration(response: Response, session: Optional[str] = Cookie(default=None)):
    path = os.path.join('static', 'register.html')
    if session:
        async with sql.as_session() as as_session:
            query = await as_session.execute(select(sql.Session).filter_by(token=session))
            user = query.scalar_one_or_none()
            if user:
                if user.expires_at < datetime.utcnow()  :
                    await as_session.execute(delete(sql.Session).filter_by(token=session))
                    await as_session.commit()
                    response.delete_cookie(key='session')
                    return FileResponse(path)
                else:
                    user.expires_at = datetime.utcnow()   + timedelta(days=100)
                    await as_session.commit()
                    return RedirectResponse('/chat')
            else:
                response.delete_cookie(key='session')
                return FileResponse(path)
    else:
        return FileResponse(path)

    path = os.path.join("static", "chat.html")
    return FileResponse(path)

@router.post('/api/registration')
async def registration(response: Response, user: Post_Session):
    async with sql.as_session() as session:
        query = await session.execute(select(sql.Username).filter_by(username=user.username))
        username = query.scalar_one_or_none()
    if username: #authorizate
        if username.owner_type != sql.Chat_type.private:
            return {'ok': False, 'detail': 'Wrong username'}
        
        async with sql.as_session() as as_session:
            query = await as_session.execute(select(sql.User).filter_by(user_id=username.owner_id))
            person = query.scalar_one_or_none()
            encoded_pw = user.password.encode('utf-8')
            if not bcrypt.checkpw(encoded_pw, person.password.encode('utf-8')):
                return {'ok': False, "detail": "Wrong password"}
            session_token = secrets.token_urlsafe(32)
            new_session = sql.Session(token=session_token, user_id=person.user_id)
            as_session.add_all([new_session])
            await as_session.commit()
            response.set_cookie(key="session", value=session_token)
        return {'ok': True, 'detail': 'Account authorizated'}
    else: #registration
        hashed_pw = (bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt(rounds=12))).decode('utf-8')
        print(len(hashed_pw))
        session_token = secrets.token_urlsafe(32)
        async with sql.as_session() as as_session:
            while True:
                user_id = gen_id()
                if not (await as_session.execute(select(sql.User).filter_by(user_id=user_id))).scalar_one_or_none():
                    break
                
        new_user = sql.User(user_id=user_id, username=user.username, password=hashed_pw, name=user.username)
        new_username = sql.Username(username=user.username, owner_id=user_id, owner_type=sql.Chat_type.private)
        new_session = sql.Session(token=session_token, user_id=user_id)
        async with sql.as_session() as as_session:
            as_session.add_all([new_user, new_session, new_username])
            await as_session.commit()
        response.set_cookie(key='session', value=session_token)
        return {'ok': True, 'detail': 'Account is registrated'}

@router.get('/api/get_chats')
async def get_chats(session: Optional[str] = Cookie(default=None)):
    if not session:
        return {'ok': False, 'detail': 'Session is empty'}
    
    async with sql.as_session() as as_session:
        query = (await as_session.execute(select(sql.Session).filter_by(token=session).options(selectinload(sql.Session.user).selectinload(sql.User.chats)))).scalar_one_or_none()

        if not query:
            return {'ok': False, "detail": 'Wrong session'}
    return {'ok': True, 'detail': 'idk'} 

@router.get('/del')
async def delete_cookie(response: Response, session: Optional[str] = Cookie(default=None)):
    if session:
        response.set_cookie(
            key="session",
            path="/",
            max_age=-1,
            httponly=True,
            samesite="lax"
        )
    return RedirectResponse('/chat')