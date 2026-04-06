from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import Session, sessionmaker, DeclarativeBase, Mapped, relationship, mapped_column, joinedload, selectinload, contains_eager
from sqlalchemy import URL, create_engine, text, insert, ForeignKey, select, update, func, cast, Enum
from sqlalchemy import Table, Column, Integer, String, MetaData, Boolean, DateTime, BigInteger, ARRAY
from datetime import datetime, timedelta, timezone
import enum
from dotenv import load_dotenv
import os, asyncio, shutil

load_dotenv()
DB_LINK = os.getenv('DBLINK')

engine = create_async_engine(
    url=DB_LINK,
    echo=False
)

as_session = async_sessionmaker(engine, expire_on_commit=False)

class Chat_type(enum.Enum):
    private = 'private'
    group = 'group'
    channel = 'channel'

class Attach_type(enum.Enum):
    file = 'file'
    capture = 'capture'
    video = 'video'

class Mess_state(enum.Enum):
    sent = 'sent'
    read = 'read'

class Chat_roles(enum.Enum):
    member = 'member'
    admin = 'admin'
    owner = 'owner'

class Base(DeclarativeBase):
    repr_cols_num = 3
    repr_cols = tuple()

    def __repr__(self):
        cols = []
        for idx, col in enumerate(self.__table__.columns.keys()):
            if col in self.repr_cols or idx < self.repr_cols_num:
                cols.append(f'{col}={getattr(self, col)}')
        return f'<{self.__class__.__name__} {','.join(cols)}>'
    
class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, unique=True)
    username = Column(String(30), unique=True)
    name = Column(String(20))
    password = Column(String(100))
    avatar = Column(String(100), nullable=True)

    is_active = Column(Boolean, default=True)
    last_seen = Column(DateTime(timezone=True), default=datetime.now(timezone.utc))
    created_at = Column(DateTime(timezone=True), default=datetime.now(timezone.utc))

    chatsadmin = relationship('Chat', back_populates='creator', cascade="all, delete-orphan")
    messages = relationship("Message", back_populates='user')
    sessions = relationship("Session", back_populates='user', cascade="all, delete-orphan")
    chats = relationship("ChatMember", back_populates='user', cascade='all, delete-orphan')
    files = relationship("File", back_populates='user')

class Session(Base):
    __tablename__ = 'sessions'

    id = Column(Integer, primary_key=True)
    token = Column(String(64), unique=True)
    user_id = Column(Integer, ForeignKey('users.user_id'), nullable=False)
    last_visit_at = Column(DateTime(timezone=True), default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))
    country = Column(String(10))
    region = Column(String(20))

    created_at = Column(DateTime(timezone=True), default=datetime.now(timezone.utc)  )
    expires_at = Column(DateTime(timezone=True), default=datetime.now(timezone.utc)   + timedelta(days=30), onupdate=datetime.now(timezone.utc)   + timedelta(days=30))
    user_agent = Column(String(255), nullable=True)
    ip_address = Column(String(15), nullable=True) 
    user = relationship('User', back_populates='sessions')

class Username(Base):
    __tablename__ = 'usernames'

    id = Column(Integer, primary_key=True)
    username = Column(String(30), unique=True)
    owner_type = Column(Enum(Chat_type), default=Chat_type.private)
    owner_id = Column(Integer, unique=True)

class ChatMember(Base):
    __tablename__ = 'chat_members'

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.user_id'))
    chat_id = Column(Integer, ForeignKey('chats.chat_id'))

    joined_at = Column(DateTime(timezone=True), default=datetime.now(timezone.utc))
    last_read_at = Column(DateTime(timezone=True), default=datetime.now(timezone.utc))
    role = Column(Enum(Chat_roles), default=Chat_roles.member)

    user = relationship('User', back_populates='chats', foreign_keys=[user_id])
    chat = relationship("Chat", back_populates='members', foreign_keys=[chat_id])
    files = relationship('File', back_populates='chatmember')

class Chat(Base):
    __tablename__ = 'chats'

    id = Column(Integer, primary_key=True)
    chat_id = Column(Integer, unique=True)
    username = Column(String(30), unique=True)
    type = Column(Enum(Chat_type), default=Chat_type.private)
    title = Column(String(50))
    description = Column(String(200), nullable=True)
    created_by = Column(Integer, ForeignKey('users.user_id'), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now(timezone.utc)  )
    avatar = Column(String(100), nullable=True)
    last_message_id = Column(Integer, nullable=True)
    last_message_content = Column(String(50), nullable=True)

    creator = relationship('User', back_populates='chatsadmin', foreign_keys=[created_by])
    members = relationship('ChatMember', back_populates='chat')
    messages = relationship('Message', back_populates='chat', cascade="all, delete-orphan" )
    files = relationship("File", back_populates='chat')



class Message(Base):
    __tablename__ = 'messages'

    id = Column(Integer, primary_key=True)
    chat_id = Column(Integer, ForeignKey('chats.id', ondelete='CASCADE'), index=True)
    created_by = Column(Integer, ForeignKey('users.user_id', ondelete='SET NULL'), index=True)
    reply_to_id = Column(Integer, ForeignKey('messages.id'), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now(timezone.utc)  )
    updated_at = Column(DateTime(timezone=True), default=datetime.now(timezone.utc)  , onupdate=datetime.now(timezone.utc)  )
    text = Column(String, nullable=True)
    attachment_type = Column(Enum(Attach_type), nullable=True)
    attachment = Column(String, nullable=True)
    state = Column(Enum(Mess_state), nullable=True)
    viewed_by = Column(ARRAY(Integer), default=[])
    count_viewed = Column(Integer, default=1)

    user = relationship('User', back_populates='messages', foreign_keys=[created_by])
    chat = relationship('Chat', back_populates='messages', foreign_keys=[chat_id])
    reply_to = relationship('Message', remote_side=[id], foreign_keys=[reply_to_id])
    replies = relationship('Message', back_populates='reply_to')

class File(Base):
    __tablename__ = "files"

    id = Column(Integer, primary_key=True)
    chatmember_id = Column(Integer, ForeignKey('chat_members.id'))
    user_id = Column(Integer, ForeignKey('users.user_id'))
    chat_id = Column(Integer, ForeignKey("chats.chat_id"))
    file_path = Column(String(255), unique=True)
    file_name = Column(String(255))
    file_origname = Column(String(255))
    file_type = Column(String(20))
    file_size = Column(Integer) #kilobytes
    created_at = Column(DateTime(timezone=True), default=datetime.now(timezone.utc))

    user = relationship("User", back_populates='files', foreign_keys=[user_id])
    chat = relationship("Chat", back_populates='files', foreign_keys=[chat_id])
    chatmember = relationship('ChatMember', back_populates='files', foreign_keys=[chatmember_id])

'''
UPDARE DATABASES
'''
async def update_all():
    async with engine.connect() as con:
        await con.run_sync(Base.metadata.drop_all)
        await con.run_sync(Base.metadata.create_all)
        await con.commit()
    try:
        shutil.rmtree(os.path.join('attach_files'))
    except:
        pass
    print('updated succesfully')

if __name__ == "__main__":
    asyncio.run(update_all())
