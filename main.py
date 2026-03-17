from datetime import date
from typing import Optional
from fastapi import FastAPI, HTTPException, Depends, Query
from sqlalchemy.orm import Session
import json

from database import get_db
from models import ColaboradoresVerticales, Flat
from schemas import ColaboradorVertical, FlatItem

app = FastAPI(title="Timesheet API")

# --- FROM POSTGRESQL TO FASTAPI ---
# get colaboradores
@app.get("/colaboradores", response_model=list[ColaboradorVertical])
def get_colaboradores(db: Session = Depends(get_db)):
    return db.query(ColaboradoresVerticales).all()

# get flat
@app.get("/flat", response_model=list[FlatItem])
def get_flat(
    desde: Optional[date] = Query(None, description="Fecha de inicio (YYYY-MM-DD)"),
    hasta: Optional[date] = Query(None, description="Fecha de fin (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
):
    query = db.query(Flat)
    if desde:
        query = query.filter(Flat.StartDate >= desde)
    if hasta:
        query = query.filter(Flat.StartDate <= hasta)
    return query.all()


# --- FROM settings TO FASTAPI ---
@app.get("/clients")
def get_clients():
    # usar utf-8-sig para descartar un posible BOM al inicio del archivo
    with open("settings/client_mapping.json", "r", encoding="utf-8-sig") as f:
        clients = json.load(f)
    return clients

@app.get("/activity")
def get_activity():
    # usar utf-8-sig para descartar un posible BOM al inicio del archivo
    with open("settings/activity_mapping.json", "r", encoding="utf-8-sig") as f:
        activity = json.load(f)
    return activity

@app.get("/feriados")
def get_feriados():
    # usar utf-8-sig para descartar un posible BOM al inicio del archivo
    with open("settings/feriados.json", "r", encoding="utf-8-sig") as f:
        feriados = json.load(f)
    return feriados

@app.get("/ancestor")
def get_ancestor():
    # usar utf-8-sig para descartar un posible BOM al inicio del archivo
    with open("settings/ancestor_mapping.json", "r", encoding="utf-8-sig") as f:
        ancestor = json.load(f)
    return ancestor