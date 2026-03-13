import pandas as pd
from pathlib import Path
import logging

# Conexión a PostgreSQL
from .connection import engine
# Limpieza de DFs que van a public:
from .clean_jsonl import (clean_project,
                         clean_epic,
                         clean_feature,
                         clean_user_story,
                         clean_task,
                         clean_time_entry,
                         clean_claim,
                         clean_unknowns) 

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Mapeo de archivos a funciones de limpieza
CLEAN_FUNCTIONS = {
    'projects.jsonl': clean_project,
    'epics.jsonl': clean_epic,
    'features.jsonl': clean_feature,
    'user_storys.jsonl': clean_user_story,
    'tasks.jsonl': clean_task,
    'time_entrys.jsonl': clean_time_entry,
    'claims.jsonl': clean_claim,
    'unknowns.jsonl': clean_unknowns
}

def get_table_name_from_jsonl(filename: str) -> str:
    """Extrae el nombre de la tabla del nombre del archivo."""
    # Remueve la extensión .jsonl y usa el nombre del archivo
    return filename.replace('.jsonl', '')

def process_jsonl_file(file_path: Path) -> bool:
    """
    Lee un archivo .jsonl, lo procesa con pandas e inserta en PostgreSQL.
    
    Args:
        file_path: Ruta del archivo .jsonl
        
    Returns:
        bool: True si se procesó exitosamente, False en caso de error
    """
    try:
        logger.info(f'Procesando archivo: {file_path.name}')

        df = pd.read_json(file_path, lines=True, encoding="utf-8", dtype={'id': str})

        # Obtener el nombre de la tabla
        table_name = get_table_name_from_jsonl(file_path.name)

        # Desduplico por System_Id y System_ChangedDate
        df = (
            df.sort_values('System_ChangedDate', ascending=False)
            .drop_duplicates(subset=['System_Id'], keep='first')
        )

        # Ejecutar la función de limpieza correspondiente
        if file_path.name in CLEAN_FUNCTIONS:
            CLEAN_FUNCTIONS[file_path.name](df, table_name)
                
        return True
        
    except FileNotFoundError:
        logger.error(f'✗ Archivo no encontrado: {file_path.name}')
        return False
    except pd.errors.ParserError as e:
        logger.error(f'✗ Error al parsear JSON {file_path.name}: {str(e)}')
        return False
    except Exception as e:
        logger.error(f'✗ Error procesando {file_path.name}: {str(e)}')
        return False

def process_jsonl_files():
    """Función principal que procesa todos los archivos .jsonl
    y los almacena en PostgreSQL en el schema public."""
    
    # Obtener la ruta de la carpeta data
    data_dir = Path(__file__).parent / 'data'
    
    if not data_dir.exists():
        logger.error(f'La carpeta data no existe: {data_dir}')
        return
    
    # Encontrar todos los archivos .jsonl
    jsonl_files = sorted(data_dir.glob('*.jsonl'))
    
    if not jsonl_files:
        logger.warning('No se encontraron archivos .jsonl en la carpeta data')
        return
    
    logger.info(f'Se encontraron {len(jsonl_files)} archivos .jsonl')
    # logger.info(f'Conectando a PostgreSQL: {DB_HOST}:{DB_PORT}/{DB_NAME}')
    
    # Procesar cada archivo
    successful = 0
    failed = 0
    
    try:
        for jsonl_file in jsonl_files:
            if process_jsonl_file(jsonl_file):
                successful += 1
            else:
                failed += 1
    
    except ConnectionError as e:
        logger.error(f'Error de conexión a PostgreSQL: {str(e)}')
        logger.info('Verifica que PostgreSQL esté corriendo y las credenciales sean correctas')
        return
    except Exception as e:
        logger.error(f'Error inesperado: {str(e)}')
        return
    
    finally:
        engine.dispose()
    
    # Resumen
    logger.info('=' * 50)
    logger.info(f'Procesamiento completado:')
    logger.info(f'  - Exitosos: {successful}')
    logger.info(f'  - Errores: {failed}')
    logger.info('=' * 50)
