import { useState } from 'react'
import { fmtDate } from '../utils'

const PAGE_SIZE = 50

// Columnas de la tabla detalle
const COLS = [
  { key: 'AssignedTo',    label: 'Persona',    mw: 140 },
  { key: 'StartDate',     label: 'Fecha',      mw: 90  },
  { key: '_wiTitle',      label: 'Tarea',      mw: 300 },
  { key: 'ClienteNorm',   label: 'Cliente',    mw: 130 },
  { key: '_ancestor',     label: 'Ancestro',   mw: 280 },
  { key: 'Producto',      label: 'Producto',   mw: 160 },
  { key: '_actividad',    label: 'Actividad',  mw: 170 },
  { key: 'CompletedWork', label: 'Horas',      mw: 65  },
  { key: 'CategoriaAnc',  label: 'Categoría',  mw: 130 },
  { key: 'Vertical',      label: 'Vertical',   mw: 100 },
  { key: 'Posicion',      label: 'Posición',   mw: 110 },
]

function sortData(data, col, dir) {
  if (!col) return data
  return [...data].sort((a, b) => {
    let va = col === '_actividad' ? (a.ActividadNorm ?? '')
           : col === '_wiTitle'  ? (a.Title          ?? '')
           : col === '_ancestor' ? (a.TitleAncestor  ?? '')
           : (a[col] ?? '')
    let vb = col === '_actividad' ? (b.ActividadNorm ?? '')
           : col === '_wiTitle'  ? (b.Title          ?? '')
           : col === '_ancestor' ? (b.TitleAncestor  ?? '')
           : (b[col] ?? '')
    if (typeof va === 'number') return dir === 'asc' ? va - vb : vb - va
    return dir === 'asc'
      ? String(va).localeCompare(String(vb))
      : String(vb).localeCompare(String(va))
  })
}

function DetailTable({ data }) {
  const [page, setPage] = useState(1)
  const [sortCol, setSortCol] = useState('StartDate')
  const [sortDir, setSortDir] = useState('desc')

  const handleSort = (key) => {
    if (sortCol === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(key); setSortDir('asc') }
    setPage(1)
  }

  const sorted   = sortData(data, sortCol, sortDir)
  const total    = sorted.length
  const pages    = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safePage = Math.min(page, pages)
  const slice    = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const arrow = (key) => sortCol === key
    ? (sortDir === 'asc' ? ' ' : ' ')
    : <span style={{ opacity: 0.3 }}> </span>

  const linkStyle = { color: '#3b82f6', textDecoration: 'none', fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap' }
  const textClamp = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }
  const renderCell = (item, key) => {
    if (key === '_actividad') return item.ActividadNorm ?? '(Sin actividad)'
    if (key === '_wiTitle') return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
        <a
          href={`https://dev.azure.com/urbetrack/_workitems/edit/${item.Id}`}
          target="_blank" rel="noreferrer"
          style={linkStyle}
          title={`Abrir WI #${item.Id}`}
        >#{item.Id}</a>
        <span style={{ color: '#e2e8f0', fontSize: '0.82rem', ...textClamp }}>{item.Title ?? ''}</span>
      </div>
    )
    if (key === '_ancestor') return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
        {item.IdAncestor != null
          ? <a
              href={`https://dev.azure.com/urbetrack/_workitems/edit/${item.IdAncestor}`}
              target="_blank" rel="noreferrer"
              style={linkStyle}
              title={`Abrir Ancestro #${item.IdAncestor}`}
            >#{item.IdAncestor}</a>
          : null}
        <span style={{ color: '#94a3b8', fontSize: '0.82rem', ...textClamp }}>{item.TitleAncestor ?? ''}</span>
      </div>
    )
    const v = item[key]
    if (key === 'StartDate') return fmtDate(v)
    if (key === 'CompletedWork') return v != null ? <b style={{ color: '#7dd3fc' }}>{v} h</b> : ''
    return v ?? ''
  }

  return (
    <>
      <div className="table-wrapper">
        <table style={{ tableLayout: 'auto', width: '100%', minWidth: COLS.reduce((s, c) => s + c.mw, 0) }}>
          <thead>
            <tr>
              {COLS.map(c => (
                <th key={c.key} style={{ minWidth: c.mw }} onClick={() => handleSort(c.key)}>
                  {c.label}{arrow(c.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map(item => (
              <tr key={item.Id}>
                {COLS.map(c => {
                  const rawTitle = c.key === '_wiTitle'   ? `#${item.Id} ${item.Title ?? ''}`
                                 : c.key === '_ancestor'  ? `#${item.IdAncestor ?? ''} ${item.TitleAncestor ?? ''}`
                                 : c.key === '_actividad' ? (item.ActividadNorm ?? '')
                                 : String(item[c.key] ?? '')
                  return (
                    <td key={c.key} title={rawTitle} style={{ minWidth: c.mw, maxWidth: c.mw, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {renderCell(item, c.key)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="pagination">
        <span className="page-info">{total.toLocaleString('es-AR')} registros</span>
        <button onClick={() => setPage(1)} disabled={safePage === 1}></button>
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}></button>
        <span className="page-info">Pág. {safePage} / {pages}</span>
        <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={safePage === pages}></button>
        <button onClick={() => setPage(pages)} disabled={safePage === pages}></button>
      </div>
    </>
  )
}

export default function DataTable({ data }) {
  return (
    <div className="table-card">
      <DetailTable data={data} />
    </div>
  )
}