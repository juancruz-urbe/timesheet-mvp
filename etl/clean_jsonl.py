"""
LIMPIEZA DE JSONL

En este script limpio cada uno de los jsonl con pandas y los inserto en PostgreSQL.
"""

import pandas as pd
from .connection import insert_into_postgresql
import logging
logger = logging.getLogger(__name__)

def log_decorator(func):
    """ Log de cada función de limpieza de DF. """
    def wrapper(df, table_name):
        logger.info('Limpiar DF:')
        print(df)
        func(df, table_name)
    return wrapper

# Función auxiliar para seleccionar columnas de forma segura
def select_columns_safe(df, columnas_deseadas):
    """
    Selecciona columnas del DataFrame, creando las que no existen con valores None.
    
    Args:
        df: DataFrame original
        columnas_deseadas: Lista de nombres de columnas deseadas
        
    Returns:
        DataFrame con todas las columnas deseadas (existentes o creadas)
    """
    df_result = pd.DataFrame()
    for col in columnas_deseadas:
        if col in df.columns:
            df_result[col] = df[col]
        else:
            logger.warning(f'  ⚠ Columna "{col}" no encontrada. Creando con valores None.')
            df_result[col] = None
    return df_result

#Try except a la hora de renombrar.
def rename_fail(df,nombre_antiguo,nombre_nuevo):
    try:
        # Verificar si la columna existe antes de renombrar
        if nombre_antiguo in df.columns:
            df = df.rename(columns={nombre_antiguo: nombre_nuevo})
        else:
            logger.warning(f'  ⚠ Columna "{nombre_antiguo}" no encontrada. Creando "{nombre_nuevo}" con valores None.')
            df[nombre_nuevo] = None
    except Exception as e:
        logger.error(f'  ✗ Error al renombrar "{nombre_antiguo}" a "{nombre_nuevo}": {str(e)}')
        # Si falla, crear la columna nueva con None
        df[nombre_nuevo] = None
    return df



@log_decorator
def clean_project(df, table_name):
    # Limpiar DF aquí:
    # Me quedo con las columnas que quiero:
    columnas_deseadas = ["System_Id",
            "System_WorkItemType",
            "System_Title",
            "System_State",
            "System_TeamProject",
            "System_AreaPath",
            "System_IterationPath",
            "Custom_Documentacion",
            "Custom_Owner",
            "Custom_Cliente",
            "Custom_SolicitanteInterno",
            "Custom_Salud",
            "Custom_Progress",
            "Microsoft_VSTS_Scheduling_DueDate",
            "Microsoft_VSTS_Scheduling_FinishDate",
            "Custom_FechaEstimada",
            "Custom_Tipodeproyecto",
            "Custom_WFAlcance",
            "Custom_Conformidad"
            ]
    df = select_columns_safe(df, columnas_deseadas)
    # Renombro las columnas a un nombre más claro. En snake case:
        
    nombres_antiguos=["System_Id","System_WorkItemType","System_Title","System_State","System_TeamProject","System_AreaPath",
    "System_IterationPath","Custom_Documentacion","Custom_Owner","Custom_Cliente","Custom_SolicitanteInterno",
    "Custom_Salud","Custom_Progress","Microsoft_VSTS_Scheduling_DueDate","Microsoft_VSTS_Scheduling_FinishDate",
    "Custom_FechaEstimada","Custom_Tipodeproyecto","Custom_WFAlcance","Custom_Conformidad"]
    
    nombres_nuevos=["id","work_item_type","title","status","team_project","area_path","iteration_path",
                    "documentacion","owner","sponsor","solicitante","salud","progreso","fecha_programada",
                    "fecha_real_entregado","fecha_estimada","tipo_de_proyecto","wf_alcance","conformidad"]
    
    for i in range(len(nombres_antiguos)):
        df=rename_fail(df,nombres_antiguos[i],nombres_nuevos[i])

    # Corrijo fechas:
    cols_fechas = [
        "fecha_programada",
        "fecha_real_entregado",
        "fecha_estimada"
    ]
    df[cols_fechas] = df[cols_fechas].apply(
        pd.to_datetime,
        utc=True
    )
    df[cols_fechas] = df[cols_fechas].apply(
        lambda col: col.dt.tz_localize(None)
    )
    # Corrijo title para que quede utf-8:
    df["title"] = df["title"].apply(lambda x: x.encode('utf-8', 'ignore').decode('utf-8'))

    # remover duplicados en el df
    df = df.drop_duplicates(subset=['id'])
    # validar que id y parent id sean int8
    df['id'] = pd.to_numeric(df['id'], errors='coerce').astype('Int64')
    # Insertar DF en PostgreSQL:
    insert_into_postgresql(df, table_name)

@log_decorator
def clean_epic(df, table_name):
    # Limpiar DF aquí:
    columnas_deseadas = ["System_Id",
            "System_WorkItemType",
            "System_Parent",
            "System_TeamProject",
            "System_AreaPath",
            "System_IterationPath",
            "System_Title",
            "name",            
            "System_State"
    ]
    df = select_columns_safe(df, columnas_deseadas)
    # Renombro las columnas a un nombre más claro. En snake case:
    nombres_antiguos=["System_Id",
    "System_WorkItemType",
    "System_Parent",
    "System_TeamProject",
    "System_AreaPath",
    "System_IterationPath",
    "System_Title",
    "name",
    "System_State"]
    
    nombres_nuevos=["id",
    "work_item_type",
    "parent_id",
    "team_project",
    "area_path",
    "iteration_path",
    "title",
    "colaborador_asignado",
    "status"]
    
    for i in range(len(nombres_antiguos)):
        df=rename_fail(df,nombres_antiguos[i],nombres_nuevos[i])

    # remover duplicados en el df
    df = df.drop_duplicates(subset=['id'])
    # validar que id y parent id sean int8
    df['id'] = pd.to_numeric(df['id'], errors='coerce').astype('Int64')
    df['parent_id'] = pd.to_numeric(df['parent_id'], errors='coerce').astype('Int64')
    # Insertar DF en PostgreSQL:
    insert_into_postgresql(df, table_name)

@log_decorator
def clean_feature(df, table_name):
    # Limpiar DF aquí:
    columnas_deseadas = ["System_Id",
            "System_WorkItemType",
            "System_Parent",
            "System_TeamProject",
            "System_AreaPath",
            "System_IterationPath",
            "System_Title",
            "name",
            "Microsoft_VSTS_Scheduling_StartDate",
            "Microsoft_VSTS_Scheduling_TargetDate",
            "System_State"
    ]
    df = select_columns_safe(df, columnas_deseadas)
   # Renombro las columnas a un nombre más claro. En snake case:
    nombres_antiguos=["System_Id",
    "System_WorkItemType",
    "System_Parent",
    "System_TeamProject",
    "System_AreaPath",
    "System_IterationPath",
    "System_Title",
    "name",
    "Microsoft_VSTS_Scheduling_StartDate",
    "Microsoft_VSTS_Scheduling_TargetDate",
    "System_State"]
   
    nombres_nuevos=["id",
    "work_item_type",
    "parent_id",
    "team_project",
    "area_path",
    "iteration_path",
    "title",
    "colaborador_asignado",
    "start_date",
    "target_date",
    "status"]
   
    for i in range(len(nombres_antiguos)):
       df=rename_fail(df,nombres_antiguos[i],nombres_nuevos[i])
   
    # Corrijo fechas:
    cols_fechas = [
        "start_date",
        "target_date"
    ]
    df[cols_fechas] = df[cols_fechas].apply(
        pd.to_datetime,
        utc=True
    )
    df[cols_fechas] = df[cols_fechas].apply(
        lambda col: col.dt.tz_localize(None)
    )

    # remover duplicados en el df
    df = df.drop_duplicates(subset=['id'])
    # validar que id y parent id sean int8
    df['id'] = pd.to_numeric(df['id'], errors='coerce').astype('Int64')
    df['parent_id'] = pd.to_numeric(df['parent_id'], errors='coerce').astype('Int64')
    # Insertar DF en PostgreSQL:
    insert_into_postgresql(df, table_name)

@log_decorator
def clean_user_story(df, table_name):
    # Limpiar DF aquí:
    columnas_deseadas = ["System_Id",
            "System_WorkItemType",
            "System_Parent",
            "System_TeamProject",
            "System_AreaPath",
            "System_IterationPath",
            "System_Title",
            "name",
            "System_CreatedDate",
            "System_ChangedDate",
            "Microsoft_VSTS_Common_Risk",
            "System_BoardColumn",
            "System_State",
            "Custom_Costos"
    ]
    df = select_columns_safe(df, columnas_deseadas)
    # Renombro las columnas a un nombre más claro. En snake case:
    nombres_antiguos=["System_Id",
    "System_WorkItemType",
    "System_Parent",
    "System_TeamProject",
    "System_AreaPath",
    "System_IterationPath",
    "System_Title",
    "name",
    "System_CreatedDate",
    "System_ChangedDate",
    "Microsoft_VSTS_Common_Risk",
    "System_BoardColumn",
    "System_State",
    "Custom_Costos"]
    
    nombres_nuevos=["id",
    "work_item_type",
    "parent_id",
    "team_project",
    "area_path",
    "iteration_path",
    "title",
    "colaborador_asignado",
    "created_date",
    "changed_date",
    "risk",
    "board_column",
    "status",
    "costos"]
    
    for i in range(len(nombres_antiguos)):
        df=rename_fail(df,nombres_antiguos[i],nombres_nuevos[i])
    
    
    
    # Corrijo fechas:
    cols_fechas = [
        "created_date",
        "changed_date"
    ]
    df[cols_fechas] = df[cols_fechas].apply(
        pd.to_datetime,
        utc=True,
        format='mixed'
    )
    df[cols_fechas] = df[cols_fechas].apply(
        lambda col: col.dt.tz_localize(None)
    )

    # remover duplicados en el df
    df = df.drop_duplicates(subset=['id'])
    # validar que id y parent id sean int8
    df['id'] = pd.to_numeric(df['id'], errors='coerce').astype('Int64')
    df['parent_id'] = pd.to_numeric(df['parent_id'], errors='coerce').astype('Int64')
    # Insertar DF en PostgreSQL:
    insert_into_postgresql(df, table_name)

@log_decorator
def clean_task(df, table_name):
    # Limpiar DF aquí:
    columnas_deseadas = ["System_Id",
            "System_WorkItemType",
            "System_Parent",
            "System_TeamProject",
            "System_AreaPath",
            "System_IterationPath",
            "System_Title",
            "name",
            "System_CreatedDate",
            "System_ChangedDate",
            "Microsoft_VSTS_Scheduling_StartDate",
            "Microsoft_VSTS_Common_ClosedDate",
            "Custom_Origen",
            "Microsoft_VSTS_Common_Activity",
            "System_State",
            "Microsoft_VSTS_Scheduling_CompletedWork"
    ]
    df = select_columns_safe(df, columnas_deseadas)
    # Renombro las columnas a un nombre más claro. En snake case:
    # Renombro las columnas a un nombre más claro. En snake case:
    nombres_antiguos=["System_Id",
    "System_WorkItemType",
    "System_Parent",
    "System_TeamProject",
    "System_AreaPath",
    "System_IterationPath",
    "System_Title",
    "name",
    "System_CreatedDate",
    "System_ChangedDate",
    "Microsoft_VSTS_Scheduling_StartDate",
    "Microsoft_VSTS_Common_ClosedDate",
    "Custom_Origen",
    "Microsoft_VSTS_Common_Activity",
    "System_State",
    "Microsoft_VSTS_Scheduling_CompletedWork"]
    
    nombres_nuevos=["id",
    "work_item_type",
    "parent_id",
    "team_project",
    "area_path",
    "iteration_path",
    "title",
    "colaborador_asignado",
    "created_date",
    "changed_date",
    "start_date",
    "closed_date",
    "origen",
    "activity",
    "status",
    "completed_work"]
    
    for i in range(len(nombres_antiguos)):
        df=rename_fail(df,nombres_antiguos[i],nombres_nuevos[i])
    
    
    # Corrijo fechas:
    cols_fechas = [
        "created_date",
        "changed_date",
        "start_date",
        "closed_date"
    ]
    for col in cols_fechas:
        df[col] = pd.to_datetime(df[col], format='mixed', errors='coerce', utc=True)
    df[cols_fechas] = df[cols_fechas].apply(
        lambda col: col.dt.tz_localize(None)
    )
    # remover duplicados en el df
    df = df.drop_duplicates(subset=['id'])
    # validar que id y parent id sean int8
    df['id'] = pd.to_numeric(df['id'], errors='coerce').astype('Int64')
    df['parent_id'] = pd.to_numeric(df['parent_id'], errors='coerce').astype('Int64')
    # Insertar DF en PostgreSQL:
    insert_into_postgresql(df, table_name)

@log_decorator
def clean_time_entry(df, table_name):
    # Limpiar DF aquí:
    columnas_deseadas = ["System_Id",
            "System_WorkItemType",
            "System_Parent",
            "System_TeamProject",
            "System_AreaPath",
            "System_IterationPath",
            "System_Title",
            "name",
            "System_CreatedDate",
            "System_ChangedDate",
            "Microsoft_VSTS_Scheduling_StartDate",
            "Microsoft_VSTS_Common_Activity",
            "System_State",
            "Microsoft_VSTS_Scheduling_CompletedWork"
    ]
    df = select_columns_safe(df, columnas_deseadas)
    # Renombro las columnas a un nombre más claro. En snake case:
    nombres_antiguos=["System_Id",
    "System_WorkItemType",
    "System_Parent",
    "System_TeamProject",
    "System_AreaPath",
    "System_IterationPath",
    "System_Title",
    "name",
    "System_CreatedDate",
    "System_ChangedDate",
    "Microsoft_VSTS_Scheduling_StartDate",
    "Microsoft_VSTS_Common_Activity",
    "System_State",
    "Microsoft_VSTS_Scheduling_CompletedWork"]
    
    nombres_nuevos=["id",
    "work_item_type",
    "parent_id",
    "team_project",
    "area_path",
    "iteration_path",
    "title",
    "colaborador_asignado",
    "created_date",
    "changed_date",
    "start_date",
    "activity",
    "status",
    "completed_work"]
    
    for i in range(len(nombres_antiguos)):
        df=rename_fail(df,nombres_antiguos[i],nombres_nuevos[i])

    # remover duplicados en el df
    df = df.drop_duplicates(subset=['id'])
    # validar que id y parent id sean int8
    df['id'] = pd.to_numeric(df['id'], errors='coerce').astype('Int64')
    df['parent_id'] = pd.to_numeric(df['parent_id'], errors='coerce').astype('Int64')
    # Insertar DF en PostgreSQL:
    insert_into_postgresql(df, table_name)

@log_decorator
def clean_claim(df, table_name):
    # Limpiar DF aquí:
    columnas_deseadas = ["System_Id",
            "System_WorkItemType",
            "System_Parent",
            "System_TeamProject",
            "System_AreaPath",
            "System_IterationPath",
            "System_Title",
            "name",
            "System_CreatedDate",
            "System_ChangedDate",
            "Microsoft_VSTS_Common_ClosedDate",
            "System_State",
            "Custom_Severidad",
            "Custom_ZohoId",
            "Custom_Vertical",
            "Custom_Cliente"
    ]
    df = select_columns_safe(df, columnas_deseadas)

    #Renombrar
    nombres_antiguos=["System_Id",
    "System_WorkItemType",
    "System_Parent",
    "System_TeamProject",
    "System_AreaPath",
    "System_IterationPath",
    "System_Title",
    "name",
    "System_CreatedDate",
    "System_ChangedDate",
    "Microsoft_VSTS_Common_ClosedDate",
    "System_State",
    "Custom_Severidad",
    "Custom_ZohoId",
    "Custom_Vertical",
    "Custom_Cliente"]
    
    nombres_nuevos=["id",
    "work_item_type",
    "parent_id",
    "team_project",
    "area_path",
    "iteration_path",
    "title",
    "colaborador_asignado",
    "created_date",
    "changed_date",
    "closed_date",
    "status",
    "severidad",
    "zoho_id",
    "vertical",
    "cliente"]
    
    for i in range(len(nombres_antiguos)):
        df=rename_fail(df,nombres_antiguos[i],nombres_nuevos[i])

    # remover duplicados en el df
    df = df.drop_duplicates(subset=['id'])
    # validar que id y parent id sean int8
    df['id'] = pd.to_numeric(df['id'], errors='coerce').astype('Int64')
    df['parent_id'] = pd.to_numeric(df['parent_id'], errors='coerce').astype('Int64')
    # Insertar DF en PostgreSQL:
    insert_into_postgresql(df, table_name)

@log_decorator
def clean_unknowns(df, table_name):
    # Limpiar DF aquí:
    columnas_deseadas = ["System_Id",
            "System_WorkItemType",
            "System_Parent",
            "System_TeamProject",
            "System_AreaPath",
            "System_IterationPath",
            "System_Title",
            "name",
            "System_CreatedDate",
            "System_ChangedDate",
            "Microsoft_VSTS_Common_ClosedDate",
            "System_State",
            "Custom_Severidad",
            "Custom_ZohoId",
            "Custom_Vertical",
            "Custom_Cliente"
    ]
    df = select_columns_safe(df, columnas_deseadas)

    #Renombrar
    nombres_antiguos=["System_Id",
    "System_WorkItemType",
    "System_Parent",
    "System_TeamProject",
    "System_AreaPath",
    "System_IterationPath",
    "System_Title",
    "name",
    "System_CreatedDate",
    "System_ChangedDate",
    "Microsoft_VSTS_Common_ClosedDate",
    "System_State",
    "Custom_Severidad",
    "Custom_ZohoId",
    "Custom_Vertical",
    "Custom_Cliente"]
    
    nombres_nuevos=["id",
    "work_item_type",
    "parent_id",
    "team_project",
    "area_path",
    "iteration_path",
    "title",
    "colaborador_asignado",
    "created_date",
    "changed_date",
    "closed_date",
    "status",
    "severidad",
    "zoho_id",
    "vertical",
    "cliente"]
    
    for i in range(len(nombres_antiguos)):
        df=rename_fail(df,nombres_antiguos[i],nombres_nuevos[i])

    # remover duplicados en el df
    df = df.drop_duplicates(subset=['id'])
    # validar que id y parent id sean int8
    df['id'] = pd.to_numeric(df['id'], errors='coerce').astype('Int64')
    df['parent_id'] = pd.to_numeric(df['parent_id'], errors='coerce').astype('Int64')
    # Insertar DF en PostgreSQL:
    insert_into_postgresql(df, table_name)