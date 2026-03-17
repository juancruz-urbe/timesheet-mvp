import { fmtH } from '../utils'

export default function KpiCards({ data, onDrilldown, drillCat }) {
  const totalHoras = data.reduce((s, d) => s + (d.CompletedWork || 0), 0)
  const personas   = new Set(data.map(d => d.AssignedTo).filter(Boolean)).size
  const tickets    = data.length
  const promedioH  = tickets > 0 ? totalHoras / tickets : 0

  const padresPorCat = (cat) =>
    new Set(data.filter(d => d.CategoriaAnc === cat && d.IdAncestor != null).map(d => d.IdAncestor)).size

  const padresProyecto  = padresPorCat('Proyecto')
  const padresMant      = padresPorCat('Mantenimiento Evolutivo')
  const padresIncidente = padresPorCat('Incidente')

  const DRILLS = [
    { cat: 'Proyecto',               label: 'Proyectos',       color: '#3b82f6', icon: '📋', count: padresProyecto,  sub: 'tickets padre' },
    { cat: 'Mantenimiento Evolutivo', label: 'Mant. Evolutivo', color: '#10b981', icon: '🔧', count: padresMant,      sub: 'tickets padre' },
    { cat: 'Incidente',              label: 'Incidentes',      color: '#ef4444', icon: '🔴', count: padresIncidente, sub: 'tickets padre' },
    { cat: 'personas',               label: 'Personas',        color: '#a855f7', icon: '👥', count: personas,        sub: 'con horas cargadas' },
  ]

  return (
    <div className="kpi-section">

      {/* ─ Bloque 1: acumuladores generales ───────────────── */}
      <div className="kpi-block">
        <div className="kpi-block-label">Resumen del período</div>
        <div className="kpi-row">
          <div className="kpi-card">
            <span className="kpi-label">Total Horas</span>
            <span className="kpi-value">{Number(totalHoras.toFixed(1))}</span>
            <span className="kpi-sub">horas completadas</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Work Items</span>
            <span className="kpi-value">{tickets.toLocaleString('es-AR')}</span>
            <span className="kpi-sub">en el período</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Personas</span>
            <span className="kpi-value">{personas}</span>
            <span className="kpi-sub">con horas cargadas</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Promedio / WI</span>
            <span className="kpi-value">{promedioH.toFixed(2)}</span>
            <span className="kpi-sub">horas por ticket</span>
          </div>
        </div>
      </div>

      {/* ─ Bloque 2: vistas por categoría ─────────────────── */}
      <div className="kpi-block">
        <div className="kpi-block-label">Vistas por categoría</div>
        <div className="kpi-row">
          {/* Botón Dashboard (vista principal) */}
          <button
            className={`drill-nav-btn${!drillCat ? ' drill-nav-btn-active' : ''}`}
            onClick={() => onDrilldown(null)}
          >
            <span className="drill-nav-btn-icon">📊</span>
            <span className="drill-nav-btn-label">Dashboard</span>
            <span className="drill-nav-btn-sub">Gráficas y tabla</span>
          </button>

          {/* Botones de categoría */}
          {DRILLS.map(({ cat, label, color, icon, count, sub }) => (
            <button
              key={cat}
              className={`drill-nav-btn${drillCat === cat ? ' drill-nav-btn-active' : ''}`}
              style={{
                '--drill-btn-color': color,
                borderTopColor: drillCat === cat ? color : undefined,
              }}
              onClick={() => onDrilldown(cat)}
            >
              <span className="drill-nav-btn-icon">{icon}</span>
              <span className="drill-nav-btn-label" style={{ color: drillCat === cat ? color : undefined }}>
                {label}
              </span>
              <span className="drill-nav-btn-count" style={{ color }}>{count}</span>
              <span className="drill-nav-btn-sub">{sub}</span>
            </button>
          ))}

          {/* Botón Configuración — separado a la derecha */}
          <button
            className={`drill-nav-btn drill-nav-btn-config${drillCat === 'config' ? ' drill-nav-btn-active' : ''}`}
            style={{ '--drill-btn-color': '#64748b', marginLeft: 'auto' }}
            onClick={() => onDrilldown('config')}
          >
            <span className="drill-nav-btn-icon">⚙️</span>
            <span className="drill-nav-btn-label" style={{ color: drillCat === 'config' ? '#94a3b8' : undefined }}>Configuración</span>
            <span className="drill-nav-btn-sub">Mapeos de datos</span>
          </button>
        </div>
      </div>

    </div>
  )
}
