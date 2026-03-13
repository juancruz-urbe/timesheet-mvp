from datetime import date, datetime
from pydantic import BaseModel
from pydantic import ConfigDict


class ColaboradorVertical(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    Colaborador: str | None = None
    vertical_area: str | None = None
    Seccion: str | None = None
    Posicion: str | None = None


class FlatItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    Id: int | None = None
    Title: str | None = None
    WorkItemType: str | None = None
    State: str | None = None
    AssignedTo: str | None = None
    TeamProject: str | None = None
    AreaPath: str | None = None
    StartDate: datetime | None = None
    CompletedWork: float | None = None
    Actividad: str | None = None
    IdAncestor: int | None = None
    WorkItemTypeAncestor: str | None = None
    TitleAncestor: str | None = None
    CustomCliente: str | None = None
    CustomCostos: str | None = None
    Vertical: str | None = None
    Seccion: str | None = None
    Posicion: str | None = None
