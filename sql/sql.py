from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import Session, sessionmaker, DeclarativeBase, Mapped, relationship, mapped_column, joinedload, selectinload, contains_eager
from sqlalchemy import URL, create_engine, text, insert, ForeignKey, select, update, func, cast, Enum
from sqlalchemy import Table, Column, Integer, String, MetaData, Boolean, DateTime, BigInteger, ARRAY
from datetime import datetime, timedelta, timezone
import enum
from dotenv import load_dotenv
import os, asyncio

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
    
chat_members = Table(
    'chat_members',
    Base.metadata,
    Column('chat_id', ForeignKey('chats.id'), primary_key=True),
    Column('user_id', ForeignKey('users.id'), primary_key=True),
    Column('role', Enum(Chat_roles), default=Chat_roles.member),  # 'owner', 'admin', 'member'
    Column('joined_at', DateTime, default=datetime.utcnow()  )
)

class User(Base):
    __tablename__ = 'users'

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(unique=True)
    username: Mapped[str] = mapped_column(unique=True)
    name: Mapped[str] = mapped_column()
    password: Mapped[str] = mapped_column()
    avatar = Column(String(100), nullable=True)

    is_active = mapped_column(Boolean, default=True)
    last_seen = mapped_column(DateTime, default=datetime.utcnow()  )
    created_at = mapped_column(DateTime, default=datetime.utcnow()  )

    chats = relationship("Chat", secondary=chat_members, back_populates="members")
    chatsadmin = relationship('Chat', back_populates='creator', cascade="all, delete-orphan")
    messages = relationship("Message", back_populates='user')
    sessions = relationship("Session", back_populates='user', cascade="all, delete-orphan")

class Session(Base):
    __tablename__ = 'sessions'

    id = Column(Integer, primary_key=True)
    token = Column(String(64), unique=True)
    user_id = Column(Integer, ForeignKey('users.user_id'), nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow()  )
    expires_at = Column(DateTime, default=datetime.utcnow()   + timedelta(days=30), onupdate=datetime.utcnow()   + timedelta(days=30))
    user_agent = Column(String(255), nullable=True)
    ip_address = Column(String(15), nullable=True) 
    user = relationship('User', back_populates='sessions')

class Username(Base):
    __tablename__ = 'usernames'

    id = Column(Integer, primary_key=True)
    username = Column(String(30), unique=True)
    owner_type = Column(Enum(Chat_type), default=Chat_type.private)
    owner_id = Column(Integer, unique=True)

class Chat(Base):
    __tablename__ = 'chats'

    id = Column(Integer, primary_key=True)
    chat_id = Column(Integer, unique=True)
    username = Column(Integer, unique=True)
    type = Column(Enum(Chat_type), default=Chat_type.private)
    title = Column(String(50), nullable=True)
    description = Column(String(200), nullable=True)
    created_by = Column(Integer, ForeignKey('users.user_id'), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow()  )
    avatar = Column(String(100), nullable=True)

    creator = relationship('User', back_populates='chatsadmin', foreign_keys=[created_by])
    members = relationship('User', secondary=chat_members, back_populates='chats')
    messages = relationship('Message', back_populates='chat', cascade="all, delete-orphan" )

class Message(Base):
    __tablename__ = 'messages'

    id = Column(Integer, primary_key=True)
    chat_id = Column(Integer, ForeignKey('chats.id', ondelete='CASCADE'), index=True)
    created_by = Column(Integer, ForeignKey('users.user_id', ondelete='SET NULL'), index=True)
    reply_to_id = Column(Integer, ForeignKey('messages.id'), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow()  )
    updated_at = Column(DateTime, default=datetime.utcnow()  , onupdate=datetime.utcnow()  )
    text = Column(String, nullable=True)
    attachment_type = Column(Enum(Attach_type), nullable=True)
    attachment = Column(String, nullable=True)
    state = Column(Enum(Mess_state), default=Mess_state.sent)
    viewed_by = Column(ARRAY(Integer), default=[])
    count_viewed = Column(Integer, default=1)

    user = relationship('User', back_populates='messages', foreign_keys=[created_by])
    chat = relationship('Chat', back_populates='messages', foreign_keys=[chat_id])
    reply_to = relationship('Message', remote_side=[id], foreign_keys=[reply_to_id])
    replies = relationship('Message', back_populates='reply_to')



'''
UPDARE DATABASES
'''
async def update_all():
    async with engine.connect() as con:
        await con.run_sync(Base.metadata.drop_all)
        await con.run_sync(Base.metadata.create_all)
        await con.commit()
    print('updated succesfully')

if __name__ == "__main__":
    asyncio.run(update_all())