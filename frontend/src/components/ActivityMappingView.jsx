// Vista del mapeo de actividades configurado en activity_mapping.json
// Muestra cada grupo canónico con sus aliases y las horas acumuladas por grupo

import { useMemo, useState } from 'react'
import { groupBySum } from '../utils'

// Paleta de colores para los grupos (cicla si hay más de N grupos)
const GROUP_COLORS = [
  '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#84cc16',
  '#6366f1', '#0ea5e9', '#d946ef', '#22d3ee', '#a3e635',
  '#fb923c',
]

export default function ActivityMappingView({ allData, mappings }) {
  const [search, setSearch] = useState('')

  // Horas por ActividadNorm (ya normalizada en cada item)
  const horasPorNorm = useMemo(() => {
    const map = {}
    for (const item of allData) {
      const key = item.ActividadNorm || '(Sin actividad)'
      map[key] = (map[key] || 0) + (item.CompletedWork || 0)
    }
    return map
  }, [allData])

  // Horas por Actividad cruda (para mostrar en cada alias)
  const horasPorRaw = useMemo(() => {
    const map = {}
    for (const item of allData) {
      const key = item.Actividad || '(Sin actividad)'
      map[key] = (map[key] || 0) + (item.CompletedWork || 0)
    }
    return map
  }, [allData])

  // Total general de horas
  const totalHoras = useMemo(
    () => allData.reduce((s, d) => s + (d.CompletedWork || 0), 0),
    [allData]
  )

  // Actividades crudas que NO están mapeadas en ningún alias
  const aliasesEnMapping = useMemo(() => {
    const set = new Set()
    for (const entry of (mappings || [])) {
      for (const alias of (entry.aliases || [])) {
        set.add(alias.toLowerCase().trim())
      }
    }
    return set
  }, [mappings])

  const sinMapear = useMemo(() => {
    const resultado = []
    for (const [raw, horas] of Object.entries(horasPorRaw)) {
      if (raw === '(Sin actividad)') continue
      if (!aliasesEnMapping.has(raw.toLowerCase().trim())) {
        resultado.push({ raw, horas: Math.round(horas * 100) / 100 })
      }
    }
    return resultado.sort((a, b) => b.horas - a.horas)
  }, [horasPorRaw, aliasesEnMapping])

  const q = search.toLowerCase().trim()
  const filtered = (mappings || []).filter(entry => {
    if (!q) return true
    if (entry.canonico.toLowerCase().includes(q)) return true
    return (entry.aliases || []).some(a => a.toLowerCase().includes(q))
  })

  const maxHoras = Math.max(...filtered.map(e => horasPorNorm[e.canonico] || 0), 1)

  return (
    <div className="actmap-wrap">

      {/* Banner */}
      <div className="person-view-banner" style={{ marginBottom: '1.2rem' }}>
        <span className="person-view-banner-icon">🗂️</span>
        <span>
          Mapeo configurado en <strong>activity_mapping.json</strong> · los aliases se normalizan al valor canónico en runtime
        </span>
        <span className="person-view-banner-tag">{(mappings || []).length} grupos</span>
      </div>

      {/* Buscador */}
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Buscar canónico o alias…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="actmap-search"
        />
      </div>

      {/* Grilla de grupos */}
      <div className="actmap-grid">
        {filtered.map((entry, idx) => {
          const color = GROUP_COLORS[idx % GROUP_COLORS.length]
          const horas = Math.round((horasPorNorm[entry.canonico] || 0) * 100) / 100
          const pct   = totalHoras > 0 ? (horas / totalHoras) * 100 : 0
          const barW  = maxHoras > 0 ? Math.round((horas / maxHoras) * 100) : 0

          return (
            <div key={entry.canonico} className="actmap-card" style={{ '--group-color': color }}>

              {/* Cabecera del grupo */}
              <div className="actmap-card-header">
                <span className="actmap-dot" style={{ background: color }} />
                <span className="actmap-canonico">{entry.canonico}</span>
                <span className="actmap-horas">{horas.toFixed(1)} h</span>
              </div>

              {/* Barra de horas relativa al grupo con más horas */}
              <div className="actmap-bar-wrap">
                <div className="actmap-bar" style={{ width: `${barW}%`, background: color }} />
                <span className="actmap-pct">{pct.toFixed(1)}% del total</span>
              </div>

              {/* Aliases */}
              <div className="actmap-aliases">
                {(entry.aliases || []).map(alias => {
                  const h = Math.round((horasPorRaw[alias] || 0) * 100) / 100
                  const isCanon = alias === entry.canonico
                  return (
                    <div key={alias} className={`actmap-alias${isCanon ? ' actmap-alias-canon' : ''}`}>
                      <span className="actmap-alias-name">{alias}</span>
                      {isCanon && <span className="actmap-alias-badge">canónico</span>}
                      <span className="actmap-alias-h">{h > 0 ? `${h.toFixed(1)} h` : '—'}</span>
                    </div>
                  )
                })}
              </div>

            </div>
          )
        })}
      </div>

      {/* Actividades sin mapear */}
      {sinMapear.length > 0 && !q && (
        <div className="actmap-unmapped">
          <div className="actmap-unmapped-title">
            ⚠️ Actividades sin mapear
            <span className="tab-count" style={{ marginLeft: '0.5rem' }}>{sinMapear.length}</span>
          </div>
          <div className="actmap-aliases" style={{ marginTop: '0.5rem' }}>
            {sinMapear.map(({ raw, horas }) => (
              <div key={raw} className="actmap-alias actmap-alias-warn">
                <span className="actmap-alias-name">{raw}</span>
                <span className="actmap-alias-h">{horas.toFixed(1)} h</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
