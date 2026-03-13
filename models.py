from sqlalchemy import Column, String, Integer, Float, DateTime
from database import Base


class ColaboradoresVerticales(Base):
    __tablename__ = "colaboradores_verticales"

    Colaborador = Column(String, primary_key=True)
    vertical_area = Column("Vertical / Area", String)
    Seccion = Column(String)
    Posicion = Column(String)


class Flat(Base):
    __tablename__ = "flat"

    Id = Column(Integer, primary_key=True)
    Title = Column(String)
    WorkItemType = Column(String)
    State = Column(String)
    AssignedTo = Column(String)
    TeamProject = Column(String)
    AreaPath = Column(String)
    StartDate = Column(DateTime)
    CompletedWork = Column(Float)
    Actividad = Column(String)
    IdAncestor = Column(Integer)
    WorkItemTypeAncestor = Column(String)
    TitleAncestor = Column(String)
    CustomCliente = Column("Custom.Cliente", String)
    CustomCostos = Column("Custom.Costos", String)
    Vertical = Column(String)
    Seccion = Column(String)
    Posicion = Column(String)
