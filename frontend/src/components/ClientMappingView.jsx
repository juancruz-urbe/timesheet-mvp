// Vista del mapeo de clientes configurado en client_mapping.json
// Muestra cada grupo canónico con sus aliases y las horas acumuladas por grupo

import { useMemo, useState } from 'react'

const GROUP_COLORS = [
  '#06b6d4', '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#84cc16',
  '#6366f1', '#0ea5e9', '#d946ef', '#22d3ee', '#a3e635',
  '#fb923c',
]

export default function ClientMappingView({ allData, mappings }) {
  const [search, setSearch] = useState('')

  // Horas por ClienteNorm (ya normalizado en cada item)
  const horasPorNorm = useMemo(() => {
    const map = {}
    for (const item of allData) {
      const key = item.ClienteNorm
      if (!key) continue
      map[key] = (map[key] || 0) + (item.CompletedWork || 0)
    }
    return map
  }, [allData])

  // Horas por valor crudo de CustomCliente
  const horasPorRaw = useMemo(() => {
    const map = {}
    for (const item of allData) {
      const key = item.CustomCliente
      if (!key) continue
      map[key] = (map[key] || 0) + (item.CompletedWork || 0)
    }
    return map
  }, [allData])

  // WIs por ClienteNorm
  const wisPorNorm = useMemo(() => {
    const map = {}
    for (const item of allData) {
      const key = item.ClienteNorm
      if (!key) continue
      map[key] = (map[key] || 0) + 1
    }
    return map
  }, [allData])

  const totalHoras = useMemo(
    () => allData.reduce((s, d) => s + (d.CompletedWork || 0), 0),
    [allData]
  )

  // WIs/horas sin cliente asignado
  const sinCliente = useMemo(() => {
    let h = 0, w = 0
    for (const item of allData) {
      if (!item.CustomCliente) { h += item.CompletedWork || 0; w++ }
    }
    return { horas: Math.round(h * 100) / 100, wis: w }
  }, [allData])

  // Valores crudos que no están en ningún alias del mapping
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
        <span className="person-view-banner-icon">🏢</span>
        <span>
          Mapeo configurado en <strong>client_mapping.json</strong> · los aliases se normalizan al valor canónico en runtime
        </span>
        <span className="person-view-banner-tag">{(mappings || []).length} clientes</span>
      </div>

      {/* Resumen: sin cliente */}
      {sinCliente.wis > 0 && (
        <div style={{
          background: '#111827', border: '1px solid #1e2d42', borderRadius: 7,
          padding: '0.6rem 1rem', marginBottom: '1rem',
          fontSize: '0.8rem', color: '#64748b', display: 'flex', gap: '1.5rem'
        }}>
          <span>⬜ <strong style={{ color: '#94a3b8' }}>{sinCliente.wis.toLocaleString('es-AR')}</strong> WIs sin cliente asignado</span>
          <span><strong style={{ color: '#94a3b8' }}>{sinCliente.horas.toFixed(1)} h</strong> ({totalHoras > 0 ? ((sinCliente.horas / totalHoras) * 100).toFixed(1) : 0}% del total)</span>
        </div>
      )}

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
          const wis   = wisPorNorm[entry.canonico] || 0
          const pct   = totalHoras > 0 ? (horas / totalHoras) * 100 : 0
          const barW  = maxHoras > 0 ? Math.round((horas / maxHoras) * 100) : 0

          return (
            <div key={entry.canonico} className="actmap-card" style={{ '--group-color': color }}>

              <div className="actmap-card-header">
                <span className="actmap-dot" style={{ background: color }} />
                <span className="actmap-canonico">{entry.canonico}</span>
                <span className="actmap-horas">{horas.toFixed(1)} h</span>
              </div>

              <div className="actmap-bar-wrap">
                <div className="actmap-bar" style={{ width: `${barW}%`, background: color }} />
                <span className="actmap-pct">{pct.toFixed(1)}% · {wis.toLocaleString('es-AR')} WIs</span>
              </div>

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

      {/* Sin mapear */}
      {sinMapear.length > 0 && !q && (
        <div className="actmap-unmapped">
          <div className="actmap-unmapped-title">
            ⚠️ Clientes sin mapear
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
