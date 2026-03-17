<h1 align="center">
  <img align="center"; src="https://urbetrack.com/hs-fs/hubfs/URBE.Logo.navegaci%C3%B3n-dark.png?width=200&height=52&name=URBE.Logo.navegaci%C3%B3n-dark.png" width="100px">
</h1>

# ⚙️ timesheet

Primer Dashboard MVP para ver timesheet de los equipos de tecnología.

## 🚥 Arquitectura

![flujo](docs/flujo.png)

| Contenedor | Descripción |
|---|---|
| `postgresql` | Base de datos PostgreSQL |
| `etl` | Extrae datos de Azure DevOps y S3, los transforma y los carga en PostgreSQL. Corre en un crontab. |
| `api` | FastAPI que expone los datos de PostgreSQL |
| `frontend` | Dashboard React servido por Nginx en el puerto 3000 |

## 🛠️ Requisitos

- [Docker](https://www.docker.com/) y Docker Compose

## 🚀 Cómo ejecutar

### 1. Clonar el repositorio

```bash
git clone <url-del-repo>
cd timesheet-api
```

### 2. Configurar variables de entorno

Copiar el archivo de ejemplo y completar los valores:

```bash
cp .env.example .env
```

Editar `.env` con los valores correspondientes:

```bash
# PostgreSQL
DB_USER=
DB_PASSWORD=
DB_HOST=localhost
DB_PORT=5432
DB_NAME=

# Azure DevOps
AZURE_URL=               # URL de la organización (ej: https://dev.azure.com/mi-org)
ACCESS_TOKEN=            # Personal Access Token de Azure DevOps

# AWS S3
aws_access_key_id=
aws_secret_access_key=
serial_number=           # ARN del dispositivo MFA (ej: arn:aws:iam::123456789:mfa/usuario)
clave_secreta_MFA=       # Clave secreta TOTP del dispositivo MFA
AWS_REGION=us-east-1
AWS_S3_BUCKET=           # Nombre del bucket S3 con los datos históricos

# Schedule del ETL (formato crontab)
LOADER_CRON_SCHEDULE=0 20 * * *   # Por defecto: todos los días a las 20:00
```

> Los valores de `API_PORT` (default `8000`) y `FRONTEND_PORT` (default `3000`) son opcionales.

### 3. Levantar los contenedores

```bash
docker compose up -d --build
```

### 4. Seguir la ejecución inicial del ETL

El ETL corre automáticamente al iniciar el contenedor y luego según el schedule configurado. Para ver los logs en tiempo real:

```bash
docker logs -f etl
```

### 5. Acceder

| Servicio | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API (Swagger) | http://localhost:8000/docs |

> ⚠️ Verificar que los puertos `5432`, `8000` y `3000` no estén en uso por otros procesos.

## 📋 Endpoints de la API

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/flat` | Datos flat con filtros opcionales `?desde=YYYY-MM-DD&hasta=YYYY-MM-DD` |
| GET | `/colaboradores` | Lista de colaboradores por vertical |
| GET | `/clients` | Mapeo de clientes |
| GET | `/activity` | Mapeo de actividades |
| GET | `/feriados` | Lista de feriados |
| GET | `/ancestor` | Mapeo de ancestros |

## 🔧 Comandos útiles

```bash
# Ver logs de cada contenedor
docker logs -f etl
docker logs -f api
docker logs -f frontend

# Ejecutar el ETL manualmente (sin esperar el cron)
docker exec etl python loader.py

# Detener todos los contenedores
docker compose down

# Detener y eliminar volúmenes (borra la DB)
docker compose down -v
```

## 📌 Mejoras pendientes

- [ ] Agregar validadores a todos los endpoints
- [ ] Crear tests
- [ ] Mejoras en la carpeta `etl`
- [ ] En `settings` migrar `colaboradores_verticales.csv` a JSON
- [ ] Caché para el endpoint `/flat` si se vuelve lento
- [ ] Agregar fecha de ejecución en logs

## 👥 Contribuidores

- Pablo Piccoli
- Juan Cruz Romero
