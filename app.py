from fastapi import FastAPI, HTTPException
import json

app = FastAPI(title="WorkItems API")

# cargar json
# usar utf-8-sig para descartar un posible BOM al inicio del archivo
with open("settings/data_example.json", "r", encoding="utf-8-sig") as f:
    workitems = json.load(f)

# devolver todo el json
@app.get("/workitems")
def get_all():
    return workitems


# buscar por id
@app.get("/workitems/{item_id}")
def get_by_id(item_id: int):

    item = next((x for x in workitems if x["Id"] == item_id), None)

    if item is None:
        raise HTTPException(status_code=404, detail="Item no encontrado")

    return item

# filtrar por persona asignada
@app.get("/assigned/{name}")
def get_by_assigned(name: str):

    result = [
        x for x in workitems
        if x.get("AssignedTo") and name.lower() in x["AssignedTo"].lower()
    ]

    return result