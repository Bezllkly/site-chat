from fastapi import FastAPI
from fastapi.responses import HTMLResponse, FileResponse, RedirectResponse, Response
import uvicorn
from random import choice
from fastapi.staticfiles import StaticFiles
import os
from fastapi import APIRouter

router = APIRouter(prefix='/chat',
                   tags=['chat'])

@router.get('')
async def chat():
    with open('static/chat.html', encoding='utf-8') as file:
        response = file.read()
    return HTMLResponse(content=response)