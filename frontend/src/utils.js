// Canónico que representa ausencias (vacaciones, licencias, feriados, etc.)
// Debe coincidir exactamente con el valor en activity_mapping.json
export const AUSENCIA_CANONICO = 'Vacaciones / Licencia'

// Devuelve los valores únicos (no null) de un campo, ordenados
export function unique(data, field) {
  const s = new Set()
  for (const item of data) {
    const v = item[field]
    if (v !== null && v !== undefined && v !== '') s.add(v)
  }
  return [...s].sort((a, b) => String(a).localeCompare(String(b)))
}

// Agrupa por campo y suma CompletedWork
export function groupBySum(data, field) {
  const map = {}
  for (const item of data) {
    const key = item[field] ?? '(Sin valor)'
    map[key] = (map[key] || 0) + (item.CompletedWork || 0)
  }
  return Object.entries(map)
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value)
}

// Construye un Map<alias_lowercase -> canonico> a partir del JSON de mappings
// Funciona para activity_mapping.json y client_mapping.json (misma estructura)
export function buildActivityMapper(mappings) {
  const map = new Map()
  if (!Array.isArray(mappings)) return map
  for (const entry of mappings) {
    if (!entry.canonico || !Array.isArray(entry.aliases)) continue
    for (const alias of entry.aliases) {
      map.set(String(alias).toLowerCase().trim(), entry.canonico)
    }
  }
  return map
}

// Alias semántico para mayor claridad al usarlo con clientes
export const buildClientMapper = buildActivityMapper

// Devuelve el valor canónico de CustomCliente aplicando el mapper
export function normalizeCliente(item, mapper) {
  const raw = item.CustomCliente || ''
  if (!raw) return null
  if (!mapper || mapper.size === 0) return raw
  return mapper.get(raw.toLowerCase().trim()) || raw
}

// Devuelve el valor canónico de Actividad para un item, aplicando el mapper
// Si no hay match, devuelve el valor original (o '(Sin actividad)')
export function normalizeActividad(item, mapper) {
  const raw = item.Actividad || ''
  if (!raw) return '(Sin actividad)'
  if (!mapper || mapper.size === 0) return raw
  return mapper.get(raw.toLowerCase().trim()) || raw
}

// Construye una función categorizadora a partir de ancestor_mapping.json
// Devuelve { categorize(item) -> canonico, colorMap: { canonico -> color } }
export function buildAncestorCategorizer(categorias) {
  const colorMap = {}
  if (!Array.isArray(categorias)) return { categorize: () => null, colorMap }

  for (const cat of categorias) {
    colorMap[cat.canonico] = cat.color || '#64748b'
  }

  return {
    colorMap,
    categorize(item) {
      const wiType = item.WorkItemTypeAncestor || ''
      const title  = (item.TitleAncestor || '').toLowerCase()
      for (const cat of categorias) {
        for (const rule of (cat.rules || [])) {
          const types = rule.types || []
          const typeMatch = types.includes('*') || types.includes(wiType)
          if (!typeMatch) continue
          const kwds = rule.titleContains
          if (kwds && kwds.length > 0) {
            if (!kwds.some(k => title.includes(k.toLowerCase()))) continue
          }
          return cat.canonico
        }
      }
      return null
    }
  }
}

// Parsea 'YYYY-MM-DD' como fecha local (evita desfase UTC en Argentina)
function parseLocalDate(ds) {
  const [y, m, d] = ds.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Genera datos de heatmap tipo GitHub: { dateStr -> horas } para una persona
// Devuelve array de semanas, cada semana = array de 7 días {date, hours, dow}
export function buildCalendarData(data, person) {
  const items = person ? data.filter(d => d.AssignedTo === person) : data
  // Acumular horas por fecha; ausencias se guardan separadas
  const map = {}       // fecha -> horas trabajadas
  const ausMap = {}    // fecha -> horas de ausencia
  for (const item of items) {
    if (!item.StartDate || !item.CompletedWork) continue
    const d = item.StartDate.slice(0, 10)
    if (item._esAusencia) {
      ausMap[d] = (ausMap[d] || 0) + item.CompletedWork
    } else {
      map[d] = (map[d] || 0) + item.CompletedWork
    }
  }
  // Unificar rango de fechas para que ausencias sin trabajo también aparezcan
  const allDates = new Set([...Object.keys(map), ...Object.keys(ausMap)])
  for (const d of allDates) {
    if (!(d in map)) map[d] = 0
  }
  if (Object.keys(map).length === 0) return []
  // Rango de fechas
  const dates = Object.keys(map).sort()
  const cur = parseLocalDate(dates[0])
  const end = parseLocalDate(dates[dates.length - 1])
  // Retroceder al lunes anterior al primer día (lunes=0 ... domingo=6)
  const dow0 = (cur.getDay() + 6) % 7
  cur.setDate(cur.getDate() - dow0)
  const weeks = []
  while (cur <= end) {
    const week = []
    for (let d = 0; d < 7; d++) {
      const y = cur.getFullYear()
      const m = String(cur.getMonth() + 1).padStart(2, '0')
      const dd = String(cur.getDate()).padStart(2, '0')
      const ds = `${y}-${m}-${dd}`
      week.push({ date: ds, hours: map[ds] || 0, ausencia: ausMap[ds] || 0, dow: d })
      cur.setDate(cur.getDate() + 1)
    }
    weeks.push(week)
  }
  return weeks
}

// Resumen por persona: { name, hours, wis, avgPerWi }
export function buildPersonSummary(data, feriadosSet) {
  const map = {}
  for (const item of data) {
    const p = item.AssignedTo || '(Sin asignar)'
    if (!map[p]) map[p] = { name: p, hours: 0, horasAusencia: 0, wis: 0 }
    if (item._esAusencia) {
      // Solo contar ausencia si el día es laborable (no feriado, no finde)
      const fecha = item.StartDate?.slice(0, 10)
      if (fecha) {
        const [y, m, d] = fecha.split('-').map(Number)
        const dow = new Date(y, m - 1, d).getDay() // 0=dom, 6=sáb
        const esFinde   = dow === 0 || dow === 6
        const esFeriado = feriadosSet ? feriadosSet.has(fecha) : false
        if (!esFinde && !esFeriado) {
          map[p].horasAusencia += item.CompletedWork || 0
        }
      }
    } else {
      map[p].hours += item.CompletedWork || 0
      map[p].wis += 1
    }
  }
  return Object.values(map)
    .map(p => ({
      ...p,
      hours:         Math.round(p.hours         * 100) / 100,
      horasAusencia: Math.round(p.horasAusencia * 100) / 100,
      avgPerWi: p.wis > 0 ? Math.round((p.hours / p.wis) * 100) / 100 : 0
    }))
    .sort((a, b) => (b.hours + b.horasAusencia) - (a.hours + a.horasAusencia))
}

// Formato horas con 2 decimales
export function fmtH(v) {
  return Number(v).toFixed(2) + ' h'
}

// ── Observaciones de horas inhabituales ───────────────────
// Retorna un Map<itemId -> { tipos: string[], detalle: string }>
// Tipos posibles: 'exceso' (>8h/día), 'finde' (sáb/dom), 'feriado'
export function buildObservaciones(data, feriadosSet) {
  // 1. Acumular horas por (persona, fecha) — sin contar ausencias
  const horasPorDia = new Map()
  for (const item of data) {
    if (item._esAusencia) continue
    if (!item.StartDate || !item.CompletedWork) continue
    const fecha = item.StartDate.slice(0, 10)
    const key   = `${item.AssignedTo || ''}__${fecha}`
    horasPorDia.set(key, (horasPorDia.get(key) || 0) + item.CompletedWork)
  }

  // 2. Etiquetar cada item (sin ausencias)
  const obs = new Map()
  for (const item of data) {
    if (item._esAusencia) continue
    if (!item.StartDate) continue
    const fecha = item.StartDate.slice(0, 10)
    const [y, m, d] = fecha.split('-').map(Number)
    const dt  = new Date(y, m - 1, d)
    const dow = dt.getDay() // 0=dom, 6=sáb

    const tipos   = []
    const detalles = []

    if (dow === 0 || dow === 6) {
      tipos.push('finde')
      detalles.push(dow === 6 ? 'Sábado' : 'Domingo')
    }
    if (feriadosSet && feriadosSet.has(fecha)) {
      tipos.push('feriado')
      detalles.push('Feriado nacional')
    }
    const key  = `${item.AssignedTo || ''}__${fecha}`
    const sumH = horasPorDia.get(key) || 0
    if (sumH > 8 && dow !== 0 && dow !== 6 && !(feriadosSet && feriadosSet.has(fecha))) {
      tipos.push('exceso')
      detalles.push(`${sumH.toFixed(1)} h en el día (> 8 h)`)
    }

    if (tipos.length > 0) {
      obs.set(item.Id, { tipos, detalle: detalles.join(' · ') })
    }
  }
  // Exponer horasPorDia para que los consumidores puedan calcular exceso neto
  obs._horasPorDia = horasPorDia
  return obs
}

// Badge de estado
export function stateBadgeClass(state) {
  if (!state) return 'badge badge-default'
  const s = state.toLowerCase()
  if (s === 'closed') return 'badge badge-closed'
  if (s === 'done') return 'badge badge-done'
  if (s === 'active' || s === 'doing' || s === 'in progress') return 'badge badge-active'
  if (s === 'new' || s === 'planning') return 'badge badge-new'
  return 'badge badge-default'
}

// Formatea fecha ISO a dd/mm/yyyy
export function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
