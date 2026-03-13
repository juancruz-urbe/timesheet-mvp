""" Módulo para manejar la conexión a PostgreSQL, eliminar e insertar datos. """

import os
import pandas as pd
import psycopg2
from sqlalchemy import create_engine, text

import logging
from dotenv import load_dotenv
logger = logging.getLogger(__name__)

# Configuración de PostgreSQL
load_dotenv()

DB_USER = os.getenv('DB_USER')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_HOST = os.getenv('DB_HOST')
DB_PORT = os.getenv('DB_PORT')
DB_NAME = os.getenv('DB_NAME')

# Crear conexión a PostgreSQL
DATABASE_URL = f'postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}'

engine = create_engine(DATABASE_URL)

# Crear schemas
with engine.begin() as connection:
    # Creo schemas:
    connection.execute(text(f'CREATE SCHEMA IF NOT EXISTS public'))
    # connection.execute(text(f'CREATE SCHEMA IF NOT EXISTS teams'))
    connection.commit()
    connection.close()
    logger.info(f'  ✓ Schemas creados.')


def insert_into_postgresql(df, table_name, schema='public'):
    """
    Inserta el DataFrame en PostgreSQL usando SQLAlchemy.

    df: DataFrame a insertar
    table_name: Nombre de la tabla en PostgreSQL
    schema: Esquema de PostgreSQL (default: 'public')
    engine: Motor de conexión a PostgreSQL
    """
    # Trunco la tabla con el nombre table_name
    with engine.begin() as connection:
        try:
            connection.execute(text(f'TRUNCATE TABLE {schema}.{table_name};'))
            connection.commit()
            logger.info(f'  ✓ Tabla "{schema}.{table_name}" truncada.')
        except Exception as e:
            logger.error(f'  ✗ Error al truncar tabla "{schema}.{table_name}": {e}')

    # Insertar en PostgreSQL
    df.to_sql(
        name=table_name,
        con=engine,
        schema=schema,
        if_exists='append',
        index=False,
        method='multi'
    )
    
    logger.info(f'  ✓ Insertados {len(df)} registros en tabla "{schema}.{table_name}"')

    connection.close()

# Crear una función para leer tabla desde PostgreSQL
def read_from_postgresql(query=None, schema='public', table_name=None):
    """
    Lee desde PostgreSQL y devuelve un DataFrame.
    
    Puede recibir:
    - table_name: Nombre de la tabla en PostgreSQL
    - schema: Esquema de PostgreSQL (default: 'public')
    - query: Query SQL personalizada (sobrescribe table_name)
    """
    
    with engine.connect() as connection:
        if query:
            df = pd.read_sql(query, con=connection)
            logger.info(f'  ✓ Leídos {len(df)} registros de query personalizada')
        else:
            df = pd.read_sql_table(table_name, con=connection, schema=schema)
            logger.info(f'  ✓ Leídos {len(df)} registros de tabla "{schema}.{table_name}"')
    
    return df

def read_query_and_insert(query, table_name, schema='public'):
    with engine.connect() as connection:
        if query:
            df = pd.read_sql(query, con=connection)
            logger.info(f'  ✓ Leídos {len(df)} registros de query personalizada')
        else:
            df = pd.read_sql_table(table_name, con=connection, schema=schema)
            logger.info(f'  ✓ Leídos {len(df)} registros de tabla "{schema}.{table_name}"')
    
    # Insertar en PostgreSQL
    df.to_sql(
        name=table_name,
        con=engine,
        schema=schema,
        if_exists='replace',
        index=False,
        method='multi'
    )
    
    logger.info(f'  ✓ Insertados {len(df)} registros en tabla "{schema}.{table_name}"')

    connection.close()

def read_csv_and_insert(file_name, schema='public'):
    df = pd.read_csv(f'settings/{file_name}.csv', delimiter=';')
    # Insertar en PostgreSQL
    df.to_sql(
        name=file_name,
        con=engine,
        schema=schema,
        if_exists='replace',
        index=False,
        method='multi'
    )
    
    logger.info(f'  ✓ Insertados {len(df)} registros en tabla "{schema}.{file_name}"')

    connection.close()

def run_views(sql_file_path):
    """
    Ejecuta una query SQL desde un archivo .sql y devuelve los resultados directamente.
    
    sql_file_path: Ruta al archivo .sql
    Retorna: Lista de tuplas con los resultados de la query
    """
    try:        
        conn = psycopg2.connect(
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT
        )
        
        cursor = conn.cursor()

        with open(sql_file_path, "r", encoding="utf-8") as f:
            cursor.execute(f.read())

        conn.commit()
        cursor.close()
        conn.close()
        logger.info(f'  ✓ Query ejecutada exitosamente desde "{sql_file_path}"')
    except FileNotFoundError:
        logger.error(f'  ✗ Archivo no encontrado: "{sql_file_path}"')
        raise
    except Exception as e:
        logger.error(f'  ✗ Error al ejecutar query desde "{sql_file_path}": {e}')
        raise