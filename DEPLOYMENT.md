
Railway deploy — guía rápida

Resumen
- Se desplegarán 3 servicios en Railway: `frontend` (sitio estático con Nginx), `backend` (FastAPI) y una base de datos PostgreSQL (plugin). Además puedes crear un servicio `loader` para tareas programadas.

Pasos detallados

1) Conectar el repositorio
- Desde Railway > Projects > New Project > Deploy from GitHub, selecciona el repositorio `timesheet-mvp`.

2) Crear plugin PostgreSQL
- En tu proyecto Railway, ve a "Plugins" > Add Plugin > PostgreSQL. Railway creará una base de datos y expondrá la variable `DATABASE_URL` en el entorno del proyecto.

3) Backend (FastAPI)
- Crear servicio: New Service > Deploy from Dockerfile.
- Dockerfile path: `Dockerfile.backend` (archivo en la raíz del repo).
- Railway detecta el build context y construirá la imagen. En Environment Variables no necesitas añadir `DATABASE_URL` manualmente si usas el plugin, pero puedes añadir variables adicionales como `LOADER_CRON_SCHEDULE`.
- `database.py` detecta `DATABASE_URL` automáticamente.

4) Frontend (Vite + Nginx)
- Opción A (Docker): New Service > Deploy from Dockerfile > Dockerfile path: `frontend/Dockerfile`.
- En Build Environment Variables añade `VITE_API_URL` con el URL público del backend, por ejemplo `https://your-backend.up.railway.app`.
- Opción B (recomendado si quieres ahorrar recursos): desplegar el contenido estático `dist/` en un host estático (Vercel/Netlify/Cloudflare Pages). Si eliges Railway, la Dockerfile actual ya construye y sirve con Nginx.

5) Loader / Tareas programadas
- Para ejecutar `loader.py` periódicamente puedes:
  - Crear un servicio separado `loader` usando `Dockerfile.loader` (incluido en el repo) y configurar Railway Scheduled Jobs para llamar al endpoint o al contenedor según la frecuencia.
  - O ejecutar el `loader` como job manual/one-off desde Railway.

6) Qué añadí al repo
- `Dockerfile.backend` — imagen para el backend (uvicorn, respeta `PORT`).
- `Dockerfile.loader` — imagen mínima que arranca `loader-entrypoint.sh`.
- `frontend/Dockerfile` — ya existente y preparado para `VITE_API_URL`.
- `.dockerignore` y `frontend/.dockerignore` — reducen tamaños de build.
- `DEPLOYMENT.md` — esta guía.

7) Comprobación local rápida
- Backend:
```bash
docker build -f Dockerfile.backend -t timesheet-backend .
docker run -e PORT=8000 -p 8000:8000 -e DATABASE_URL="postgresql+psycopg2://user:pass@host:5432/dbname" timesheet-backend
```
- Frontend build locally:
```bash
cd frontend
npm ci
VITE_API_URL="http://localhost:8000" npm run build
```

8) Recomendaciones finales
- Setea `VITE_API_URL` como Build Env Var en Railway para bakear la URL en la build (si usas Docker). Si prefieres que el frontend llame a la misma origin y uses proxy Nginx, deja la variable vacía.
- Para seguridad, no pongas credenciales en el repo; usa las Environment Variables que Railway expone.

Comandos para empujar los cambios (local):
```bash
git checkout -b feat/railway-deploy
git add .
git commit -m "Add Railway deployment files: Dockerfiles, dockerignore, deployment guide"
git push origin feat/railway-deploy
```

