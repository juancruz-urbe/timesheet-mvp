// Cliente HTTP centralizado para la API REST
// URL base configurable via variable de entorno VITE_API_URL
const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export const fetchFlat = (desde, hasta) => {
  const params = new URLSearchParams()
  if (desde) params.set('desde', desde)
  if (hasta) params.set('hasta', hasta)
  const qs = params.toString()
  return fetch(`${BASE}/flat${qs ? `?${qs}` : ''}`).then(r => r.json())
}

export const fetchActivity      = () => fetch(`${BASE}/activity`).then(r => r.json())
export const fetchClients       = () => fetch(`${BASE}/clients`).then(r => r.json())
export const fetchFeriados      = () => fetch(`${BASE}/feriados`).then(r => r.json())
export const fetchAncestor      = () => fetch(`${BASE}/ancestor`).then(r => r.json())
export const fetchColaboradores = () => fetch(`${BASE}/colaboradores`).then(r => r.json())
