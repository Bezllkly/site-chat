from fastapi import FastAPI, Cookie, Response, Request, File, UploadFile, Form
from fastapi.responses import HTMLResponse, FileResponse, RedirectResponse, Response
import uvicorn
from fastapi.staticfiles import StaticFiles
import os
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Optional, List
import sql.sql as sql
from sqlalchemy import URL, create_engine, text, insert, ForeignKey, select, update, func, cast, delete, or_, and_
from sqlalchemy.orm import joinedload, selectinload
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
import secrets, bcrypt, random, requests, shutil, magic
import asyncio
from PIL import Image
import cv2

def gen_id():
    return random.randint(10_000_000, 99_999_999)

class Post_Session(BaseModel):
    username: str
    password: str

class Return_chat:
    chat_id: int
    username: str
    chat_type: sql.Chat_type
    avatar: Optional[str]
    title: Optional[str]
    last_message: str

class Post_chat(BaseModel):
    mess_id_from: Optional[int] #from
    type: str
    chat_id: int
    mess_id_until: Optional[int] #until

class Post_search(BaseModel):
    content: str
    type_content: Optional[str]
    ids_chats: Optional[list]

class Post_infochat(BaseModel):
    type: str
    chat_id: int

class Post_join(BaseModel):
    chat_id: int

class Post_sendmess(BaseModel):
    type: str
    chat_id: int

class Update(BaseModel):
    last_sync_at: str
    all_chats_ids: list
    all_private_chats_ids: list

class Post_readmess(BaseModel):
    mess_id: int

router = APIRouter(prefix='/chat',
                   tags=['chat'])

class ConnectionManager:
    def __init__(self):
        # Key: user_id, value: list of WebSocket-connections of user
        self.active_connections: dict[int, list[WebSocket]] = {}
        self.message_queue = asyncio.Queue()

    async def queue_processor(self):
        while True:
            user_id, websocket, data = await self.message_queue.get()
    
    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
    
    def disconnect(self, websocket: WebSocket, user_id: int):
        print("disconnect", user_id)
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
                
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
    
    async def send_to_user(self, user_id: int, message: dict):
        if user_id in self.active_connections:
            print(user_id)
            for ws in self.active_connections[user_id]:
                print('send to', user_id)
                await ws.send_json(message)
    
    async def send_to_users(self, users_id: list, message: dict):
        print(users_id)
        print(self.active_connections)
        for user in users_id:
            await self.send_to_user(user, message)

    def get_user_websockets(self, user_id: int):
        websockets = []
        try:
            websockets = self.active_connections[user_id]
        except KeyError:
            pass
        return websockets

def get_file_quality(file_path, type):
    try:
        if type == sql.Message_type.capture:
            with Image.open(file_path) as img:
                width, height = img.size
        elif type == sql.Message_type.video:
            cap = cv2.VideoCapture(file_path)
            if not cap.isOpened():
                os.remove(file_path)
                return False
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            cap.release()
    except Exception as e:
        os.remove(file_path)
        return False
    return width, height

@router.get('')
async def chat(response: Response, session: Optional[str] = Cookie(default=None)):
    if session:
        async with sql.as_session() as as_session:
            query = await as_session.execute(select(sql.Session).filter_by(token=session))
            user = query.scalar_one_or_none()
            if user:
                if user.expires_at < datetime.now(timezone.utc)  :
                    await as_session.execute(delete(sql.Session).filter_by(token=session))
                    await as_session.commit()
                    response.delete_cookie(key='session')
                    return RedirectResponse('/chat/registration')
                else:
                        user.expires_at = datetime.now(timezone.utc)   + timedelta(days=30)
                        await as_session.commit()
            else:
                response.delete_cookie(key='session')
                return RedirectResponse('/chat/registration')
    else:
        return RedirectResponse('/chat/registration')

            
    path = os.path.join("static", "chat.html")
    return FileResponse(path)

async def websocket_manager(websocket: WebSocket, user_id: int):
    waiting_for_pong = False

    async def websocket_heartbeat():
        nonlocal waiting_for_pong
        while True:
            try:
                pass
                # await websocket.send_json({'type': 'ping'})
            except:
                return
            waiting_for_pong = False #True
            start = asyncio.get_event_loop().time()

            while waiting_for_pong:
                if asyncio.get_event_loop().time() - start > 5 :  # 5 seconds timeout
                    print('pong not recieved')
                    await websocket.close(code=1000, reason='Heartbeat timeout')
                    manager.disconnect(websocket, user_id)
                    return
                await asyncio.sleep(1)
            await asyncio.sleep(5)  # Send ping every 5 seconds
                
    async def websocket_receiver():
        nonlocal waiting_for_pong
        while True:
            try:
                data = await websocket.receive_json()
                if data.get('type') == 'pong':
                    waiting_for_pong = False
                elif data.get('type') == 'ping':
                    await websocket.send_json({'type': 'pong'})
                else:
                    await manager.message_queue.put((user_id, websocket, data))
            except WebSocketDisconnect:
                manager.disconnect(websocket, user_id)
                return
            except Exception as e:
                return
    
    heartbeat_task = asyncio.create_task(websocket_heartbeat())
    receiver_task = asyncio.create_task(websocket_receiver())

    await receiver_task
    heartbeat_task.cancel()
        

manager = ConnectionManager()

@router.websocket("/ws")
async def webcon(websocket: WebSocket, session: str = Cookie(default=None)):
    async with sql.as_session() as as_session:
        session_db = (await as_session.execute(select(sql.Session).filter_by(token=session).options(selectinload(sql.Session.user).selectinload(sql.User.sessions)))).scalar_one_or_none()
    if not session_db:
        await websocket.close(code=1008, reason='Unathorized')
        return
    if len(manager.active_connections.get(session_db.user_id, [])) > len(session_db.user.sessions):
        await websocket.close(code=4008, reason='Too many connections per user')
        return
    
    await manager.connect(websocket, session_db.user_id)
    await asyncio.create_task(websocket_manager(websocket, session_db.user_id))

    

@router.get('/registration')
async def get_registration(response: Response, session: Optional[str] = Cookie(default=None)):
    path = os.path.join('static', 'register.html')
    if session:
        async with sql.as_session() as as_session:
            query = await as_session.execute(select(sql.Session).filter_by(token=session))
            user = query.scalar_one_or_none()
            if user:
                if user.expires_at < datetime.now(timezone.utc):
                    await as_session.execute(delete(sql.Session).filter_by(token=session))
                    await as_session.commit()
                    response.delete_cookie(key='session')
                    return FileResponse(path)
                else:
                    user.expires_at = datetime.now(timezone.utc)   + timedelta(days=100)
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
async def registration(response: Response, request: Request, user: Post_Session):
    if (not user.username) or (not user.password):
        return {'ok': False, 'detail': 'Username or password is empty'}
    if len(user.username) > 30:
        return {'ok': False, 'detail': 'Username must be less than 30'}
    if len(user.password) > 30:
        return {'ok': False, 'detail': "Password must be less than 30"}
    
    try:
        answer = requests.get(f'https://ipinfo.io/{request.client.host}/json', timeout=3)
    except:
        pass
    if not answer.ok:
        print('Ошибка запроса к домену ipinfo.io')
        country = None
        region = None
    else:
        answer_json = answer.json()
        country = answer_json.get('country')
        region = answer_json.get('region')

    user_agent = request.headers.get('user-agent')

    async with sql.as_session() as as_session:
        query = await as_session.execute(select(sql.Username).filter_by(username=user.username))
        username = query.scalar_one_or_none()
        if username: #authorizate
            if username.owner_type != sql.Chat_type.private:
                return {'ok': False, 'detail': 'Wrong username'}
            
            query = await as_session.execute(select(sql.User).filter_by(user_id=username.owner_id))
            person = query.scalar_one_or_none()
            encoded_pw = user.password.encode('utf-8')
            if not bcrypt.checkpw(encoded_pw, person.password.encode('utf-8')):
                return {'ok': False, "detail": "Wrong password"}
            session_token = secrets.token_urlsafe(32)
            new_session = sql.Session(token=session_token, user_id=person.user_id, country=country, region=region, user_agent=user_agent, ip_address=request.client.host)

            as_session.add_all([new_session])
            await as_session.commit()
            response.set_cookie(key="session", value=session_token, max_age=31536000)
            return {'ok': True, 'detail': session_token}
        else: #registration
            #create globalchat
            global_chat = (await as_session.execute(select(sql.Chat).filter_by(username='global'))).scalar_one_or_none()
            if not global_chat:
                pass
                #requests.post('localhost:1234/chat/api/create_chat', json={'image': None, 'chat_name': 'Global', 'chat_username': 'global', 'chat_type': 'group', 'chat_desc': 'Global chat'})
            else:
                pass
                #requests.post('localhost:1234/chat/api/')

            hashed_pw = (bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt(rounds=12))).decode('utf-8')
            print(len(hashed_pw))
            session_token = secrets.token_urlsafe(32)
            while True:
                user_id = gen_id()
                if not (await as_session.execute(select(sql.User).filter_by(user_id=user_id))).scalar_one_or_none():
                    break
                    
            new_user = sql.User(user_id=user_id, username=user.username, password=hashed_pw, name=user.username)
            new_username = sql.Username(username=user.username, owner_id=user_id, owner_type=sql.Chat_type.private)
            new_session = sql.Session(token=session_token, user_id=user_id, country=country, region=region, user_agent=user_agent, ip_address=request.client.host)
            async with sql.as_session() as as_session:
                as_session.add_all([new_user, new_session, new_username])
                await as_session.commit()
            response.set_cookie(key='session', value=session_token, max_age=31536000)
            return {'ok': True, 'detail': session_token}

@router.post('/api/send_mess')
async def send_mess(text = Form(default=None), files: Optional[List[UploadFile]] = File(default=None), chat_id = Form(), chat_type = Form(), session = Cookie(default=None)):
    if not session:
        return {'ok': False, 'detail': 'Not authorized'}
    if not text and not files:
        return {'ok': False, 'detail': 'The message is empty'}
    
    async with sql.as_session() as as_session:
        if chat_type == 'private':
            session_db = (await as_session.execute(select(sql.Session).filter_by(token=session).options(selectinload(sql.Session.user)))).scalar_one_or_none()
            if not session_db or session_db.expires_at < datetime.now(timezone.utc):
                return {'ok': False, 'detail': 'Session is expired'}
            user_db = (await as_session.execute(select(sql.User).filter_by(user_id=int(chat_id)).options(selectinload(sql.User.private_chats1), selectinload(sql.User.private_chats2)))).scalar_one_or_none()
            if not user_db:
                return {'ok': False, 'detail': 'No result'}
                
            private_chat = (await as_session.execute(select(sql.Private_Chat).options(selectinload(sql.Private_Chat.user1), selectinload(sql.Private_Chat.user2)).filter(or_(and_(sql.Private_Chat.user1_id == user_db.user_id, sql.Private_Chat.user2_id == session_db.user_id), and_(sql.Private_Chat.user1_id == session_db.user_id, sql.Private_Chat.user2_id == user_db.user_id))))).scalar_one_or_none()
            if not private_chat:
                private_chat = sql.Private_Chat(user1_id=session_db.user_id, user2_id=user_db.user_id)
                as_session.add(private_chat)
                await as_session.flush()

                if private_chat.user1_id == session_db.user_id:
                    interlocutor = user_db
                else:
                    interlocutor = session_db.user
            else:
                if private_chat.user1_id == session_db.user_id:
                    interlocutor = private_chat.user2
                else:
                    interlocutor = private_chat.user1

            new_objs = []
            if files and len(files) > 1:
                for file in files:
                    if file.size > 1073741824:
                        continue

                    mime_type = file.content_type
                    mess_type = sql.Message_type.capture if mime_type.startswith('image/') else sql.Message_type.video if mime_type.startswith('video/') else sql.Message_type.file 
                    file_origname = file.filename
                    file_type = os.path.splitext(file.filename)[1].lower()
                    file_name_db = secrets.token_urlsafe(16) + file_type
                    try:
                        os.makedirs(os.path.join('attach_files', str(private_chat.id)))
                    except:
                        pass
                    
                    file_path = os.path.join('attach_files', str(private_chat.id), file_name_db)
                    with open(file_path, 'wb') as buffer:
                        shutil.copyfileobj(file.file, buffer)
                    if mess_type in (sql.Message_type.capture, sql.Message_type.video):
                        size = get_file_quality(file_path, mess_type)
                        if size:
                            width, height = size
                        else:
                            return {'ok': False, 'detail': 'Wrong file type'}
                    else:
                        width = None
                        height = None

                    new_file = sql.File(width=width, height=height, file_name=file_name_db, user_id=session_db.user_id, file_path=file_path, file_origname=file_origname, file_type=file_type, file_size=file.size, private_chat_id=int(private_chat.id))
                    as_session.add(new_file)
                    await as_session.flush()
                    new_mess = sql.Message(created_by_id=session_db.user_id, private_chat_id=int(private_chat.id), attachment_id=new_file.id, type=mess_type)
                    as_session.add(new_mess)
                    await as_session.flush()

                    await manager.send_to_user(session_db.user_id, {'type': 'new_message', 'message': {'chat_id': interlocutor.user_id, 'created_by': new_mess.created_by_id, 'chat_type': 'private', 'from_user_id': session_db.user_id, 'from_user_name': session_db.user.name, 'last_message': '', 'mess_type': mess_type.value, 'created_at': datetime.now(timezone.utc).isoformat(), 'attach_link': f'/chat/api/attach/{new_file.private_chat_id}/{new_file.file_name}', 'file_name': new_file.file_origname, 'file_size': new_file.file_size, 'file_type': new_file.file_type, 'file_height': new_file.height, 'file_width':new_file.width, 'title': interlocutor.name, 'username': interlocutor.username, 'mess_id': new_mess.id}})
                    await manager.send_to_user(interlocutor.user_id, {'type': 'new_message', 'message': {'chat_id': session_db.user.user_id, 'created_by': new_mess.created_by_id, 'chat_type': 'private', 'from_user_id': session_db.user_id, 'from_user_name': session_db.user.name, 'last_message': '', 'mess_type': mess_type.value, 'created_at': datetime.now(timezone.utc).isoformat(), 'attach_link': f'/chat/api/attach/{new_file.private_chat_id}/{new_file.file_name}', 'file_name': new_file.file_origname, 'file_size': new_file.file_size, 'file_type': new_file.file_type, 'file_height': new_file.height, 'file_width':new_file.width, 'title': session_db.user.name, 'username': session_db.user.username, 'mess_id': new_mess.id}})
                if text:
                    new_mess = sql.Message(created_by_id=session_db.user_id, text=text, private_chat_id=int(private_chat.id), type=sql.Message_type.text)
                    as_session.add(new_mess)
                    await as_session.flush()

                    await manager.send_to_user(session_db.user_id, {'type': 'new_message', 'message': {'chat_id': interlocutor.user_id, 'created_by': new_mess.created_by_id, 'chat_type': 'private', 'from_user_id': session_db.user_id, 'from_user_name': session_db.user.name, 'last_message': text if text else '', 'mess_type': 'text', 'created_at': datetime.now(timezone.utc).isoformat(), 'title': interlocutor.name, 'username': interlocutor.username, 'mess_id': new_mess.id}})
                    await manager.send_to_user(interlocutor.user_id, {'type': 'new_message', 'message': {'chat_id': session_db.user.user_id, 'created_by': new_mess.created_by_id, 'chat_type': 'private', 'from_user_id': session_db.user_id, 'from_user_name': session_db.user.name, 'last_message': text if text else '', 'mess_type': 'text', 'created_at': datetime.now(timezone.utc).isoformat(), 'title': session_db.user.name, 'username': session_db.user.username, 'mess_id': new_mess.id}})

            elif files: #one file
                file = files[0]
                if file.size > 1073741824:
                    return {'ok': False, 'detail': 'The file is too large'}
                mime_type = file.content_type
                mess_type = sql.Message_type.capture if mime_type.startswith('image/') else sql.Message_type.video if mime_type.startswith('video/') else sql.Message_type.file
                file_origname = file.filename
                file_type = os.path.splitext(file.filename)[1].lower()
                file_name_db = secrets.token_urlsafe(16) + file_type
                try:
                    os.makedirs(os.path.join('attach_files', str(private_chat.id)))
                except:
                    pass
                
                file_path = os.path.join('attach_files', str(private_chat.id), file_name_db)
                with open(file_path, 'wb') as buffer:
                    shutil.copyfileobj(file.file, buffer)

                if mess_type in (sql.Message_type.capture, sql.Message_type.video):
                    size = get_file_quality(file_path, mess_type)
                    if size:
                        width, height = size
                    else:
                        return {'ok': False, 'detail': 'Wrong file type'}
                else:
                    width = None
                    height = None

                new_file = sql.File(width=width, height=height, file_name=file_name_db, user_id=session_db.user_id, file_path=file_path, file_origname=file_origname, file_type=file_type, file_size=file.size, private_chat_id=int(private_chat.id))
                as_session.add(new_file)
                await as_session.flush()
                new_mess = sql.Message(created_by_id=session_db.user_id, text=text, private_chat_id=int(private_chat.id), attachment_id=new_file.id, type=mess_type)
                as_session.add(new_mess)
                await as_session.flush()

                await manager.send_to_user(session_db.user_id, {'type': 'new_message', 'message': {'chat_id': interlocutor.user_id, 'created_by': new_mess.created_by_id, 'created_at': datetime.now(timezone.utc).isoformat(), 'chat_type': 'private', 'from_user_id': session_db.user_id, 'from_user_name': session_db.user.name, 'last_message': text if text else '', 'mess_type': mess_type.value, 'attach_link': f'/chat/api/attach/{new_file.private_chat_id}/{new_file.file_name}', 'file_name': new_file.file_origname, 'file_size': new_file.file_size, 'file_type': new_file.file_type, 'file_height': new_file.height, 'file_width':new_file.width, 'title': interlocutor.name, 'username': interlocutor.username, 'mess_id': new_mess.id}})
                await manager.send_to_user(interlocutor.user_id, {'type': 'new_message', 'message': {'chat_id': session_db.user_id, 'created_by': new_mess.created_by_id, 'created_at': datetime.now(timezone.utc).isoformat(), 'chat_type': 'private', 'from_user_id': session_db.user_id, 'from_user_name': session_db.user.name, 'last_message': text if text else '', 'mess_type': mess_type.value, 'attach_link': f'/chat/api/attach/{new_file.private_chat_id}/{new_file.file_name}', 'file_name': new_file.file_origname, 'file_size': new_file.file_size, 'file_type': new_file.file_type, 'file_height': new_file.height, 'file_width':new_file.width, 'title': session_db.user.name, 'username': session_db.user.username, 'mess_id': new_mess.id}})
            else:
                new_mess = sql.Message(created_by_id=session_db.user_id, text=text, private_chat_id=int(private_chat.id), type=sql.Message_type.text)
                as_session.add(new_mess)
                await as_session.flush()
                await manager.send_to_user(session_db.user_id, {'type': 'new_message', 'message': {'chat_id': interlocutor.user_id, 'created_by': new_mess.created_by_id, 'created_at': datetime.now(timezone.utc).isoformat(), 'chat_type': 'private', 'from_user_id': session_db.user_id, 'from_user_name': session_db.user.name, 'last_message': text if text else '', 'mess_type': 'text', 'title': interlocutor.name, 'username': interlocutor.username, 'mess_id': new_mess.id}})
                await manager.send_to_user(interlocutor.user_id, {'type': 'new_message', 'message': {'chat_id': session_db.user_id, 'created_by': new_mess.created_by_id, 'created_at': datetime.now(timezone.utc).isoformat(), 'chat_type': 'private', 'from_user_id': session_db.user_id, 'from_user_name': session_db.user.name, 'last_message': text if text else '', 'mess_type': 'text', 'title': session_db.user.name, 'username': session_db.user.username, 'mess_id': new_mess.id}})
            
            private_chat.last_message_id = new_mess.id
            private_chat.last_message_content = text if text else '[File]' 
            private_chat.last_message_author_id = session_db.user_id
            private_chat.last_message_author_name = session_db.user.name
            
            as_session.add_all(new_objs)
            await as_session.commit()
            return {'ok': True, 'detail': 'Good'}

        elif chat_type == 'group':
            session_db = (await as_session.execute(select(sql.Session).filter_by(token=session).options(selectinload(sql.Session.user)))).scalar_one_or_none()
            if not session_db or session_db.expires_at < datetime.now(timezone.utc):
                return {'ok': False, 'detail': 'Not authorized'}
            chatmember_db = (await as_session.execute(select(sql.ChatMember).filter_by(user_id=session_db.user_id, chat_id=int(chat_id)))).scalar_one_or_none()
            if not chatmember_db:
                return {'ok': False, 'detail': 'Not chatmember'}
                
            chat_db = (await as_session.execute(select(sql.Chat).filter_by(chat_id=int(chat_id)).filter(sql.Chat.members.any(sql.ChatMember.user_id==session_db.user_id)).options(selectinload(sql.Chat.members)))).scalar_one_or_none()
            if not chat_db:
                return {'ok': False, 'detail': 'didnt join'}
                
            chatmembs_in_chat = [chatmember.user_id for chatmember in chat_db.members]
        
            new_objs = []
            if files and len(files) > 1:
                for file in files:
                    if file.size > 1073741824:
                        continue

                    mime_type = file.content_type
                    mess_type = sql.Message_type.capture if mime_type.startswith('image/') else sql.Message_type.video if mime_type.startswith('video/') else sql.Message_type.file 

                    file_origname = file.filename
                    file_type = os.path.splitext(file.filename)[1].lower()
                    file_name_db = secrets.token_urlsafe(16) + file_type
                    try:
                        os.makedirs(os.path.join('attach_files', str(chat_id)))
                    except:
                        pass
                    
                    file_path = os.path.join('attach_files', str(chat_id), file_name_db)

                    with open(file_path, 'wb') as buffer:
                        shutil.copyfileobj(file.file, buffer)
                    
                    if mess_type in (sql.Message_type.capture, sql.Message_type.video):
                        size = get_file_quality(file_path, mess_type)
                        if size:
                            width, height = size
                        else:
                            return {'ok': False, 'detail': 'Wrong file type'}
                    else:
                        width = None
                        height = None
                    
                    new_file = sql.File(width=width, height=height, file_name=file_name_db, chatmember_id=chatmember_db.id, user_id=session_db.user_id, file_path=file_path, file_origname=file_origname, file_type=file_type, file_size=file.size, chat_id=int(chat_id))
                    as_session.add(new_file)
                    await as_session.flush()
                    new_mess = sql.Message(created_by_id=session_db.user_id, chat_id=int(chat_id), attachment_id=new_file.id, type=mess_type)
                    await manager.send_to_users(chatmembs_in_chat, {'type': 'new_message', 'message': {'chat_id': chat_db.chat_id, 'created_by': new_mess.created_by_id, 'created_at': datetime.now(timezone.utc).isoformat(), 'chat_type': 'group', 'from_user_id': session_db.user_id, 'from_user_name': session_db.user.name, 'last_message': text if text else '', 'mess_type': mess_type.value, 'attach_link': f'/chat/api/attach/{new_file.chat_id}/{new_file.file_name}', 'file_name': new_file.file_origname, 'file_size': new_file.file_size, 'file_type': new_file.file_type, 'file_height': new_file.height, 'file_width':new_file.width, 'title': chat_db.title, 'username': chat_db.username, 'mess_id': new_mess.id}})
                    new_objs.append(new_mess)
                if text:
                    new_mess = sql.Message(created_by_id=session_db.user_id, text=text, chat_id=int(chat_id), type=sql.Message_type.text)
                    await manager.send_to_users(chatmembs_in_chat, {'type': 'new_message', 'message': {'chat_id': chat_db.chat_id, 'created_by': new_mess.created_by_id, 'created_at': datetime.now(timezone.utc).isoformat(), 'chat_type': 'group', 'from_user_id': session_db.user_id, 'from_user_name': session_db.user.name, 'last_message': text if text else '', 'mess_type': 'text', 'title': chat_db.title, 'username': chat_db.username, 'mess_id': new_mess.id}})
                    new_objs.append(new_mess)
            elif files:
                file = files[0]
                if file.size > 1073741824:
                    return {'ok': False, 'detail': 'The file is too large'}

                mime_type = file.content_type
                mess_type = sql.Message_type.capture if mime_type.startswith('image/') else sql.Message_type.video if mime_type.startswith('video/') else sql.Message_type.file

                file_origname = file.filename
                file_type = os.path.splitext(file.filename)[1].lower()
                file_name_db = secrets.token_urlsafe(16) + file_type
                try:
                    os.makedirs(os.path.join('attach_files', str(chat_id)))
                except:
                    pass
                
                file_path = os.path.join('attach_files', str(chat_id), file_name_db)
                with open(file_path, 'wb') as buffer:
                    shutil.copyfileobj(file.file, buffer)

                if mess_type in (sql.Message_type.capture, sql.Message_type.video):
                    size = get_file_quality(file_path, mess_type)
                    if size:
                        width, height = size
                    else:
                        return {'ok': False, 'detail': 'Wrong file type'}
                else:
                    width = None
                    height = None

                new_file = sql.File(width=width, height=height, file_name=file_name_db, chatmember_id=chatmember_db.id, user_id=session_db.user_id, file_path=file_path, file_origname=file_origname, file_type=file_type, file_size=file.size, chat_id=int(chat_id))
                as_session.add(new_file)
                await as_session.flush()
                new_mess = sql.Message(created_by_id=session_db.user_id, text=text, chat_id=int(chat_id), attachment_id=new_file.id, type=mess_type)
                await manager.send_to_users(chatmembs_in_chat, {'type': 'new_message', 'message': {'chat_id': chat_db.chat_id, 'created_by': new_mess.created_by_id, 'created_at': datetime.now(timezone.utc).isoformat(), 'chat_type': 'group', 'from_user_id': session_db.user_id, 'from_user_name': session_db.user.name, 'last_message': text if text else '', 'mess_type': mess_type.value, 'attach_link': f'/chat/api/attach/{new_file.chat_id}/{new_file.file_name}', 'file_name': new_file.file_origname, 'file_size': new_file.file_size, 'file_type': new_file.file_type, 'file_height': new_file.height, 'file_width':new_file.width, 'title': chat_db.title, 'username': chat_db.username, 'mess_id': new_mess.id}})
                new_objs.append(new_mess)
            else:
                new_mess = sql.Message(created_by_id=session_db.user_id, text=text, chat_id=int(chat_id), type=sql.Message_type.text)
                await manager.send_to_users(chatmembs_in_chat, {'type': 'new_message', 'message': {'chat_id': chat_db.chat_id, 'created_by': new_mess.created_by_id, 'created_at': datetime.now(timezone.utc).isoformat(), 'chat_type': 'group', 'from_user_id': session_db.user_id, 'from_user_name': session_db.user.name, 'last_message': text if text else '', 'mess_type': 'text', 'title': chat_db.title, 'username': chat_db.username, 'mess_id': new_mess.id}})
                new_objs.append(new_mess)

            chat_db.last_message_id = new_mess.id
            chat_db.last_message_content = text if text else '[File]' 
            chat_db.last_message_author_id = session_db.user_id
            chat_db.last_message_author_name = session_db.user.name

            as_session.add_all(new_objs)
            await as_session.commit()
            return {'ok': True, 'detail': 'Good'}
        
        else: #channel
            session_db = (await as_session.execute(select(sql.Session).filter_by(token=session).options(selectinload(sql.Session.user)))).scalar_one_or_none()
            if not session_db or session_db.expires_at < datetime.now(timezone.utc):
                return {'ok': False, 'detail': 'Not authorized'}
            chatmember_db = (await as_session.execute(select(sql.ChatMember).filter_by(user_id=session_db.user_id, chat_id=int(chat_id)))).scalar_one_or_none()
            if not chatmember_db:
                return {'ok': False, 'detail': 'Not chatmember'}
                
            if chatmember_db.role == 'member':
                return {'ok': False, 'detail': 'No rights'}

            chat_db = (await as_session.execute(select(sql.Chat).filter_by(chat_id=int(chat_id)).filter(sql.Chat.members.any(sql.ChatMember.user_id==session_db.user_id)).options(selectinload(sql.Chat.members)))).scalar_one_or_none()
            if not chat_db:
                return {'ok': False, 'detail': 'didnt join'}
                
            chatmembs_in_chat = [chatmemb.user_id for chatmemb in chat_db.members]

            new_objs = []
            if files and len(files) > 1:
                for file in files:
                    if file.size > 1073741824:
                        continue

                    mime_type = file.content_type
                    mess_type = sql.Message_type.capture if mime_type.startswith('image/') else sql.Message_type.video if mime_type.startswith('video/') else sql.Message_type.file 

                    file_origname = file.filename
                    file_type = os.path.splitext(file.filename)[1].lower()
                    file_name_db = secrets.token_urlsafe(16) + file_type
                    try:
                        os.makedirs(os.path.join('attach_files', str(chat_id)))
                    except:
                        pass
                    
                    file_path = os.path.join('attach_files', str(chat_id), file_name_db)

                    with open(file_path, 'wb') as buffer:
                        shutil.copyfileobj(file.file, buffer)
                    
                    if mess_type in (sql.Message_type.capture, sql.Message_type.video):
                        size = get_file_quality(file_path, mess_type)
                        if size:
                            width, height = size
                        else:
                            return {'ok': False, 'detail': 'Wrong file type'}
                    else:
                        width = None
                        height = None
                    
                    new_file = sql.File(width=width, height=height, file_name=file_name_db, chatmember_id=chatmember_db.id, user_id=session_db.user_id, file_path=file_path, file_origname=file_origname, file_type=file_type, file_size=file.size, chat_id=int(chat_id))
                    as_session.add(new_file)
                    await as_session.flush()
                    new_mess = sql.Message(created_by_id=session_db.user_id, chat_id=int(chat_id), attachment_id=new_file.id, type=mess_type)
                    await manager.send_to_users(chatmembs_in_chat, {'type': 'new_message', 'message': {'chat_id': chat_db.chat_id, 'created_by': new_mess.created_by_id, 'created_at': datetime.now(timezone.utc).isoformat(), 'chat_type': 'channel', 'from_user_id': session_db.user_id, 'from_user_name': session_db.user.name, 'last_message': text if text else '', 'mess_type': mess_type.value, 'attach_link': f'/chat/api/attach/{new_file.chat_id}/{new_file.file_name}', 'file_name': new_file.file_origname, 'file_size': new_file.file_size, 'file_type': new_file.file_type, 'file_height': new_file.height, 'file_width':new_file.width, 'title': chat_db.title, 'username': chat_db.username, 'mess_id': new_mess.id}})
                    new_objs.append(new_mess)
                if text:
                    new_mess = sql.Message(created_by_id=session_db.user_id, text=text, chat_id=int(chat_id), type=sql.Message_type.text)
                    await manager.send_to_users(chatmembs_in_chat, {'type': 'new_message', 'message': {'chat_id': chat_db.chat_id, 'created_by': new_mess.created_by_id, 'created_at': datetime.now(timezone.utc).isoformat(), 'chat_type': 'channel', 'from_user_id': session_db.user_id, 'from_user_name': session_db.user.name, 'last_message': text if text else '', 'mess_type': 'text', 'title': chat_db.title, 'username': chat_db.username, 'mess_id': new_mess.id}})
                    new_objs.append(new_mess)
            elif files:
                file = files[0]
                if file.size > 1073741824:
                    return {'ok': False, 'detail': 'The file is too large'}

                mime_type = file.content_type
                mess_type = sql.Message_type.capture if mime_type.startswith('image/') else sql.Message_type.video if mime_type.startswith('video/') else sql.Message_type.file

                file_origname = file.filename
                file_type = os.path.splitext(file.filename)[1].lower()
                file_name_db = secrets.token_urlsafe(16) + file_type
                try:
                    os.makedirs(os.path.join('attach_files', str(chat_id)))
                except:
                    pass
                
                file_path = os.path.join('attach_files', str(chat_id), file_name_db)
                with open(file_path, 'wb') as buffer:
                    shutil.copyfileobj(file.file, buffer)

                if mess_type in (sql.Message_type.capture, sql.Message_type.video):
                    size = get_file_quality(file_path, mess_type)
                    if size:
                        width, height = size
                    else:
                        return {'ok': False, 'detail': 'Wrong file type'}
                else:
                    width = None
                    height = None

                new_file = sql.File(width=width, height=height, file_name=file_name_db, chatmember_id=chatmember_db.id, user_id=session_db.user_id, file_path=file_path, file_origname=file_origname, file_type=file_type, file_size=file.size, chat_id=int(chat_id))
                as_session.add(new_file)
                await as_session.flush()
                new_mess = sql.Message(created_by_id=session_db.user_id, text=text, chat_id=int(chat_id), attachment_id=new_file.id, type=mess_type)
                await manager.send_to_users(chatmembs_in_chat, {'type': 'new_message', 'message': {'chat_id': chat_db.chat_id, 'created_by': new_mess.created_by_id, 'created_at': datetime.now(timezone.utc).isoformat(), 'chat_type': 'channel', 'from_user_id': session_db.user_id, 'from_user_name': session_db.user.name, 'last_message': text if text else '', 'mess_type': mess_type.value, 'attach_link': f'/chat/api/attach/{new_file.chat_id}/{new_file.file_name}', 'file_name': new_file.file_origname, 'file_size': new_file.file_size, 'file_type': new_file.file_type, 'file_height': new_file.height, 'file_width':new_file.width, 'title': chat_db.title, 'username': chat_db.username, 'mess_id': new_mess.id}})
                new_objs.append(new_mess)
            else:
                new_mess = sql.Message(created_by_id=session_db.user_id, text=text, chat_id=int(chat_id), type=sql.Message_type.text)
                await manager.send_to_users(chatmembs_in_chat, {'type': 'new_message', 'message': {'chat_id': chat_db.chat_id, 'created_by': session_db.user_id, 'created_at': datetime.now(timezone.utc).isoformat(), 'chat_type': 'channel', 'from_user_id': session_db.user_id, 'from_user_name': session_db.user.name, 'last_message': text if text else '', 'mess_type': 'text', 'title': chat_db.title, 'username': chat_db.username, 'mess_id': new_mess.id}})
                new_objs.append(new_mess)

            chat_db.last_message_id = new_mess.id
            chat_db.last_message_content = text if text else '[File]' 
            chat_db.last_message_author_id = session_db.user_id
            chat_db.last_message_author_name = session_db.user.name

            as_session.add_all(new_objs)
            await as_session.commit()
            return {'ok': True, 'detail': 'Good'}
            

@router.post('/api/join_chat')
async def join_chat(chat: Post_join, session= Cookie(default=None)):
    if not session:
        return {'ok': False, 'detail': 'Not authorized'}
    
    async with sql.as_session() as as_session:
        session_db = (await as_session.execute(select(sql.Session).filter_by(token=session))).scalar_one_or_none()
        if not session_db or session_db.expires_at < datetime.now(timezone.utc):
            return {'ok': False, 'detail': 'Not authorized'}
        user = (await as_session.execute(select(sql.User).filter_by(user_id=session_db.user_id))).scalar_one_or_none()
        if not user:
            return {'ok': False, 'detail': 'Something wrong'}
            
        chat_db = (await as_session.execute(select(sql.Chat).filter_by(chat_id=chat.chat_id).filter(sql.Chat.members.any(sql.ChatMember.user_id!=user.user_id)))).scalar_one_or_none()
        if not chat_db:
            return {'ok': False, 'detail': 'No result'}
                    
        new_chatmemb = sql.ChatMember(user_id=user.user_id, chat_id=chat_db.chat_id)
        as_session.add(new_chatmemb)
        await as_session.commit()
        await manager.send_to_user(session_db.user_id, {'type': 'new_chat', 'chat': {'chat_id': chat_db.chat_id, 'username': chat_db.username, 'chat_type': chat_db.type.value, 'avatar': chat_db.avatar, 'title': chat_db.title, 'last_message': chat_db.last_message_content, 'last_update_at': datetime.now(timezone.utc).isoformat()}})
    
    return {'ok': True, 'detail': 'Success'}
            

@router.post('/api/get_chat')
async def get_chat(chat: Post_infochat, session = Cookie(default=None)):
    if not session:
        return {'ok': False, 'detail': 'Not authorized'}
    
    async with sql.as_session() as as_session:
        session_db = (await as_session.execute(select(sql.Session).filter_by(token=session))).scalar_one_or_none()
        if not session_db or session_db.expires_at < datetime.now(timezone.utc):
            return {'ok': False, 'detail': 'Session is expired'}
            
        user = (await as_session.execute(select(sql.User).filter_by(user_id=session_db.user_id).options(selectinload(sql.User.chats), selectinload(sql.User.private_chats1), selectinload(sql.User.private_chats2)))).scalar_one_or_none()
        if not user:
            return {'ok': False, 'detail': 'Something wrong'}
        
        if chat.type == 'private':
            user_db = (await as_session.execute(select(sql.User).filter_by(user_id=chat.chat_id))).scalar_one_or_none()
            if not user_db:
                return {'ok': False, 'detail': 'No result user'}
            is_member = False
            for private_chat in user.private_chats1:
                if private_chat.user2_id == chat.chat_id:
                    is_member = True
                    break
            else:
                for private_chat in user.private_chats2:
                    if private_chat.user1_id == chat.chat_id:
                        is_member = True
                        break
            return {'ok': True, 'detail': {'chat_id': user_db.user_id, 'title': user_db.name, 'avatar': user_db.avatar, 'desc': user_db.description, 'type': 'private', 'created_at': user_db.created_at, 'is_member': is_member}}
        else:
            chat_db = (await as_session.execute(select(sql.Chat).filter_by(chat_id=chat.chat_id))).scalar_one_or_none()
            if not chat_db:
                return {'ok': False, 'detail': 'No result'}
            is_member = False
            for chatmemb in user.chats:
                if chatmemb.chat_id == chat.chat_id:
                    is_member = True
                    break

            is_admin = False
            if chat_db.created_by == session_db.user_id:
                is_admin = True
            return {'ok': True, 'detail': {'chat_id': chat_db.chat_id, 'is_admin': is_admin, 'title': chat_db.title, 'avatar': chat_db.avatar, 'desc': chat_db.description, 'type': chat_db.type, 'created_by': chat_db.created_by, 'created_at': chat_db.created_at, 'is_member': is_member}}
                    
@router.get('/api/get_chats') #get list of chats
async def get_chats(session: Optional[str] = Cookie(default=None)):
    if not session:
        return {'ok': False, 'detail': 'Session is empty'}
    
    async with sql.as_session() as as_session:
        query = (await as_session.execute(select(sql.Session).filter_by(token=session).options(selectinload(sql.Session.user).selectinload(sql.User.chats).selectinload(sql.ChatMember.chat)))).scalar_one_or_none()

        if not query:
            return {'ok': False, "detail": 'Session is expired'}

        chats = []
        for chatmemb in query.user.chats:
            chats.append({'chat_id': chatmemb.chat.chat_id, 'username': chatmemb.chat.username, 'chat_type': chatmemb.chat.type, 'avatar': chatmemb.chat.avatar, 'title': chatmemb.chat.title, 'last_message': chatmemb.chat.last_message_content, 'last_message_author_id': chatmemb.chat.last_message_author_id, 'last_message_author_name': chatmemb.chat.last_message_author_name})

        private_chats = (await as_session.execute(select(sql.Private_Chat).where(or_(sql.Private_Chat.user1_id == query.user_id, sql.Private_Chat.user2_id == query.user_id).options(selectinload(sql.Private_Chat.user1), selectinload(sql.Private_Chat.user2))))).scalars().all()
        for private_chat in private_chats:
            if private_chat.user1_id == query.user_id:
                interlocutor = private_chat.user2
            else:
                interlocutor = private_chat.user1
            chats.append({'chat_id': private_chat.id, 'username': interlocutor.username, 'chat_type': 'private', 'avatar': interlocutor.avatar, 'title': interlocutor.name, 'last_message': private_chat.last_message_content, 'last_message_author_id': private_chat.last_message_author_id, 'last_message_author_name': private_chat.last_message_author_name})
        return {'ok': True, 'detail': chats} 

@router.post('/api/get_mess') #get chat's messages
async def get_messages(chat: Post_chat, session: Optional[str] = Cookie(default=None)):
    if not session:
        return {'ok': False, 'detail': 'Not authorized'}

    last_read_id = None
    
    async with sql.as_session() as as_session:
        db_session = (await as_session.execute(select(sql.Session).filter_by(token=session).options(selectinload(sql.Session.user).selectinload(sql.User.chats)))).scalar_one_or_none()
        if (not db_session) or db_session.expires_at < datetime.now(timezone.utc):
            return {'ok': False, 'detail': 'Session is expired'}

        if chat.type == 'private':
            # get private chat
            private_chat = (await as_session.execute(select(sql.Private_Chat).where(or_(and_(sql.Private_Chat.user1_id == chat.chat_id, sql.Private_Chat.user2_id == db_session.user_id), and_(sql.Private_Chat.user1_id == db_session.user_id, sql.Private_Chat.user2_id == chat.chat_id))))).scalar_one_or_none()
            if not private_chat:
                return {'ok': True, 'detail': {'mess': [], 'last_read_id': 0}}
            
            query = select(sql.Message).filter_by(private_chat_id=private_chat.id)

            if chat.mess_id_until:
                query = query.where(sql.Message.id < chat.mess_id_until)  # ← load only old mess
            if chat.mess_id_from:
                query = query.where(sql.Message.id > chat.mess_id_from)   # ← load only new mess

            query = query.order_by(sql.Message.id.desc()).limit(25)  # ← take only 25!

            query = query.options(selectinload(sql.Message.attachment))

            result = await as_session.execute(query)
            messages = result.scalars().all()

            messages_data = []
            for message in reversed(messages):  

                msg_dict = {
                    'id': message.id,
                    'created_by': message.created_by_id,
                    'created_at': message.created_at,
                    'updated_at': message.updated_at,
                    'reply_to_id': message.reply_to_id,
                    'text': message.text,
                    'mess_type': message.type,
                    'is_read': message.is_read
                }

                if message.type != 'text' and message.attachment:
                    msg_dict.update({
                        'link': f'/chat/api/attach/{message.attachment.private_chat_id}/{message.attachment.file_name}',
                        'file_size': message.attachment.file_size,
                        'file_type': message.attachment.file_type,
                        'file_name': message.attachment.file_origname,
                        'file_width': message.attachment.width,
                        'file_height': message.attachment.height
                    })

                messages_data.append(msg_dict)

            last_read_result = await as_session.execute(
                select(sql.Message.id)
                .where(sql.Message.private_chat_id == private_chat.id)
                .where(sql.Message.created_by_id == db_session.user_id)
                .where(sql.Message.is_read == True)
                .order_by(sql.Message.id.desc())
                .limit(1)
            )
            last_read_id = last_read_result.scalar_one_or_none()

        else: #channel and group
            query = select(sql.Message).filter_by(chat_id=chat.chat_id)

            if chat.mess_id_until:
                query = query.where(sql.Message.id < chat.mess_id_until)  # ← load only old mess
            if chat.mess_id_from:
                query = query.where(sql.Message.id > chat.mess_id_from)   # ← load only new mess

            query = query.order_by(sql.Message.id.desc()).limit(25)  # ← take only 25!

            query = query.options(selectinload(sql.Message.attachment))

            result = await as_session.execute(query)
            messages = result.scalars().all()

            messages_data = []
            for message in reversed(messages):  

                msg_dict = {
                    'id': message.id,
                    'created_by': message.created_by_id,
                    'created_at': message.created_at,
                    'updated_at': message.updated_at,
                    'reply_to_id': message.reply_to_id,
                    'text': message.text,
                    'mess_type': message.type
                }

                if message.type != 'text' and message.attachment:
                    msg_dict.update({
                        'link': f'/chat/api/attach/{message.attachment.chat_id}/{message.attachment.file_name}',
                        'file_size': message.attachment.file_size,
                        'file_type': message.attachment.file_type,
                        'file_name': message.attachment.file_origname,
                        'file_width': message.attachment.width,
                        'file_height': message.attachment.height
                    })

                messages_data.append(msg_dict)

            last_read_result = await as_session.execute(
                select(sql.Message.id)
                .where(sql.Message.chat_id == chat.chat_id)
                .where(sql.Message.created_by_id == db_session.user_id)
                .where(sql.Message.is_read == True)
                .order_by(sql.Message.id.desc())
                .limit(1)
            )
            last_read_id = last_read_result.scalar_one_or_none()
        await as_session.close()
        return {'ok': True, 'detail': {'mess': messages_data, 'last_read_id': last_read_id}}

@router.get("/api/attach/{chat_id}/{file_path}")
async def get_file(chat_id: str, file_path: str, session = Cookie(default=None)):
    if not chat_id.isdigit():
        return {'ok': False, 'detail': 'Chat_id must be digit'}
    if not session:
        return {'ok': False, 'detail': 'Not authorized'}
    chat_id = int(chat_id)
    
    async with sql.as_session() as as_session:
        query = (await as_session.execute(select(sql.Session).filter_by(token=session).options(selectinload(sql.Session.user).selectinload(sql.User.chats)))).scalar_one_or_none()
        if not query or query.expires_at < datetime.now(timezone.utc):
            return {'ok': False, 'detail': 'Session is expired'}
        
        file = (await as_session.execute(select(sql.File).filter_by(chat_id=chat_id, file_name=file_path).options(selectinload(sql.File.chat).selectinload(sql.Chat.members)))).scalar_one_or_none()
        if not file:
            file = (await as_session.execute(select(sql.File).filter_by(private_chat_id=chat_id, file_name=file_path).options(selectinload(sql.File.private_chat)))).scalar_one_or_none()
            if not file:
                return {'ok': False, 'detail': 'No result'}
            else:
                if query.user_id != file.private_chat.user1_id and query.user_id != file.private_chat.user2_id:
                    return {'ok': False, 'detail': 'No result'}

    
    path = os.path.join("attach_files", str(chat_id), file_path)
    if not path:
        return {'ok': False, 'detail': 'Something wrong'}

    return FileResponse(path=path)

@router.get("/api/attach-info/{chat_id}/{file_path}")
async def get_file(chat_id: str, file_path: str, session = Cookie(default=None)):
    if not chat_id.isdigit():
        return {'ok': False, 'detail': 'Chat_id must be digit'}
    if not session:
        return {'ok': False, 'detail': 'Not authorized'}
    chat_id = int(chat_id)
    
    async with sql.as_session() as as_session:
        query = (await as_session.execute(select(sql.Session).filter_by(token=session).options(selectinload(sql.Session.user).selectinload(sql.User.chats)))).scalar_one_or_none()
        if not query or query.expires_at < datetime.now(timezone.utc):
            return {'ok': False, 'detail': 'Session is expired'}
        
        file = (await as_session.execute(select(sql.File).filter_by(chat_id=chat_id, file_name=file_path).options(selectinload(sql.File.chat).selectinload(sql.Chat.members)))).scalar_one_or_none()
        if not file:
            file = (await as_session.execute(select(sql.File).filter_by(private_chat_id=chat_id, file_name=file_path).options(selectinload(sql.File.private_chat)))).scalar_one_or_none()
            if not file:
                return {'ok': False, 'detail': 'No result'}
            else:
                if query.user_id != file.private_chat.user1_id and query.user_id != file.private_chat.user2_id:
                    return {'ok': False, 'detail': 'No result'}
        
    return {'ok': True, 'detail': {'orig_name': file.file_origname, "type": file.file_type, 'size': file.file_size}}

@router.get('/api/avatar/{file_name}')
async def get_avatar(file_name: str, session = Cookie(default=None)):
    if not session:
        return {'ok': False, 'detail': 'Not authorized'}
    async with sql.as_session() as as_session:
        file = (await as_session.execute(select(sql.File).filter_by(file_name=file_name))).scalar_one_or_none()
    if not file:
        return {'ok': False, 'detail': 'Not result'}
    return FileResponse(path=file.file_path)

@router.post('/api/create_chat')
async def create_chat(session = Cookie(default=None), image: Optional[UploadFile] = File(None), chat_name: str = Form(), chat_username: str = Form(), chat_type: str = Form(), chat_desc: str = Form(None)):
    print({'image': image, 'chat_name': chat_name, 'chat_username': chat_username, 'chat_type': chat_type, 'chat_desc': chat_desc})
    if not chat_name:
        return {'ok': False, 'detail': "Chat name cant be null"}
    if len(chat_name) > 30:
        return {'ok': False, 'detail': 'Chat name must be less than 30'}
    if len(chat_name.split()) > 1:
        return {'ok': False, 'detail': 'Write without spaces'}
    if not chat_username:
        return {'ok': False, 'detail': "Chat username cant be null"}
    if len(chat_username) > 30:
        return {'ok': False, 'detail': 'Chat username must be less than 30'}
    if len(chat_username.split()) > 1:
        return {'ok': False, 'detail': 'Write without spaces'}
    if len(chat_username) < 4:
        return {'ok': False, 'detail': 'Chat username must be more than 5'}
    if not chat_type:
        return {"ok": False, 'detail': 'Chat type cant be null'}
    if chat_type != 'group' and chat_type != 'channel' and chat_type != 'private':
        return {'ok': False, 'detail': 'Chat type not recornized'}
    if not session:
        return {'ok': False, 'detail': 'Session cant be null'}
    if image:
        if not image.content_type.startswith('image/'):
            return {'ok': False, 'detail': 'File must be image'}
        content = await image.read(2048)
        await image.seek(0)
        mime = magic.from_buffer(content, mime=True)
        if not mime.startswith('image/'):
            return {'ok': False, 'detail': 'You are very stupid'}
    
    async with sql.as_session() as as_session:
        query = (await as_session.execute(select(sql.Session).filter_by(token=session).options(selectinload(sql.Session.user)))).scalar_one_or_none()
        if not query or not query.user or query.expires_at < datetime.now(timezone.utc):
            return {'ok': False, 'detail': 'Session is expired'}
        
        username = (await as_session.execute(select(sql.Username).filter_by(username=chat_username))).scalar_one_or_none()
        if username:
            return {'ok': False, 'detail': 'Username is occupied'}
        
        while True:
            chat_id = gen_id()
            chat = (await as_session.execute(select(sql.Chat).filter_by(chat_id=chat_id))).scalar_one_or_none()
            if not chat:
                break

        if image: #saving image
            file_origname = image.filename
            file_type = os.path.splitext(image.filename)[1].lower()
            file_name_db = secrets.token_urlsafe(16) + file_type
            try:
                os.makedirs(os.path.join('attach_files', 'avatars'))
            except:
                pass
            
            image_path = os.path.join('attach_files', 'avatars', file_name_db)

            with open(image_path, 'wb') as buffer:
                shutil.copyfileobj(image.file, buffer)
        
        new_chat = sql.Chat(chat_id=chat_id, username=chat_username, title=chat_name, type=sql.Chat_type.group if chat_type == 'group' else sql.Chat_type.channel, description=chat_desc, created_by=query.user_id, avatar=file_name_db if image else None)
        await manager.send_to_user(query.user_id, {'type': 'new_chat', 'chat': {'chat_id': chat_id, 'username': chat_username, 'chat_type': chat_type, 'avatar': file_name_db if image else None, 'title': chat_name, 'last_message': '', 'last_update_at': datetime.now(timezone.utc).isoformat()}})
        new_chatmember = sql.ChatMember(user_id=query.user_id, chat_id=chat_id, role=sql.Chat_roles.owner)
        new_username = sql.Username(username=chat_username, owner_type=sql.Chat_type.group if chat_type == 'group' else sql.Chat_type.channel, owner_id=chat_id)
        if image:
            size = get_file_quality(image_path, sql.Message_type.capture)
            if size:
                width, height = size
            else:
                return {'ok': False, 'detail': 'Wrong file type'}
            new_file = sql.File(width=width, height=height, user_id=query.user_id, chat_id=chat_id, file_path=image_path, file_name=file_name_db, file_origname=file_origname, file_type=file_type, file_size=image.size, chatmember=new_chatmember.id)

        if image:
            as_session.add_all([new_chat, new_chatmember, new_username, new_file])
        else:
            as_session.add_all([new_chat, new_chatmember, new_username])
        await as_session.commit()
    return {'ok': True, 'detail': "Chat is created"}

@router.post('/api/search')
async def search(search: Post_search, session = Cookie(default=None)):
    if not session:
        return {'ok': False, 'detail': 'Not authorized'}
    if not search.content:
        return {'ok': False, 'detail': 'Content is none'}
    if search.type_content and not search.ids_chats:
        return {'ok': False, 'detail': 'Wrong request'}
    users_db = []
    chats_db = []
    
    async with sql.as_session() as as_session:
        session_db = (await as_session.execute(select(sql.Session).filter_by(token=session))).scalar_one_or_none()

        if not session_db or session_db.expires_at < datetime.now(timezone.utc):
            return {'ok': False, 'detail': 'Session is expired'}
        
        users_db = []
        chats_db = []
        users = []
        chats = []

        if search.type_content:
            if search.type_content == 'private':
                users_db = (await as_session.execute(select(sql.User).filter(or_(sql.User.username.ilike(f'%{search.content}%'),
                                                                            sql.User.name.ilike(f'%{search.content}%'))).where(sql.User.user_id.not_in(search.ids_chats)).limit(5))).scalars().all()
            else:
                chats_db = (await as_session.execute(select(sql.Chat).filter(or_(sql.Chat.title.ilike(f'%{search.content}%'),
                                                                            sql.Chat.username.ilike(f'%{search.content}%'))).where(sql.Chat.chat_id.not_in(search.ids_chats)).limit(5))).scalars().all()
        else:
            users_db = (await as_session.execute(select(sql.User).filter(or_(sql.User.username.ilike(f'%{search.content}%'),
                                                                        sql.User.name.ilike(f'%{search.content}%'))).limit(5))).scalars().all()
            chats_db = (await as_session.execute(select(sql.Chat).filter(or_(sql.Chat.title.ilike(f'%{search.content}%'),
                                                                            sql.Chat.username.ilike(f'%{search.content}%'))).limit(5))).scalars().all()
            
        for user in users_db:
            if user.user_id == session_db.user_id:
                continue
            users.append({'user_id': user.user_id, 'username': user.username, 'name': user.name, 'avatar': user.avatar})
        for chat in chats_db:
            chats.append({'type': chat.type, 'chat_id': chat.chat_id, 'username': chat.username, 'title': chat.title, 'avatar': chat.avatar})
        return {'ok': True, 'detail': {'users': users, 'chats': chats}}
        
@router.get('/api/get_myself')
async def get_myself(session = Cookie(default=None)):
    if not session:
        return {'ok': False, 'detail': 'Not authorized'}
    
    async with sql.as_session() as as_session:
        query = (await as_session.execute(select(sql.Session).filter_by(token=session))).scalar_one_or_none()
        if not query or query.expires_at < datetime.now(timezone.utc):
            return {'ok': False, 'detail': 'Session is expired'}
        
        user = (await as_session.execute(select(sql.User).filter_by(user_id=query.user_id))).scalar_one_or_none()

        if not user:
            return {'ok': False, 'detail': 'Something wrong'}
    return {'ok': True, 'detail': {'user_id': user.user_id,
                                   'avatar': user.avatar,
                                   'created_at': user.created_at,
                                   'username': user.username,
                                   'name': user.name}}

@router.post('/api/update')
async def post_update(update_data: Update, session = Cookie(default=None)):
    if not session:
        return {'ok': False, 'detail': 'Nor authorized'}
    last_sync_at = datetime.fromisoformat(update_data.last_sync_at.replace('Z', '+00:00'))
    
    async with sql.as_session() as as_session:
        query = (await as_session.execute(select(sql.Session).filter_by(token=session).options(selectinload(sql.Session.user).selectinload(sql.User.chats).selectinload(sql.ChatMember.chat)))).scalar_one_or_none()

        if not query or query.expires_at < datetime.now(timezone.utc):
            return {'ok': False, "detail": 'Session is expired'}

        chats_db = (await as_session.execute(select(sql.Chat).filter(sql.Chat.members.any(sql.ChatMember.user_id == query.user.user_id)))).scalars().all()

        chats = {'chats': {'joined': [], 'leaved': [], 'modified': []}, 'private_chats': {'joined': [], 'leaved': [], 'modified': []}}
        # --------chats--------
        db_chats_ids = [chatmemb.chat_id for chatmemb in query.user.chats if chatmemb.chat_id]
        #joined
        for chat_id in db_chats_ids:
            if chat_id not in update_data.all_chats_ids:
                chat = [chatmemb for chatmemb in query.user.chats if chatmemb.chat_id == chat_id][0]
                chat_type = "group" if chat.chat.type == sql.Chat_type.group else 'channel'
                chats['chats']['joined'].append({'chat_id': chat.chat_id, 'username': chat.chat.username, 'chat_type': chat_type, 'avatar': chat.chat.avatar, 'title': chat.chat.title, 'last_message_id': chat.chat.last_message_id, 'last_message': chat.chat.last_message_content, 'last_message_author_id': chat.chat.last_message_author_id, 'last_message_author_name': chat.chat.last_message_author_name})
        #leaved
        for chat_id in update_data.all_chats_ids:
            if chat_id not in db_chats_ids:
                chats['chats']['leaved'].append(chat_id)
        #modified
            stmt = (
                select(sql.Message)
                .where(sql.Message.chat_id.in_(
                    select(sql.ChatMember.chat_id)
                    .where(sql.ChatMember.user_id == query.user_id)
                ))
                .order_by(sql.Message.chat_id, sql.Message.created_at.desc())
                .distinct(sql.Message.chat_id)
                .options(selectinload(sql.Message.created_by))
            )

            result = (await as_session.execute(stmt)).scalars().all()
            for message in result:
                chats['chats']['modified'].append({'chat_id': message.chat_id, 'is_read': message.is_read, 'last_message': message.text, 'last_message_type': message.type})

        # --------private chats--------
        private_chats = (await as_session.execute(select(sql.Private_Chat).where(or_(sql.Private_Chat.user1_id == query.user_id, sql.Private_Chat.user2_id == query.user_id)).options(selectinload(sql.Private_Chat.user1), selectinload(sql.Private_Chat.user2)))).scalars().all()
        private_chats_ids = [private_chat.id for private_chat in private_chats]
        #joined
        for private_chat in private_chats:
            if private_chat.id in update_data.all_private_chats_ids:
                continue

            if private_chat.user1_id == query.user_id:
                interlocutor = private_chat.user2
            else:
                interlocutor = private_chat.user1
            chats['private_chats']['joined'].append({'chat_id': interlocutor.user_id, 'username': interlocutor.username, 'chat_type': 'private', 'avatar': interlocutor.avatar, 'title': interlocutor.name, 'last_message_id': private_chat.last_message_id, 'last_message': private_chat.last_message_content, 'last_message_author_id': private_chat.last_message_author_id, 'last_message_author_name': private_chat.last_message_author_name})
        #leaved
        for update_data_private_chat in update_data.all_private_chats_ids:
            if update_data_private_chat not in private_chats_ids:
                chats['private_chats']['leaved'].append(update_data_private_chat)
        #modified
        private_chat_ids = (
            select(sql.Private_Chat.id)
            .where(
                (sql.Private_Chat.user1_id == query.user_id) |
                (sql.Private_Chat.user2_id == query.user_id)
            )
            .subquery()
        )

        stmt = (
            select(sql.Message)
            .where(
                sql.Message.private_chat_id.in_(private_chat_ids),
                sql.Message.private_chat_id.is_not(None)  # исключаем NULL
            )
            .order_by(sql.Message.private_chat_id, sql.Message.created_at.desc())
            .distinct(sql.Message.private_chat_id)
        )

        result = (await as_session.execute(stmt)).scalars().all()

        return {'ok': True, 'detail': chats}

@router.post('/api/read_mess') #only private chats
async def read_mess(chat: Post_readmess, session = Cookie(default=None)):
    if not session:
        return {'ok': False, 'detail': 'Not authorized'}
    
    async with sql.as_session() as as_session:
        session_db = (await as_session.execute(select(sql.Session).filter_by(token=session))).scalar_one_or_none()
        if not session_db or session_db.expires_at < datetime.now(timezone.utc):
            return {'ok': False, 'detail': 'Not authorized'}

        message = (await as_session.execute(select(sql.Message).filter_by(id=chat.mess_id))).scalar_one_or_none()
        if not message:
            return {'ok': False, 'detail': 'Not found'}
        if message.created_by_id == session_db.user_id:
            return {'ok': False, 'detail': 'Wrong'}

        private_chat = (await as_session.execute(select(sql.Private_Chat).filter_by(id=message.private_chat_id).where(or_(sql.Private_Chat.user1_id == session_db.user_id, sql.Private_Chat.user2_id == session_db.user_id)))).scalar_one_or_none()
        if not private_chat:
            return {'ok': False, 'detail': 'Not found'}

        stmt = update(sql.Message).where(and_(sql.Message.private_chat_id == message.private_chat_id, sql.Message.id <= message.id)).values(is_read=True)
        await as_session.execute(stmt)
        await as_session.commit()
        await manager.send_to_user(message.created_by_id, {'type': 'read_mess', 'chat_id': private_chat.id, 'interlocutor_id': session_db.user_id, 'mess_id': chat.mess_id})
        return {'ok': True, 'detail': 'Success'}

@router.get('/del')
async def delete_cookie(response: Response, session: Optional[str] = Cookie(default=None)):
    if session:
        response.set_cookie(
        key='session',
        value='',
        expires=datetime.now(timezone.utc) - timedelta(days=1)  # yesterday
    )
    return {'ok': True, 'message': 'Logged out'}

