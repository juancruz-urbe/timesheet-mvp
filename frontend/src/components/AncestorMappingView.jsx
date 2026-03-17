// Vista del mapeo de ancestros configurado en ancestor_mapping.json
// Muestra cada categoría (Proyecto, Mantenimiento Evolutivo, Incidente, etc.)
// con los tipos de WI que agrupa y las horas acumuladas

import { useMemo, useState } from 'react'

export default function AncestorMappingView({ allData, ancestorMappings, ancColorMap }) {
  const [search, setSearch] = useState('')

  // Horas por CategoriaAnc
  const horasPorCategoria = useMemo(() => {
    const map = {}
    for (const item of allData) {
      const key = item.CategoriaAnc || 'Sin categoría'
      map[key] = (map[key] || 0) + (item.CompletedWork || 0)
    }
    return map
  }, [allData])

  // Horas por WorkItemTypeAncestor
  const horasPorTipo = useMemo(() => {
    const map = {}
    for (const item of allData) {
      const key = item.WorkItemTypeAncestor || '(Sin tipo)'
      map[key] = (map[key] || 0) + (item.CompletedWork || 0)
    }
    return map
  }, [allData])

  // Conteo de WIs únicos por tipo
  const wisPorTipo = useMemo(() => {
    const map = {}
    for (const item of allData) {
      const key = item.WorkItemTypeAncestor || '(Sin tipo)'
      map[key] = (map[key] || 0) + 1
    }
    return map
  }, [allData])

  // Total general de horas
  const totalHoras = useMemo(
    () => allData.reduce((s, d) => s + (d.CompletedWork || 0), 0),
    [allData]
  )

  const maxHoras = useMemo(
    () => Math.max(...(ancestorMappings || []).map(c => horasPorCategoria[c.canonico] || 0), 1),
    [ancestorMappings, horasPorCategoria]
  )

  const q = search.toLowerCase().trim()
  const filtered = (ancestorMappings || []).filter(cat => {
    if (!q) return true
    if (cat.canonico.toLowerCase().includes(q)) return true
    return (cat.rules || []).some(r =>
      (r.types || []).some(t => t.toLowerCase().includes(q))
    )
  })

  return (
    <div className="actmap-wrap">

      {/* Banner */}
      <div className="person-view-banner" style={{ marginBottom: '1.2rem' }}>
        <span className="person-view-banner-icon">🌳</span>
        <span>
          Mapeo configurado en <strong>ancestor_mapping.json</strong> · clasifica ancestros raíz en categorías de negocio
        </span>
        <span className="person-view-banner-tag">{(ancestorMappings || []).length} categorías</span>
      </div>

      {/* Buscador */}
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Buscar categoría o tipo de WI…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="actmap-search"
        />
      </div>

      {/* Grilla de categorías */}
      <div className="actmap-grid">
        {filtered.map(cat => {
          const color  = cat.color || ancColorMap[cat.canonico] || '#64748b'
          const horas  = Math.round((horasPorCategoria[cat.canonico] || 0) * 100) / 100
          const pct    = totalHoras > 0 ? (horas / totalHoras) * 100 : 0
          const barW   = maxHoras  > 0 ? Math.round((horas / maxHoras) * 100) : 0

          // Todos los types que participan en las reglas de esta categoría
          const tipos = (cat.rules || [])
            .flatMap(r => r.types || [])
            .filter(t => t !== '*')

          return (
            <div key={cat.canonico} className="actmap-card" style={{ '--group-color': color }}>

              {/* Cabecera */}
              <div className="actmap-card-header">
                <span className="actmap-dot" style={{ background: color }} />
                <span className="actmap-canonico">{cat.canonico}</span>
                <span className="actmap-horas">{horas.toFixed(1)} h</span>
              </div>

              {/* Barra */}
              <div className="actmap-bar-wrap">
                <div className="actmap-bar" style={{ width: `${barW}%`, background: color }} />
                <span className="actmap-pct">{pct.toFixed(1)}% del total</span>
              </div>

              {/* Tipos de WI mapeados */}
              <div className="actmap-aliases">
                {tipos.length === 0
                  ? <div className="actmap-alias" style={{ color: '#64748b', fontStyle: 'italic' }}>
                      <span className="actmap-alias-name">Comodín (todo lo demás)</span>
                    </div>
                  : tipos.map(tipo => {
                      const h  = Math.round((horasPorTipo[tipo] || 0) * 100) / 100
                      const wi = wisPorTipo[tipo] || 0
                      return (
                        <div key={tipo} className="actmap-alias">
                          <span className="actmap-alias-name">
                            <span style={{
                              display: 'inline-block',
                              background: color + '33',
                              border: `1px solid ${color}55`,
                              borderRadius: 4,
                              padding: '1px 6px',
                              fontSize: '0.73rem',
                              marginRight: 4,
                              color,
                              fontWeight: 600,
                            }}>{tipo}</span>
                          </span>
                          <span className="actmap-alias-h" style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                            {wi > 0 && <span style={{ color: '#64748b', fontSize: '0.72rem' }}>{wi.toLocaleString('es-AR')} WIs</span>}
                            {h > 0 ? `${h.toFixed(1)} h` : '—'}
                          </span>
                        </div>
                      )
                    })
                }
              </div>

            </div>
          )
        })}
      </div>

    </div>
  )
}
