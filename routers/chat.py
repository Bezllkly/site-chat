from fastapi import FastAPI, Cookie, Response, Request, File, UploadFile, Form
from fastapi.responses import HTMLResponse, FileResponse, RedirectResponse, Response
import uvicorn
from fastapi.staticfiles import StaticFiles
import os
from fastapi import APIRouter
from typing import Optional
import sql.sql as sql
from sqlalchemy import URL, create_engine, text, insert, ForeignKey, select, update, func, cast, delete, or_
from sqlalchemy.orm import joinedload, selectinload
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
import secrets, bcrypt, random, requests, shutil, magic

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
    last_sync_at: Optional[datetime]
    chat_id: int

class Post_search(BaseModel):
    content: str
    type_content: Optional[str]
    ids_chats: Optional[list]

class Post_infochat(BaseModel):
    type: str
    chat_id: int

class Post_join(BaseModel):
    chat_id: int

class Update(BaseModel):
    last_sync_at: str
    all_chats_ids: list
    all_private_chats_ids: list

router = APIRouter(prefix='/chat',
                   tags=['chat'])

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
    answer_json = answer.json()
    country = answer_json.get('country')
    region = answer_json.get('region')
    user_agent = request.headers.get('user-agent')

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
            new_session = sql.Session(token=session_token, user_id=person.user_id, country=country, region=region, user_agent=user_agent, ip_address=request.client.host)
            as_session.add_all([new_session])
            await as_session.commit()
            response.set_cookie(key="session", value=session_token)
        return {'ok': True, 'detail': session_token}
    else: #registration
        #create globalchat
        async with sql.as_session() as as_session:
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
        async with sql.as_session() as as_session:
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
        response.set_cookie(key='session', value=session_token)
        return {'ok': True, 'detail': session_token}

@router.post('/api/send_mess')
async def send_mess(session = Cookie(default=None)):
    if not session:
        return {'ok': False, 'detail': 'Not authorized'}
    
    user_db = (await as_session.execute(select(sql.User).filter_by(user_id=chat.chat_id).options(selectinload(sql.User.private_chats1), selectinload(sql.User.private_chats2)))).scalar_one_or_none()
    if not user_db:
        return {'ok': False, 'detail': 'No result'}
    is_member = False
    for user_id in user_db.private_chats1.user2_id:
        if user_id == user.user_id:
            is_member = True
            break
    else:
        for user_id in user_db.private_chats2.user1_id:
            if user_id == user.user_id:
                is_member = True
                break
    if is_member:
        return {'ok': False, 'detail': ''}
    
    new_privatechat = sql.Private_Chat(user1_id=user.user_id, user2_id=user_db.user_id)
    as_session.add(new_privatechat)

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
            return {'ok': True, 'detail': {'chat_id': chat_db.chat_id, 'title': chat_db.title, 'avatar': chat_db.avatar, 'desc': chat_db.description, 'type': chat_db.type, 'created_by': chat_db.created_by, 'created_at': chat_db.created_at, 'is_member': is_member}}
    
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
        chats.append({'chat_id': chatmemb.chat.chat_id, 'username': chatmemb.chat.username, 'chat_type': chatmemb.chat.type, 'avatar': chatmemb.chat.avatar, 'title': chatmemb.chat.title, 'last_message': chatmemb.chat.last_message_content})
    return {'ok': True, 'detail': chats} 

@router.post('/api/get_messages') #get chat's messages
async def get_messages(chat: Post_chat, session: Optional[str] = Cookie(default=None)):
    if not session:
        return {'ok': False, 'detail': 'Not authorized'}
    if chat.last_sync_at is None:
        chat.last_sync_at = datetime(1970)
    
    async with sql.as_session() as as_session:
        db_session = (await as_session.execute(select(sql.Session).filter_by(token=session).options(selectinload(sql.Session.user).selectinload(sql.User.chats)))).scalar_one_or_none()
    if (not db_session) or db_session.expires_at < datetime.now(timezone.utc):
        return {'ok': False, 'detail': 'Session is expired'}

    async with sql.as_session() as as_session:
        chatmemb = (await as_session.execute(select(sql.ChatMember).filter_by(user_id=db_session.user.user_id, chat_id=chat.chat_id).options(selectinload(sql.ChatMember.chat).selectinload(sql.Chat.messages)))).scalar_one_or_none()
    if not chatmemb:
        return {'ok': False, 'detail': 'Chat doesnt exist'}
    messages = []
    for message in chatmemb.chat.messages:
        if message.created_at > chat.last_sync_at:
            messages.append({'chat_id': message.chat_id,
                             'created_by': message.created_by,
                             'created_at': message.created_at,
                             'updated_at': message.updated_at,
                             'reply_to_id': message.reply_to_id,
                             'text': message.text,
                             'attachment_type': message.attachment_type,
                             'attachment': message.attachment,
                             'is_read': message.is_read,
                             'count_viewed': message.count_viewed})
    print(messages)
    return {'ok': True, 'detail': messages}

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
    
        file = (await as_session.execute(select(sql.File).filter_by(user_id=query.user.user_id, chat_id=chat_id, file_name=file_path).options(selectinload(sql.File.chat).selectinload(sql.Chat.members)))).scalar_one_or_none()
    if not file:
        return {'ok': False, 'detail': 'No results'}
    
    path = os.path.join("attach_files", str(chat_id), file_path)
    if not path:
        return {'ok': False, 'detail': 'Something wrong'}

    return FileResponse(path=path)

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
        print(chat_username)
    
    async with sql.as_session() as as_session:
        while True:
            chat_id = gen_id()
            chat = (await as_session.execute(select(sql.Chat).filter_by(chat_id=chat_id))).scalar_one_or_none()
            if not chat:
                break

    if image: #saving image
        file_origname = image.filename
        file_type = os.path.splitext(image.filename)[1].lower()
        file_name_db = secrets.token_urlsafe(16) + file_type
        print(file_name_db)
        try:
            os.makedirs(os.path.join('attach_files', 'avatars'))
        except:
            pass
        
        image_path = os.path.join('attach_files', 'avatars', file_name_db)

        with open(image_path, 'wb') as buffer:
            shutil.copyfileobj(image.file, buffer)
    
    new_chat = sql.Chat(chat_id=chat_id, username=chat_username, title=chat_name, type=sql.Chat_type.group if chat_type == 'group' else sql.Chat_type.channel, description=chat_desc, created_by=query.user_id, avatar=file_name_db if image else None)
    new_chatmember = sql.ChatMember(user_id=query.user_id, chat_id=chat_id, role=sql.Chat_roles.owner)
    new_username = sql.Username(username=chat_username, owner_type=sql.Chat_type.group if chat_type == 'group' else sql.Chat_type.channel, owner_id=chat_id)
    if image:
        new_file = sql.File(user_id=query.user_id, chat_id=chat_id, file_path=image_path, file_name=file_name_db, file_origname=file_origname, file_type=file_type, file_size=image.size, chatmember=new_chatmember.id)

    async with sql.as_session() as as_session:
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
    print(search.ids_chats)
    
    async with sql.as_session() as as_session:
        session_db = (await as_session.execute(select(sql.Session).filter_by(token=session))).scalar_one_or_none()
        if not session_db or session_db.expires_at < datetime.now(timezone.utc):
            return {'ok': False, 'detail': 'Session is expired'}
        if search.type_content:
            if search.type_content == 'private':
                users_db = (await as_session.execute(select(sql.User).filter(or_(sql.User.username.ilike(f'%{search.content}%'),
                                                                              sql.User.name.ilike(f'%{search.content}%'))).where(sql.User.user_id.not_in(search.ids_chats)).limit(5))).scalars().all()
            else:
                print('yes')
                chats_db = (await as_session.execute(select(sql.Chat).filter(or_(sql.Chat.title.ilike(f'%{search.content}%'),
                                                                              sql.Chat.username.ilike(f'%{search.content}%'))).where(sql.Chat.chat_id.not_in(search.ids_chats)).limit(5))).scalars().all()
        else:
            users_db = (await as_session.execute(select(sql.User).filter(or_(sql.User.username.ilike(f'%{search.content}%'),
                                                                          sql.User.name.ilike(f'%{search.content}%'))).limit(5))).scalars().all()
            chats_db = (await as_session.execute(select(sql.Chat).filter(or_(sql.Chat.title.ilike(f'%{search.content}%'),
                                                                          sql.Chat.username.ilike(f'%{search.content}%'))).limit(5))).scalars().all()
        users = []
        chats = []
        for user in users_db:
            if user.user_id == session_db.user_id:
                continue
            users.append({'user_id': user.user_id, 'username': user.username, 'name': user.name, 'avatar': user.avatar})
            print({'user_id': user.user_id, 'username': user.username, 'name': user.name, 'avatar': user.avatar})
        for chat in chats_db:
            chats.append({'type': chat.type, 'chat_id': chat.chat_id, 'username': chat.username, 'title': chat.title, 'avatar': chat.avatar})
        print({'ok': True, 'detail': {'users': users, 'chats': chats}})
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
async def update(update_data: Update, session = Cookie(default=None)):
    if not session:
        return {'ok': False, 'detail': 'Nor authorized'}
    last_sync_at = datetime.fromisoformat(update_data.last_sync_at.replace('Z', '+00:00'))
    
    async with sql.as_session() as as_session:
        query = (await as_session.execute(select(sql.Session).filter_by(token=session).options(selectinload(sql.Session.user).selectinload(sql.User.chats).selectinload(sql.ChatMember.chat)))).scalar_one_or_none()

    if not query:
        return {'ok': False, "detail": 'Session is expired'}

    async with sql.as_session() as as_session:
        chats_db = (await as_session.execute(select(sql.Chat).filter(sql.Chat.members.any(sql.ChatMember.user_id == query.user.user_id)))).scalars().all()

    chats = {'chats': {'joined': [], 'leaved': [], 'modified': []}, 'private_chats': {'joined': [], 'leaved': [], 'modified': []}}
    # chats
    db_chats_ids = [chatmemb.chat_id for chatmemb in query.user.chats if chatmemb.chat_id]
    for chat_id in db_chats_ids:
        if chat_id not in update_data.all_chats_ids:
            chat = [chatmemb for chatmemb in query.user.chats if chatmemb.chat_id == chat_id][0]
            print(chat.chat.type)
            chat_type = "group" if chat.chat.type == sql.Chat_type.group else 'channel'
            chats['chats']['joined'].append({'chat_id': chat.chat_id, 'chat_type': chat_type, 'avatar': chat.chat.avatar, 'title': chat.chat.title, 'last_message': chat.chat.last_message_content})
    for chat_id in update_data.all_chats_ids:
        if chat_id not in db_chats_ids:
            chats['chats']['leaved'].append(chat_id)
    async with sql.as_session() as as_session:
        for chatmemb in query.user.chats:
            messages = (await as_session.execute(select(sql.Message).filter(sql.Message.created_at > last_sync_at, sql.Message.chat_id == chatmemb.chat.chat_id))).scalars().all()
            if not messages and chatmemb.joined_at < last_sync_at:
                continue
            chats['chats']['modified'].append({'chat_id': chatmemb.chat.chat_id, 'avatar': chatmemb.chat.avatar, 'title': chatmemb.chat.title, 'last_message': chatmemb.chat.last_message_content, 'count_messages': len(messages)})
    
    print(chats)
    return {'ok': True, 'detail': chats}

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