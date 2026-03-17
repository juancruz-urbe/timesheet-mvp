// Vista de drilldown: muestra tickets padre de una categoría con sus WIs de horas debajo
import { useState, useMemo } from 'react'
import { fmtDate } from '../utils'

const CAT_META = {
  'Proyecto':               { color: '#3b82f6', icon: '' },
  'Mantenimiento Evolutivo':{ color: '#10b981', icon: '' },
  'Incidente':              { color: '#ef4444', icon: '' },
}

const ADO_LINK = (id) => `https://dev.azure.com/urbetrack/_workitems/edit/${id}`

const linkStyle = {
  color: '#3b82f6', textDecoration: 'none', fontWeight: 700,
  fontSize: '0.8rem', whiteSpace: 'nowrap',
}

// Columnas del sub-table de tickets hoja
const WI_COLS = [
  { key: 'AssignedTo',    label: 'Persona',    mw: 130 },
  { key: 'StartDate',     label: 'Fecha',      mw: 90  },
  { key: 'Id',            label: 'WI',         mw: 200 },
  { key: 'ClienteNorm',   label: 'Cliente',    mw: 120 },
  { key: 'Producto',      label: 'Producto',   mw: 150 },
  { key: 'ActividadNorm', label: 'Actividad',  mw: 150 },
  { key: 'CompletedWork', label: 'Horas',      mw: 60  },
]

function WiRow({ item }) {
  return (
    <tr>
      <td style={{ minWidth: 130, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {item.AssignedTo ?? ''}
      </td>
      <td style={{ minWidth: 90, whiteSpace: 'nowrap' }}>
        {fmtDate(item.StartDate)}
      </td>
      <td style={{ minWidth: 200 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
          <a href={ADO_LINK(item.Id)} target="_blank" rel="noreferrer" style={linkStyle}>
            #{item.Id}
          </a>
          <span style={{ color: '#e2e8f0', fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.Title ?? ''}
          </span>
        </div>
      </td>
      <td style={{ minWidth: 120, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#94a3b8' }}>
        {item.ClienteNorm ?? ''}
      </td>
      <td style={{ minWidth: 150, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#94a3b8' }}>
        {item.Producto ?? ''}
      </td>
      <td style={{ minWidth: 150, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {item.ActividadNorm ?? '(Sin actividad)'}
      </td>
      <td style={{ minWidth: 60, whiteSpace: 'nowrap', textAlign: 'right' }}>
        <b style={{ color: '#7dd3fc' }}>{item.CompletedWork ?? ''} h</b>
      </td>
    </tr>
  )
}

// Colapsado por defecto (open = false)
function ParentCard({ parent, items, color, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen ?? false)
  const totalH = items.reduce((s, d) => s + (d.CompletedWork || 0), 0)

  return (
    <div className="drill-parent-card" style={{ '--drill-color': color }}>
      <div className="drill-parent-header" onClick={() => setOpen(o => !o)}>
        <span className="drill-expand-btn">{open ? '' : ''}</span>
        <a
          href={ADO_LINK(parent.IdAncestor)}
          target="_blank" rel="noreferrer"
          style={{ color, fontWeight: 700, fontSize: '0.82rem', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}
          onClick={e => e.stopPropagation()}
        >
          #{parent.IdAncestor}
        </a>
        <span className="drill-parent-title">{parent.TitleAncestor ?? ''}</span>
        <span className="drill-parent-type">{parent.WorkItemTypeAncestor ?? ''}</span>
        <span className="drill-parent-stats">
          <span style={{ color: '#7dd3fc', fontWeight: 700 }}>{totalH.toFixed(1)} h</span>
          <span style={{ color: '#475569', fontSize: '0.72rem', marginLeft: 6 }}> {items.length} WIs</span>
        </span>
      </div>

      {open && (
        <div className="drill-sub-table">
          <table style={{ width: '100%', minWidth: WI_COLS.reduce((s, c) => s + c.mw, 0) }}>
            <thead>
              <tr>
                {WI_COLS.map(c => (
                  <th key={c.key} style={{ minWidth: c.mw }}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(item => <WiRow key={item.Id} item={item} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function DrilldownView({ data, categoria, onBack }) {
  const meta    = CAT_META[categoria] || { color: '#64748b', icon: '' }
  const [search, setSearch] = useState('')

  // Agrupar por padre
  const grupos = useMemo(() => {
    const catItems = data.filter(d => d.CategoriaAnc === categoria && d.IdAncestor != null)
    const map = new Map()
    for (const item of catItems) {
      const key = item.IdAncestor
      if (!map.has(key)) {
        map.set(key, {
          IdAncestor: item.IdAncestor,
          TitleAncestor: item.TitleAncestor,
          WorkItemTypeAncestor: item.WorkItemTypeAncestor,
          items: []
        })
      }
      map.get(key).items.push(item)
    }
    return [...map.values()].sort((a, b) => {
      const ha = a.items.reduce((s, d) => s + (d.CompletedWork || 0), 0)
      const hb = b.items.reduce((s, d) => s + (d.CompletedWork || 0), 0)
      return hb - ha
    })
  }, [data, categoria])

  // Filtro dinámico: busca en título del padre, ID o títulos de WIs hijos
  const q = search.toLowerCase().trim()
  const gruposFiltrados = useMemo(() => {
    if (!q) return grupos
    return grupos.filter(g => {
      if (String(g.IdAncestor).includes(q)) return true
      if ((g.TitleAncestor || '').toLowerCase().includes(q)) return true
      return g.items.some(item =>
        (item.Title       || '').toLowerCase().includes(q) ||
        (item.AssignedTo  || '').toLowerCase().includes(q) ||
        (item.ClienteNorm || '').toLowerCase().includes(q) ||
        String(item.Id).includes(q)
      )
    })
  }, [grupos, q])

  const totalH = useMemo(
    () => gruposFiltrados.reduce((s, g) => s + g.items.reduce((ss, d) => ss + (d.CompletedWork || 0), 0), 0),
    [gruposFiltrados]
  )

  return (
    <div className="drill-wrap">
      {/* Título */}
      <div className="drill-nav">
        <span className="drill-breadcrumb">
          <span style={{ color: meta.color, fontWeight: 700, fontSize: '0.95rem' }}>
            {meta.icon} {categoria}
          </span>
        </span>
      </div>

      {/* Resumen + buscador en la misma fila */}
      <div className="drill-summary" style={{ borderLeftColor: meta.color, alignItems: 'center' }}>
        <div className="drill-summary-item">
          <span className="drill-summary-label">Tickets padre</span>
          <span className="drill-summary-value" style={{ color: meta.color }}>
            {gruposFiltrados.length}{q && grupos.length !== gruposFiltrados.length ? ` / ${grupos.length}` : ''}
          </span>
        </div>
        <div className="drill-summary-item">
          <span className="drill-summary-label">Work Items</span>
          <span className="drill-summary-value">
            {gruposFiltrados.reduce((s, g) => s + g.items.length, 0).toLocaleString('es-AR')}
          </span>
        </div>
        <div className="drill-summary-item">
          <span className="drill-summary-label">Total horas</span>
          <span className="drill-summary-value" style={{ color: '#7dd3fc' }}>{totalH.toFixed(1)} h</span>
        </div>
        {/* Buscador a la derecha */}
        <div style={{ marginLeft: 'auto', minWidth: 240 }}>
          <input
            type="text"
            className="actmap-search"
            placeholder="Filtrar por título, ID, persona"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {/* Lista de padres */}
      <div className="drill-list">
        {gruposFiltrados.length === 0
          ? <div style={{ color: '#475569', padding: '2rem', textAlign: 'center' }}>
              {q ? `Sin resultados para "${search}".` : 'No hay datos para esta categoría con los filtros actuales.'}
            </div>
          : gruposFiltrados.map(g => (
              <ParentCard
                key={g.IdAncestor}
                parent={g}
                items={g.items}
                color={meta.color}
                defaultOpen={false}
              />
            ))
        }
      </div>
    </div>
  )
}