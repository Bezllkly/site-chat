from fastapi import FastAPI
from pydantic import BaseModel
from typing import Dict, Any
from fastapi.responses import HTMLResponse, FileResponse, RedirectResponse, Response
import uvicorn
from random import choice
from fastapi.staticfiles import StaticFiles
import os
import asyncio
import sys
from routers import chat, files

app = FastAPI(title="lolllain")

app.include_router(files.router)
app.include_router(chat.router)
titles = [
    'сайт для скачивания файлав локальна'
]
icons = ['https://avatars.mds.yandex.net/i?id=984e7b078f286a6eeb6c2c33bc98341268b1a4cd-10915107-images-thumbs&n=13', 'https://avatars.mds.yandex.net/i?id=ea187900f57f436c24b1d266574d8f3d58da5627-12803022-images-thumbs&n=13', 'https://avatars.mds.yandex.net/i?id=cbe85e812f07f6dd227eea13e4ee6b4d6aff9454-5236957-images-thumbs&n=13', 'https://avatars.mds.yandex.net/i?id=883d641bd7e3269670e0409874c473d94b187f78-5231861-images-thumbs&n=13', 'https://avatars.mds.yandex.net/i?id=216b731d41a22df13020173bebb630e950a15d1a-12569664-images-thumbs&n=13', 'https://avatars.mds.yandex.net/i?id=af338ab7b5e5249734927a830debf02638986642-12714922-images-thumbs&n=13']

# Дополнительно: добавляем GET маршрут для тестирования
@app.get("/", response_class=HTMLResponse)
async def root():
    with open("static/index.html", "r", encoding="utf-8") as file:
        html = file.read()
    return HTMLResponse(content=html)

app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/lol", StaticFiles(directory="files"), name="file")

@app.get('/favicon.ico')
async def favicon():
    return FileResponse("static/img/favicon.ico", media_type="image/x-icon")

# Запуск приложения
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=1234, reload=True)
