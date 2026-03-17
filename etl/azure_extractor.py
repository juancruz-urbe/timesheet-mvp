"""
Extración de datos de Azure DevOps.

Lo que se buscara hacer con este script es "trepar la cascada".
Es decir, extraer los time entrys y de ahi ir subiendo
Hasta los projects a los que pertenece.
"""
import os
import json
import pyotp
import time
import io
import shutil
from datetime import datetime

import boto3
from botocore.exceptions import ClientError
from azure.devops.connection import Connection
from azure.devops.v7_0.work_item_tracking.models import Wiql
from msrest.authentication import BasicAuthentication

from dotenv import load_dotenv
from pathlib import Path

#Env variables 
load_dotenv()

ORGANIZATION_URL = os.getenv("AZURE_URL")
PERSONAL_ACCESS_TOKEN = os.getenv("ACCESS_TOKEN")

aws_access_key_id = os.getenv("aws_access_key_id")
aws_secret_access_key = os.getenv("aws_secret_access_key")
serial_number=os.getenv("serial_number")
clave_secreta_MFA=os.getenv("clave_secreta_MFA")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
AWS_S3_BUCKET = os.getenv("AWS_S3_BUCKET")

# Obtengo la fecha de hoy:
hoy=datetime.today()

#Function to export our collections to jsonls
def export_to_jsonl(file_name, coll):
    """ Exporta una coleccion a un archivo jsonl
    Args:
        file_name (str): Nombre del archivo sin extension
        coll (list): Coleccion de diccionarios a exportar
    """
    try:
        # Create directory if it doesn't exist
        Path(file_name).parent.mkdir(parents=True, exist_ok=True)        
        with open(f"{file_name}.jsonl", 'w',encoding='utf-8') as json_file:
            for document in coll:
                # Use json.dump() to write the dictionary to the file
                # The 'indent=4' parameter makes the file human-readable (pretty-printed)
                d_to_string(document,'System_CreatedDate');d_to_string(document,'System_ChangedDate')
                d_to_string(document,'Microsoft_VSTS_Common_StateChangeDate');d_to_string(document,'Microsoft_VSTS_Common_ClosedDate')
                d_to_string(document,'Microsoft_VSTS_Common_ActivatedDate');d_to_string(document,'Microsoft_VSTS_Scheduling_StartDate')
                d_to_string(document,'Microsoft_VSTS_Scheduling_FinishDate');d_to_string(document,'insert_date_to_Mongo')
                try:
                    del document['_id']
                except:
                    pass
                json_record = json.dumps(document, ensure_ascii=False)
                json_file.write(json_record + '\n')
    except Exception as e:
        print(f"An error occurred: {e}")


def auth():
    """
    Autenticacion obtener clientes
    """
    credentials = BasicAuthentication('', PERSONAL_ACCESS_TOKEN)
    return Connection(base_url=ORGANIZATION_URL, creds=credentials)

def client(connection):
    """ Function para generar un client de azure devops
    Args:
        connection (Connection): Conexion autenticada a azure devops
    Returns:
        tuple: core_client, wit_client
    """
    core_client = connection.clients.get_core_client()
    wit_client = connection.clients.get_work_item_tracking_client()
    return (core_client,wit_client)
    
def ids_de_query(core_client, wit_client, hoy, wi_type, wi_type_2=False):
    """ Function para realizar una query por proyecto"""
    #First, the dates    
    semana_atras=hoy.replace(year=hoy.year-1)
    hoy=str(hoy.date())
    semana_atras=str(semana_atras.date())
    
    # seven_days=timedelta(days=7)
    # semana_atras=hoy-seven_days
    # hoy=str(hoy.date())
    # semana_atras=str(semana_atras.date())
    
    #Then, the ids for each project
    try:
        projects = core_client.get_projects()
        ids=[]
        for project in projects:
            print(f"\n>> Procesando Proyecto: {project.name}")        
            # 4. Definir la consulta en WIQL para el proyecto actual
            #Estoy iterando sobre proyecto, por lo tanto estas son las tasks CON proyecto
            if wi_type_2:
                wiql_query = Wiql(
                    query=f"SELECT [System.Id], [System.Title] "
                          f"FROM WorkItems "
                          f"WHERE [System.TeamProject] = '{project.name}' "
                          f"AND ([System.WorkItemType] = '{wi_type}' OR [System.WorkItemType] = '{wi_type_2}') "
                          f"AND [System.State] <> 'Removed'"
                          f"AND [System.ChangedDate] >= '{semana_atras}'"
                )
            else:
                wiql_query = Wiql(
                    query=f"SELECT [System.Id], [System.Title] "
                          f"FROM WorkItems "
                          f"WHERE [System.TeamProject] = '{project.name}' "
                          f"AND ([System.WorkItemType] = '{wi_type}') "
                          f"AND [System.State] <> 'Removed'"
                          f"AND [System.ChangedDate] >= '{semana_atras}'"
                )

            # Ejecutar consulta
            wiql_results = wit_client.query_by_wiql(wiql_query).work_items
            
            if not wiql_results:
                print(f"   No se encontraron tareas en {project.name}.")
                continue

            # Extraer IDs
            work_item_ids = [item.id for item in wiql_results]
            
            ids.append(work_item_ids)
    except Exception as e:
        print(f"Ocurrió un error al usar el SDK: {e}")
        
    return ids

def d_field(d, field):
    "Function to delete fields"
    try:
        del d[field]
    except:
        pass
    
def d_to_date(d, field):
    "Function to convert fields into dates"
    try:
        d[field]=d[field].replace('Z', '+00:00')
        d[field]=datetime.fromisoformat(d[field])
        d[field]=datetime.strptime(d[field], "%Y-%m-%d %H:%M:%S")
        #Ultimo paso a fines comparativos
        d[field]=str(d[field])
    except:
        pass

def d_to_string(d,field):
    "Function to convert fields into strings"
    try:
        d[field]=str(d[field])
    except:
        pass

def notacion(d):
    "Notacion '_'"
    dic={}
    for a,b in d.items():
        if '.' in a:
            key_nueva=a.replace('.','_')
            dic[key_nueva]=b
        else:
            dic[a]=b
    return dic
    
def deup(lista):
    "function to deuplicate a list"
    set_lista=set(lista)
    lista_set=list(set_lista)
    return lista_set

#Function to create a colection
#Antiguamente se desduplicaba con Mongo, entonces se necesitaba "insert date to Mongo"
#Así como se necesitaban que las dates sean efectivamente dates
def create_coll(ids,wit_client, hoy):
    "Function to create a collection of a certain type of work"
    project=[]
    #Recorremos por proyecto
    for area in ids:
        work_item=[];ids_out=[]
        #Ahora por id
        for i in range(0,len(area),200):
            chunk_ids = area[i:i + 200]
            #Deuplicate chunks, if not, work_items would do it unadvised
            chunk_ids=deup(chunk_ids)
            work_items = wit_client.get_work_items(ids=chunk_ids, error_policy="omit",expand="Relations")
            for j,item in enumerate(work_items):
                #First the project properties
                f = item.fields
                #Then, the sons
                #f['insert_date_to_Mongo']=hoy

                #Extract some inside data
                try:
                    f['email']=f['System.AssignedTo']['uniqueName']
                except:
                    f['email']='Unknown'
                try:
                    f['name']=f['System.AssignedTo']['displayName']
                except:
                    f['name']='Unknown'
                    
                #Delete innecesary data
                d_field(f,'System.Reason');d_field(f,'System.AssignedTo');d_field(f,'System.CreatedBy');d_field(f,'System.ChangedBy')
                d_field(f,'System.CommentCount'), d_field(f,'Microsoft.VSTS.Common.Priority'), d_field(f,'Microsoft.VSTS.Common.StateChangeDate')
                d_field(f,'Microsoft.VSTS.Common.ActivatedDate');d_field(f,'Microsoft.VSTS.Common.ActivatedBy');d_field(f,'System.History')
                d_field(f,'Microsoft.VSTS.Common.ClosedBy');d_field(f,'System.Description');d_field(f,'Microsoft.VSTS.Common.StackRank')
                #Cambiar tipo de datos a date 
                d_to_date(f,'System.CreatedDate');d_to_date(f,'System.ChangedDate')
                d_to_date(f,'Microsoft.VSTS.Common.StateChangeDate');d_to_date(f,'Microsoft.VSTS.Common.ClosedDate')
                d_to_date(f,'Microsoft.VSTS.Common.ActivatedDate');d_to_date(f,'Microsoft.VSTS.Scheduling.StartDate')
                d_to_date(f,'Microsoft.VSTS.Scheduling.FinishDate')
                #Ahora a string
                d_to_string(f,'System_CreatedDate');d_to_string(f,'System_ChangedDate')
                d_to_string(f,'Microsoft_VSTS_Common_StateChangeDate');d_to_string(f,'Microsoft_VSTS_Common_ClosedDate')
                d_to_string(f,'Microsoft_VSTS_Common_ActivatedDate');d_to_string(f,'Microsoft_VSTS_Scheduling_StartDate')
                d_to_string(f,'Microsoft_VSTS_Scheduling_FinishDate')
                #El punto jode la query
                f=notacion(f)
                work_item.append(f)
                if j%10 ==0:
                    print('Se esta procesando el item '+str(j)+' de la vertical ')
            for element in chunk_ids:
                ids_out.append(element)
            #Agrego el id de Task a la task. Ya que el item no la posee
            for i in range(len(work_item)):
                work_item[i]['System_Id']=ids_out[i]
        project.append(work_item)
    return project

#Deprecated
def analisis_de_hijos(coll, wit_client):
    """Function to classify the sons of the objects in azure. The result must be several lists with ids depending of 
    the type of workitem"""

    projects=[];epic=[];feature=[];user_story=[];task=[];time_entry=[]
    for i,document in enumerate(coll):
        done=True
        chunk_ids = document['lista_id_hijos']
        try:
            work_items = wit_client.get_work_items(ids=chunk_ids, error_policy="omit",expand="Relations")
        except:
            done=False
        if done:
            #No se pueden relacionar cosas que no sean sons!1!
            for j,item in enumerate(work_items):
                #First the project properties
                tipo=item.fields['System.WorkItemType']
                #Clasifiquemos
                if tipo=='Task':
                    task.append(item.id)
                elif tipo=='Time Entry':
                    time_entry.append(item.id)
                elif tipo=='Feature':
                    feature.append(item.id)
                elif tipo=='Epic':
                    epic.append(item.id)
                elif tipo=='Project':
                    projects.append(item.id)
                elif tipo=='User Story':
                    user_story.append(item.id)
    return (projects,epic,feature,user_story,task,time_entry)

def extrae_parent(coll):
    """ Function que recorre workItems y extrae los parentId de cada uno de ellos en caso de tener """
    parents=[]
    for area in coll:
        parents_area=[]
        for w_item in area:
            try:
                parents_area.append(w_item['System_Parent'])
            except:
                pass
        parents.append(parents_area)
    return parents

def clasif(coll_parent,project_coll,features_coll,epic_coll,us_coll,claim_coll,unk_coll,task_coll=[]):
    """ Function para clasificar los padres de los time entrys """
    for area in coll_parent:
        for document in area:
            if document['System_WorkItemType']=='Project':
                project_coll.append(document)
            elif document['System_WorkItemType']=='Task':
                task_coll.append(document)
            elif document['System_WorkItemType']=='Epic':
                epic_coll.append(document)
            elif document['System_WorkItemType']=='User Story':
                us_coll.append(document)
            elif document['System_WorkItemType']=='Feature':
                features_coll.append(document)
            elif document['System_WorkItemType']=='Claim':
                claim_coll.append(document)
            else:
                unk_coll.append(document)

#Functions para handlear desduplicaciones

#Function para generar una collection con registros únicos entre 2 collections
def desdup_coll(coll1,coll2):
    coll3=[]
    for dic in coll1:
        if dic not in coll3:
            coll3.append(dic)
    for dic2 in coll2:
        if dic2 not in coll3:
            coll3.append(dic2)
    for document in coll3:
        d_to_string(document,'System_CreatedDate');d_to_string(document,'System_ChangedDate')
        d_to_string(document,'Microsoft_VSTS_Common_StateChangeDate');d_to_string(document,'Microsoft_VSTS_Common_ClosedDate')
        d_to_string(document,'Microsoft_VSTS_Common_ActivatedDate');d_to_string(document,'Microsoft_VSTS_Scheduling_StartDate')
        d_to_string(document,'Microsoft_VSTS_Scheduling_FinishDate');d_to_string(document,'insert_date_to_Mongo')
    return coll3

#Function para quedarse con los registros más nuevos
def only_new(coll_vieja,coll_nueva):
    registros_nuevos=[]
    for dic in coll_nueva:
        if dic not in coll_vieja:
            registros_nuevos.append(dic)
    return registros_nuevos


#Functions de S3

#Function para que se gnere el token MFA
def get_token_MFA(clave_secreta_MFA):
   """
   Genera un token MFA usando TOTP (Time-based One-Time Password).
   Este token debería ser EXACTAMENTE el mismo que ves en tu dispositivo
   (Google Authenticator, Authy, etc.) en el mismo momento.
   
   Nota: El token cambia cada 30 segundos, así que compáralo inmediatamente
   con tu dispositivo para verificar que coinciden.
   """
   #GENERATE THE 6-DIGIT CODE
   totp = pyotp.TOTP(clave_secreta_MFA)
   current_token = totp.now()
   
   # Calcular cuántos segundos quedan antes de que cambie el token
   remaining_seconds = 30 - (int(time.time()) % 30)
   
   print(f"Generated MFA Token: {current_token}")
   print(f"Este token es válido por {remaining_seconds} segundos más")
   print(f"Verifica que este código coincide con el de tu dispositivo ahora mismo")

   return current_token


#Function para generar credenciales nuevas
def get_cient_token_with_keys(aws_access_key_id, aws_secret_access_key, serial_number, token_code, region="us-east-1"):
    """
    Authenticates with long-term keys to request a temporary MFA session token.
    """
    try:
        # 1. Initialize STS client using your static Access Key and Secret Key
        sts_client = boto3.client(
            'sts',
            aws_access_key_id=aws_access_key_id,
            aws_secret_access_key=aws_secret_access_key,
            region_name=region
        )
        

        print("Authenticating with Access Key to request MFA session...")

        # 2. Request the temporary session token
        response = sts_client.get_session_token(
            DurationSeconds=7600,
            SerialNumber=serial_number,
            TokenCode=token_code
        )

        creds = response['Credentials']
        
        # 4. To actually USE these for other services (e.g., S3):
        s3_client = boto3.client(
            's3',
            aws_access_key_id=creds['AccessKeyId'],
            aws_secret_access_key=creds['SecretAccessKey'],
            aws_session_token=creds['SessionToken']
        )
        
        return s3_client
    except ClientError as e:
        print(f"AWS Error: {e.response['Error']['Message']}")
        return None
    except Exception as e:
        print(f"Error connecting to S3: {e}")
        return None

#Function que, a partir de un client, un s3_bucket y una palabra. Te devuelve una lista con los archivos que comienzan
#con dicha palabra
def list_maker(client,bucket,words):
    # Use a paginator to handle large numbers of objects automatically
    paginator = client.get_paginator('list_objects_v2')
    pages = paginator.paginate(Bucket=bucket)
    master_list=[]
    final_dict={}
    for page in pages:
        if 'Contents' in page:
            for obj in page['Contents']:
                master_list.append(obj['Key'])
    for palabra in words:
        final_dict[palabra]=[]
        for archivo in master_list:
            if archivo.split('-')[0]==palabra:
                final_dict[palabra].append(archivo)
    return final_dict
        
#Function que recibe un diccionario de listas de archivos y devuelve un diccionario de collections
def coll_maker(client_s3,bucket_name,listas):
    coll_dict={}
    for w_item in listas:
        w_item_total_collection=[]
        for archivo in listas[w_item]:
            #Se extrae el contenido crudo en forma de string
            response = client_s3.get_object(Bucket=bucket_name, Key=archivo)
            content = response['Body'].read().decode('utf-8')
            #Se arma la collection
            data_list = []
            # Use io.StringIO to treat the string content as a file
            for line in io.StringIO(content):
                # Strip whitespace and check if the line is not empty
                if line.strip():
                    try:
                        # Parse each line (a JSON string) into a Python dictionary
                        json_object = json.loads(line)
                        data_list.append(json_object)
                    except json.JSONDecodeError as e:
                        print(f"Error decoding JSON from line: {line}. Error: {e}")
                        continue
            w_item_total_collection=w_item_total_collection+data_list
        coll_dict[w_item]=w_item_total_collection
    return coll_dict

#Function to upload everything inside a folder to a S3 bucket
def upload_s3(s3_client,bucket,local_dir):
    for root, dirs, files in os.walk(local_dir):
        for filename in files:
            # Construct the full local path
            local_path = os.path.join(root, filename)
    
            try:
                print(f"Uploading {local_path} to s3://{bucket}")
                # The upload_file method handles large files automatically with multipart uploads
                s3_client.upload_file(local_path, bucket,filename)
                print(f"Successfully uploaded {filename}")
            except ClientError as e:
                print(f"Error uploading {filename}: {e}")
            except FileNotFoundError:
                print(f"File not found: {local_path}")






#Function para desduplicar las colls de S3 que ya vienen con duplicados dentro mismo de la collection -_-
def desdup_coll_within(coll):
    new_coll=[]
    for archivo in coll:
        #Resago de la utilizaci'on de Mongo. Solo el primero documento tiene este issue
        try:
            del archivo['insert_date_to_Mongo']
        except:
            pass
        if archivo not in new_coll:
            new_coll.append(archivo)
    for document in new_coll:
        d_to_string(document,'System_CreatedDate');d_to_string(document,'System_ChangedDate')
        d_to_string(document,'Microsoft_VSTS_Common_StateChangeDate');d_to_string(document,'Microsoft_VSTS_Common_ClosedDate')
        d_to_string(document,'Microsoft_VSTS_Common_ActivatedDate');d_to_string(document,'Microsoft_VSTS_Scheduling_StartDate')
        d_to_string(document,'Microsoft_VSTS_Scheduling_FinishDate');d_to_string(document,'insert_date_to_Mongo')
    return new_coll



#Function que recibe 2 collectios, la nueva y la vieja. Se queda con lo que aparece en la nueva pero no en la vieja
def dif_nuevo_viejo(coll_nueva,coll_vieja):
    dif_coll=[]
    for archivo in coll_nueva:
        if archivo not in coll_vieja:
            dif_coll.append(archivo)
    return dif_coll
    
#Function to create and delete a folder
def create_delete_folder(folder_path):

    # 1. Delete the entire folder and its contents
    if os.path.exists(folder_path):
        shutil.rmtree(folder_path)
        print(f"Deleted folder: {folder_path}")
    else:
        print(f"Folder not found: {folder_path}")
    
    # 2. Recreate an empty folder
    os.makedirs(folder_path)
    print(f"Recreated empty folder: {folder_path}")





def extract_data():
    """ Función principal para extraer datos de Azure DevOps
    y que orquesta todas las funciones de este scripts. """
    #(projects,epic,feature,task,time_entry)
    print('\n Este es el log del dia '+str(hoy))
    #Extraemos con azure. Primero todo lo corespondiente al auth
    conn=auth()
    clients=client(conn)
    core_client=clients[0];wit_client=clients[1]
    
    #********************Extracción************************************************
    
    #Extraemos los time entry para todas ls verticales
    ids_time_entrys=ids_de_query(core_client,wit_client,hoy,'time entry',wi_type_2=False)
    entrys=create_coll(ids_time_entrys,wit_client,hoy)
    
    #Bien, una vez que sacamos los time entry vamos cascadeando hacia arriba y clasificando
    project_coll=[];task_coll=[];features_coll=[];epic_coll=[];us_coll=[];unk_coll=[];claim_coll=[]
    sigue=True;i=1;coll_parent=entrys
    while sigue:
        print('Iteracion nro '+str(i))
        #Le sacamos el parentId (en caso de tener) a cada uno de los work_items
        ids_padres=extrae_parent(coll_parent)
        #Vemos que existan padres
        suma=0
        for areas in ids_padres:
            suma=suma+len(areas)
        if suma ==0:
            sigue=False
        #Sacamos la identidad de estos padres sean lo que sean: tasks, projects, etc
        coll_parent=create_coll(ids_padres,wit_client,hoy)
        #clasificamos dependiendo de que sea el parent
        clasif(coll_parent,project_coll,features_coll,epic_coll,us_coll,claim_coll,unk_coll,task_coll)
        i=i+1
        
    #unificamos en una lista tods los time_entrys
    coll_time_entrys=[]
    for area in entrys:
        coll_time_entrys=coll_time_entrys+area
        
    
    #Se hace lo mismo pero partiendo de un "nuevo piso": tasks
    #Salvo PSMO y Data, el resto de las áreas usan task como si fueran time entrys
    
    
    ids_tasks=ids_de_query(core_client,wit_client,hoy,'task',wi_type_2=False)
    entrys_task=create_coll(ids_tasks,wit_client,hoy)
    
    #Bien, una vez que sacamos los time entry vamos cascadeando hacia arriba y clasificando
    project_task_coll=[];features_task_coll=[];epic_task_coll=[];us_task_coll=[];unk_task_coll=[];claim_task_coll=[]
    sigue=True;i=1;coll_parent=entrys_task
    while sigue:
        print('Iteracion nro '+str(i))
        #Le sacamos el parentId (en caso de tener) a cada uno de los work_items
        ids_padres=extrae_parent(coll_parent)
        #Vemos que existan padres
        suma=0
        for areas in ids_padres:
            suma=suma+len(areas)
        if suma ==0:
            sigue=False
        #Sacamos la identidad de estos padres sean lo que sean: tasks, projects, etc
        coll_parent=create_coll(ids_padres,wit_client,hoy)
        #clasificamos dependiendo de que sea el parent
        clasif(coll_parent,project_task_coll,features_task_coll,epic_task_coll,us_task_coll,
               claim_task_coll,unk_task_coll)
        i=i+1
        
    
    #unificamos en una lista tods los time_entrys
    coll_tasks=[]
    for area in entrys_task:
        coll_tasks=coll_tasks+area
    
    #******************DESDUPLICACIÓN Y PERSISTENCIA*********************
    
    #Ya se tienen las collections generadas 2 veces, desde task y desde time_entrys
    #Desduplicamos ahora dichas collections
    project_coll=desdup_coll(project_coll,project_task_coll)
    epic_coll=desdup_coll(epic_coll,epic_task_coll)
    features_coll=desdup_coll(features_coll,features_task_coll)
    us_coll=desdup_coll(us_coll,us_task_coll)
    task_coll=desdup_coll(task_coll,coll_tasks)
    claim_coll=desdup_coll(claim_coll,claim_task_coll)
    unk_coll=desdup_coll(unk_coll,unk_task_coll)
    coll_time_entrys=desdup_coll_within(coll_time_entrys)
    
    #Bueno, nueva manera:
        #Se abre el bucket de S3 y se llama a todos los .jsonl de cada categoría
        #Se los unifica en una sola collection, renombrando estas collection como "s3"
        #Creamos collections de "registros nuevos"
        #Collection de registros nuevos se persiste y se sube a S3
        #Collection de registros nuevos + Collection de S3 se sube a carpeta local para ser usada en BBDD 
        #Fin
        
    #Auth con MFA
    token_code=get_token_MFA(clave_secreta_MFA)
    client_s3=get_cient_token_with_keys(aws_access_key_id, aws_secret_access_key, serial_number, token_code, region=AWS_REGION)

    #Obtenemos los archivos del bucket separados en listas correspondientes a tipo de work item
    bucket_name = AWS_S3_BUCKET
    
    listas=list_maker(client_s3,bucket_name,['claims','epics','features','projects','tasks','time','unknowns','user'])
    
    #Obtenemos todos las collections persistidas en s3 para cada tipo de work item
    collections_s3=coll_maker(client_s3,bucket_name,listas)
    
    #Obtenemos ahora si las collections s3
    coll_tasks_s3=collections_s3['tasks'];coll_features_s3=collections_s3['features']
    coll_epics_s3=collections_s3['epics'];coll_time_entrys_s3=collections_s3['time']
    coll_us_s3=collections_s3['user'];coll_uk_s3=collections_s3['unknowns']
    coll_projects_s3=collections_s3['projects'];coll_claims_s3=collections_s3['claims']
    
    #Desduplicamos estas collections que vienen con duplicados
    coll_us_s3=desdup_coll_within(coll_us_s3)
    coll_tasks_s3=desdup_coll_within(coll_tasks_s3)
    coll_features_s3=desdup_coll_within(coll_features_s3)
    coll_epics_s3=desdup_coll_within(coll_epics_s3)
    coll_time_entrys_s3=desdup_coll_within(coll_time_entrys_s3)
    coll_uk_s3=desdup_coll_within(coll_uk_s3)
    coll_projects_s3=desdup_coll_within(coll_projects_s3)
    coll_claims_s3=desdup_coll_within(coll_claims_s3)
    
    
    
    #Obtenemos las colls diferenciales: Lo que se encuentra en la tirada última pero no en el historico de S3
    #Así como documentos que si están pero fueron modificados
    coll_diff_claim=dif_nuevo_viejo(claim_coll,coll_claims_s3)
    coll_diff_us=dif_nuevo_viejo(us_coll,coll_us_s3)
    coll_diff_tasks=dif_nuevo_viejo(task_coll,coll_tasks_s3)
    coll_diff_projects=dif_nuevo_viejo(project_coll,coll_projects_s3)
    coll_diff_features=dif_nuevo_viejo(features_coll,coll_features_s3)
    coll_diff_time_entrys=dif_nuevo_viejo(coll_time_entrys,coll_time_entrys_s3)
    coll_diff_uk=dif_nuevo_viejo(unk_coll,coll_uk_s3)
    coll_diff_epics=dif_nuevo_viejo(epic_coll,coll_epics_s3)
    
    #Subimos las colls diferenciales a S3
    #Primero, borramos todo lo que pueda haber en data_diferencial
    dir_cwd = str(Path(__file__).parent / 'data_diferencial') + '/'
    create_delete_folder(dir_cwd)
    
    #Luego, escribimos los .jsonl a data_diferencial
    #TIENEN QUE ESTAR EN EL MISMO ORDEN
    collections_diff=[coll_diff_claim,coll_diff_us,coll_diff_tasks,coll_diff_projects,coll_diff_features,
                      coll_diff_time_entrys,coll_diff_uk,coll_diff_epics]
    
    name_files=['claims','user-storys','tasks','projects','features','time-entrys',
                'unknowns','epics']
    
    # Quiero que se guarde en este path en este root
    for i in range(len(name_files)):
        print(dir_cwd+f"{name_files[i]}")
        #Solo si efectivamente hay nuevos datos
        if len(collections_diff[i])>0:
            export_to_jsonl(dir_cwd+f"{name_files[i]}"+'-'+str(hoy).replace(' ','-'),collections_diff[i])
        
    #Por último, subimos la carpeta entera a S3
    upload_s3(client_s3,bucket_name,dir_cwd)
    
    
    
    #Sumamos las colls diferenciales a las históricas y eso lo persistimos en la carpeta "data"
    #Para que pueda ser usado por la BBDD y metabase
    coll_claim=coll_diff_claim+coll_claims_s3
    coll_features=coll_diff_features+coll_features_s3
    coll_tasks=coll_diff_tasks+coll_tasks_s3
    coll_epics=coll_diff_epics+coll_epics_s3
    coll_unk=coll_diff_uk+coll_uk_s3
    coll_us=coll_diff_us+coll_us_s3
    coll_time_entrys=coll_diff_time_entrys+coll_time_entrys_s3
    coll_projects=coll_diff_projects+coll_projects_s3
    
    #Se crea un jsonl global con toda la data para cada work item
    name_files=['projects','epics','features','user_storys','tasks','time_entrys',
                'claims','unknowns']
    collections=[coll_projects,coll_epics,coll_features,coll_us,coll_tasks,coll_time_entrys,coll_claim,coll_unk]
    
    # Quiero que se guarde en este path en este root
    dir_cwd = str(Path(__file__).parent / 'data') + '/'
    for i in range(len(name_files)):
        print(dir_cwd+f"{name_files[i]}")
        export_to_jsonl(dir_cwd+f"{name_files[i]}",collections[i])