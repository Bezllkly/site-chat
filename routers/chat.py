from fastapi import FastAPI, Cookie, Response
from fastapi.responses import HTMLResponse, FileResponse, RedirectResponse, Response
import uvicorn
from random import choice
from fastapi.staticfiles import StaticFiles
import os
from fastapi import APIRouter
from typing import Optional

router = APIRouter(prefix='/chat',
                   tags=['chat'])

@router.get('')
async def chat(response: Response, session: Optional[str] = Cookie(default=None)):
    if session:
        response.set_cookie(
            key="session",
            value=session,
            httponly=True,
            secure=False
        )
    