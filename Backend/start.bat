@echo off
echo Iniciando o ambiente virtual...
call .\venv\Scripts\activate
echo Ambiente virtual ativado!
echo Iniciando o servidor Uvicorn...
uvicorn app.main:app --reload
pause