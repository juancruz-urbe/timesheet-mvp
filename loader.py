from datetime import datetime
from etl.azure_extractor import extract_data
from etl.transform import process_jsonl_files
from etl.flat_data import get_flat_table

if __name__ == "__main__":
    start = datetime.now()

    extract_data()
    process_jsonl_files()
    get_flat_table()

    finish = datetime.now()
    print("La duración de la ejecución fue:", (finish - start))