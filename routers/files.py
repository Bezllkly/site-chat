from fastapi import FastAPI
from fastapi.responses import HTMLResponse, FileResponse, RedirectResponse, Response
import uvicorn
from random import choice
from fastapi.staticfiles import StaticFiles
import os
from fastapi import APIRouter

#[[file, path], [directory, path]]
def matrix_list(path:str) -> list:
    
    paths_files = os.listdir(path)
    print(path, paths_files)
    finish_list = []
    for name_file in paths_files:
        path_file = os.path.join(path, name_file)
        if os.path.isdir(path_file):
            type_of_path = "dir"
        elif os.path.isfile(path_file):
            type_of_path = "file"
        else:
            type_of_path = "special"
        finish_list.append([type_of_path, name_file])
    print(finish_list)
    return finish_list

router = APIRouter(prefix='/files',
                   tags=['files'])

@router.get("/f")
async def download_files():
    print("all good")
    try:
        with open("static/files.html", "r", encoding="utf-8") as file:
            html = file.read()
        return HTMLResponse(content=html)
    except:
        return {"error": "dont find"}

@router.get("/f/{path:path}")
async def download(path: str):
    print("hui")
    full_path = os.path.join("files", path)
    if os.path.exists(full_path):
        if os.path.isfile(full_path):
            return FileResponse(
                path=full_path,
                filename=os.path.basename(full_path),
                media_type='application/octet-stream')
        else:
            with open("static/files.html", "r", encoding="utf-8") as file:
                html = file.read()
            return HTMLResponse(content=html)
    return {"error": "dont find"}


@router.get('/list_of_files/{path:path}')
async def list_of_files(path:str):
    try:
        result = matrix_list(path)
        return result
    except:
        return {"error": "dont find"}
    
if __name__ == '__main__':
    print(matrix_list('/files/venv/Include'))