import { useState, useMemo } from 'react'
import { fmtDate, buildCalendarData, buildPersonSummary } from '../utils'

const HORAS_MES = 144
const COLOR_PERSONA = '#a855f7'
const ADO_LINK = (id) => `https://dev.azure.com/urbetrack/_workitems/edit/${id}`

//  Tipos de observación 
const OBS_META = {
  feriado: { label: 'Feriado',       color: '#ef4444', bg: '#2d0a0a', icon: '' },
  finde:   { label: 'Fin de semana', color: '#f97316', bg: '#2d1200', icon: '' },
  exceso:  { label: '> 8 h/día',     color: '#eab308', bg: '#1f1a00', icon: '' },
}

// Prioridad visual: feriado > finde > exceso
function tipoPrioridad(tipos) {
  if (!tipos || tipos.length === 0) return null
  if (tipos.includes('feriado')) return 'feriado'
  if (tipos.includes('finde'))   return 'finde'
  if (tipos.includes('exceso'))  return 'exceso'
  return null
}

// Badge inline para una observación
function ObsBadge({ tipo, detalle }) {
  const m = OBS_META[tipo]
  if (!m) return null
  return (
    <span
      className={`obs-badge obs-${tipo}`}
      title={detalle}
      style={{ background: m.bg, color: m.color, borderColor: m.color }}
    >
      {m.icon} {m.label}
    </span>
  )
}

//  Heatmap con colores de observaciones 
const HEAT_COLORS_NORMAL = ['#0d1117', '#0e4429', '#006d32', '#26a641', '#39d353']

// Dado un día, calcula su color: primero busca observación, si no → gradiente verde; ausencia → azul
function heatColorForDay(hours, ausencia, maxH, date, obsPerDate) {
  // Día de ausencia (vacaciones / licencia): azul
  if (ausencia > 0 && hours === 0) {
    return { color: '#3b82f6', border: '1px solid #1d4ed8' }
  }
  const obs = obsPerDate?.[date]
  if (obs) {
    const tipo = tipoPrioridad(obs.tipos)
    if (tipo === 'feriado') return { color: '#ef4444', border: '1px solid #991b1b' }
    if (tipo === 'finde')   return { color: '#f97316', border: '1px solid #9a3412' }
    if (tipo === 'exceso')  return { color: '#eab308', border: '1px solid #92400e' }
  }
  if (!hours) return { color: HEAT_COLORS_NORMAL[0], border: '1px solid rgba(255,255,255,0.05)' }
  const ratio = hours / maxH
  const c = ratio < 0.2 ? HEAT_COLORS_NORMAL[1]
    : ratio < 0.4 ? HEAT_COLORS_NORMAL[2]
    : ratio < 0.7 ? HEAT_COLORS_NORMAL[3]
    : HEAT_COLORS_NORMAL[4]
  return { color: c, border: '1px solid rgba(255,255,255,0.05)' }
}

function ActivityHeatmap({ data, person, obsMap }) {
  const weeks = useMemo(() => buildCalendarData(data, person), [data, person])

  // Construir mapa de observaciones por fecha para esta persona
  const obsPerDate = useMemo(() => {
    if (!obsMap) return {}
    const map = {}
    const items = person ? data.filter(d => d.AssignedTo === person) : data
    for (const item of items) {
      const obs = obsMap.get(item.Id)
      if (!obs) continue
      const fecha = item.StartDate?.slice(0, 10)
      if (!fecha) continue
      if (!map[fecha]) map[fecha] = { tipos: new Set(), detalles: [] }
      obs.tipos.forEach(t => map[fecha].tipos.add(t))
      map[fecha].detalles.push(obs.detalle)
    }
    // Convertir sets a arrays
    const result = {}
    for (const [f, v] of Object.entries(map)) {
      result[f] = { tipos: [...v.tipos], detalle: v.detalles[0] }
    }
    return result
  }, [data, person, obsMap])

  if (!weeks.length) return (
    <div style={{ color: '#475569', fontSize: '0.78rem', padding: '0.5rem 0' }}>Sin actividad registrada.</div>
  )

  const allHours = weeks.flatMap(w => w.map(d => d.hours))
  const maxH = Math.max(...allHours, 1)
  const DOW_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

  const monthLabels = []
  weeks.forEach((week, wi) => {
    const firstDay = week.find(d => d.date)
    if (!firstDay) return
    const d = new Date(firstDay.date + 'T12:00:00')
    if (wi === 0 || d.getDate() <= 7) {
      monthLabels.push({ wi, label: d.toLocaleDateString('es-AR', { month: 'short' }) })
    }
  })

  return (
    <div className="heatmap-wrap">
      <div className="heatmap-months" style={{ paddingLeft: 22, marginBottom: 3 }}>
        {monthLabels.map(({ wi, label }) => (
          <span key={wi} style={{ position: 'absolute', left: wi * 14, fontSize: '0.68rem', color: '#64748b', textTransform: 'capitalize' }}>{label}</span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 0, alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginRight: 4 }}>
          {DOW_LABELS.map((l, i) => (
            <div key={i} style={{ height: 12, width: 14, fontSize: '0.6rem', color: i % 2 === 0 ? '#64748b' : 'transparent', lineHeight: '12px', textAlign: 'right' }}>{l}</div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 2, overflowX: 'auto' }}>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {week.map(day => {
                const { color, border } = heatColorForDay(day.hours, day.ausencia, maxH, day.date, obsPerDate)
                const obsInfo = obsPerDate[day.date]
                const tooltip = day.ausencia > 0 && day.hours === 0
                  ? `${day.date}: ${day.ausencia.toFixed(1)} h — Vacaciones / Licencia`
                  : obsInfo
                    ? `${day.date}: ${day.hours.toFixed(1)} h  ${obsInfo.detalle}`
                    : `${day.date}: ${day.hours.toFixed(1)} h`
                return (
                  <div key={day.date}
                    title={tooltip}
                    style={{ width: 12, height: 12, borderRadius: 2, background: color, border, cursor: day.hours > 0 || day.ausencia > 0 ? 'pointer' : 'default' }}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
      {/* Leyenda */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5, fontSize: '0.63rem', color: '#475569', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          {HEAT_COLORS_NORMAL.map((c, i) => (
            <div key={i} style={{ width: 9, height: 9, borderRadius: 2, background: c, border: '1px solid rgba(255,255,255,0.06)' }} />
          ))}
          <span style={{ marginLeft: 2 }}>horas</span>
        </div>
        <span style={{ color: '#374151' }}></span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <div style={{ width: 9, height: 9, borderRadius: 2, background: '#3b82f6', border: '1px solid #1d4ed8' }} />
          <span>vacaciones</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <div style={{ width: 9, height: 9, borderRadius: 2, background: '#eab308', border: '1px solid #92400e' }} />
          <span>exceso</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <div style={{ width: 9, height: 9, borderRadius: 2, background: '#f97316', border: '1px solid #9a3412' }} />
          <span>finde</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <div style={{ width: 9, height: 9, borderRadius: 2, background: '#ef4444', border: '1px solid #991b1b' }} />
          <span>feriado</span>
        </div>
      </div>
    </div>
  )
}

//  Columnas sub-tabla WIs 
const WI_COLS = [
  { key: 'StartDate',     label: 'Fecha',     mw: 90  },
  { key: 'Id',            label: 'WI',        mw: 320 },
  { key: 'ClienteNorm',   label: 'Cliente',   mw: 120 },
  { key: '_ancestor',     label: 'Ancestro',  mw: 220 },
  { key: 'CategoriaAnc',  label: 'Categoría', mw: 120 },
  { key: 'ActividadNorm', label: 'Actividad', mw: 150 },
  { key: 'CompletedWork', label: 'Horas',     mw: 65  },
  { key: '_obs',          label: '',          mw: 28  },
]

const OBS_COLOR = { feriado: '#ef4444', finde: '#f97316', exceso: '#eab308' }

const linkStyle = { color: '#3b82f6', textDecoration: 'none', fontWeight: 700, fontSize: '0.8rem', whiteSpace: 'nowrap' }

function WiRow({ item, obsMap }) {
  const obs = obsMap?.get(item.Id)
  const obsColor = obs
    ? (obs.tipos.includes('feriado') ? OBS_COLOR.feriado
      : obs.tipos.includes('finde') ? OBS_COLOR.finde
      : OBS_COLOR.exceso)
    : null
  return (
    <tr className={obs ? 'wi-row-obs' : ''}>
      <td style={{ minWidth: 90, whiteSpace: 'nowrap' }}>{fmtDate(item.StartDate)}</td>
      <td style={{ minWidth: 320 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
          <a href={ADO_LINK(item.Id)} target="_blank" rel="noreferrer" style={linkStyle}>#{item.Id}</a>
          <span
            title={item.Title ?? ''}
            style={{ color: '#e2e8f0', fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}
          >{item.Title ?? ''}</span>
        </div>
      </td>
      <td style={{ minWidth: 120, whiteSpace: 'nowrap', color: '#94a3b8' }}>{item.ClienteNorm ?? ''}</td>
      <td style={{ minWidth: 220 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
          {item.IdAncestor != null
            ? <a href={ADO_LINK(item.IdAncestor)} target="_blank" rel="noreferrer" style={linkStyle}>#{item.IdAncestor}</a>
            : null}
          <span style={{ color: '#94a3b8', fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.TitleAncestor ?? ''}</span>
        </div>
      </td>
      <td style={{ minWidth: 120, whiteSpace: 'nowrap', color: '#64748b', fontSize: '0.75rem' }}>{item.CategoriaAnc ?? ''}</td>
      <td style={{ minWidth: 150, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.ActividadNorm ?? '(Sin actividad)'}</td>
      <td style={{ minWidth: 65, whiteSpace: 'nowrap', textAlign: 'right' }}>
        <b style={{ color: '#7dd3fc' }}>{item.CompletedWork ?? ''} h</b>
      </td>
      <td style={{ minWidth: 28, textAlign: 'center' }}>
        {obsColor
          ? <span
              title={obs.detalle}
              style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: obsColor, cursor: 'help', border: `1px solid ${obsColor}88` }}
            />
          : null
        }
      </td>
    </tr>
  )
}

//  Tarjeta por persona 
function PersonCard({ p, idx, allData, obsMap, searchQ }) {
  const [open, setOpen] = useState(false)
  // Horas totales = trabajadas + ausencias (ambas cuentan contra las 144h)
  const horasTotal = p.hours + (p.horasAusencia || 0)
  const pct       = Math.min((horasTotal / HORAS_MES) * 100, 100)
  const delta     = Math.round((horasTotal - HORAS_MES) * 10) / 10
  const barColor  = pct >= 90 ? '#22c55e' : pct >= 70 ? '#3b82f6' : pct >= 50 ? '#f59e0b' : '#ef4444'
  const deltaColor  = delta >= 0 ? '#22c55e' : '#ef4444'
  const deltaPrefix = delta >= 0 ? '+' : ''

  // Todos los WIs de esta persona
  const wisPersona = useMemo(() => allData.filter(d => d.AssignedTo === p.name), [allData, p.name])

  // Métricas de observaciones
  const obsStats = useMemo(() => {
    let countFeriado = 0
    let horasFeriado = 0
    let countFinde = 0
    let horasFinde = 0
    const diasExceso = new Set()

    wisPersona.forEach(d => {
      const obs = obsMap?.get(d.Id)
      if (!obs) return
      const h = d.CompletedWork || 0
      const fecha = d.StartDate?.slice(0, 10)
      if (obs.tipos.includes('exceso') && fecha) diasExceso.add(fecha)
      if (obs.tipos.includes('feriado')) { countFeriado++; horasFeriado += h }
      if (obs.tipos.includes('finde'))   { countFinde++;   horasFinde   += h }
    })

    // Exceso neto: por cada día con exceso, sumar solo las horas sobre 8
    let horasExceso = 0
    const horasPorDia = obsMap?._horasPorDia
    diasExceso.forEach(fecha => {
      const key  = `${p.name}__${fecha}`
      const sumH = horasPorDia?.get(key) || 0
      horasExceso += Math.max(0, sumH - 8)
    })

    return {
      nObs: wisPersona.filter(d => obsMap?.has(d.Id)).length,
      diasExceso: diasExceso.size,
      horasExceso: Math.round(horasExceso * 10) / 10,
      countFeriado, horasFeriado: Math.round(horasFeriado * 10) / 10,
      countFinde,   horasFinde:   Math.round(horasFinde   * 10) / 10,
    }
  }, [wisPersona, obsMap, p.name])

  // Tipos de obs presentes para tooltip
  const obsTipos = useMemo(() => {
    const set = new Set()
    wisPersona.forEach(d => { const o = obsMap?.get(d.Id); o?.tipos.forEach(t => set.add(t)) })
    return [...set]
  }, [wisPersona, obsMap])

  // WIs filtrados por búsqueda
  const wisFiltrados = useMemo(() => {
    const base = !searchQ
      ? wisPersona
      : (() => {
          const q = searchQ.toLowerCase()
          return wisPersona.filter(d =>
            (d.Title         || '').toLowerCase().includes(q) ||
            (d.TitleAncestor || '').toLowerCase().includes(q) ||
            (d.ClienteNorm   || '').toLowerCase().includes(q) ||
            (d.ActividadNorm || '').toLowerCase().includes(q) ||
            (d.CategoriaAnc  || '').toLowerCase().includes(q) ||
            String(d.Id).includes(q) ||
            String(d.IdAncestor ?? '').includes(q)
          )
        })()
    return [...base].sort((a, b) => {
      const da = a.StartDate ? a.StartDate.slice(0, 10) : ''
      const db = b.StartDate ? b.StartDate.slice(0, 10) : ''
      return da < db ? -1 : da > db ? 1 : 0
    })
  }, [wisPersona, searchQ])

  return (
    <div className="drill-parent-card" style={{ '--drill-color': COLOR_PERSONA }}>
      <div className="drill-parent-header" onClick={() => setOpen(o => !o)}>
        <span className="drill-expand-btn">{open ? '' : ''}</span>
        <span style={{ color: '#64748b', fontSize: '0.75rem', minWidth: 22, textAlign: 'right', flexShrink: 0 }}>{idx + 1}</span>
        <span className="drill-parent-title" style={{ color: '#e2e8f0' }}>{p.name}</span>

        {/* Barra de porcentaje */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <div style={{ width: `${pct * 0.6}px`, height: 5, borderRadius: 3, background: barColor, minWidth: 2, maxWidth: 72 }} />
          <span style={{ color: barColor, fontWeight: 700, fontSize: '0.8rem', minWidth: 48 }}>{pct.toFixed(1)}%</span>
        </div>

          {/* Stats + acumuladores de obs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
            <span className="drill-parent-stats">
              <span style={{ color: '#7dd3fc', fontWeight: 700 }}>{p.hours.toFixed(1)} h</span>
              {p.horasAusencia > 0 && (
                <span style={{ color: '#60a5fa', fontWeight: 700, fontSize: '0.75rem', marginLeft: 5 }}
                  title={`${p.horasAusencia.toFixed(1)} h de Vacaciones / Licencia (incluidas en el cómputo de las ${HORAS_MES} h)`}>
                  +{p.horasAusencia.toFixed(1)} h vac.
                </span>
              )}
              <span style={{ color: deltaColor, fontWeight: 700, fontSize: '0.75rem', marginLeft: 8 }}>{deltaPrefix}{delta.toFixed(1)} h</span>
              <span style={{ color: '#475569', fontSize: '0.72rem', marginLeft: 8 }}> {p.wis} WIs</span>
            </span>          {/* Acumuladores de observaciones — uno por línea */}
          {(obsStats.diasExceso > 0 || obsStats.countFeriado > 0 || obsStats.countFinde > 0) && (
            <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {obsStats.diasExceso > 0 && (
                <span style={{ color: '#eab308', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: 3 }}
                  title={`${obsStats.diasExceso} día(s) con exceso · solo horas sobre las 8 h/día`}>
                  🟡 exceso: <b>{obsStats.diasExceso}</b> día{obsStats.diasExceso > 1 ? 's' : ''} · <b>+{obsStats.horasExceso} h</b>
                </span>
              )}
              {obsStats.countFeriado > 0 && (
                <span style={{ color: '#f87171', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: 3 }}
                  title={`${obsStats.countFeriado} registros cargados en feriado`}>
                  🔴 feriado: <b>{obsStats.countFeriado}</b> reg · <b>{obsStats.horasFeriado} h</b>
                </span>
              )}
              {obsStats.countFinde > 0 && (
                <span style={{ color: '#fb923c', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: 3 }}
                  title={`${obsStats.countFinde} registros cargados en fin de semana`}>
                  🟠 finde: <b>{obsStats.countFinde}</b> reg · <b>{obsStats.horasFinde} h</b>
                </span>
              )}
            </span>
          )}
        </div>

        {/* Indicador global de observaciones */}
        {obsStats.nObs > 0 && (
          <span className="obs-header-badge" title={`${obsStats.nObs} registro${obsStats.nObs > 1 ? 's' : ''} con observación: ${obsTipos.map(t => OBS_META[t]?.label).join(', ')}`}>
             {obsStats.nObs}
          </span>
        )}

        {/* Heatmap al extremo derecho */}
        <div style={{ marginLeft: 'auto', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <ActivityHeatmap data={allData} person={p.name} obsMap={obsMap} />
        </div>
      </div>

      {/* Sub-tabla */}
      {open && (
        <div className="drill-sub-table">
          {wisFiltrados.length === 0
            ? <div style={{ color: '#475569', padding: '1rem 1.25rem', fontSize: '0.8rem' }}>
                {searchQ ? `Sin resultados para "${searchQ}".` : 'Sin work items registrados.'}
              </div>
            : <table style={{ width: '100%', minWidth: WI_COLS.reduce((s, c) => s + c.mw, 0) }}>
                <thead>
                  <tr>{WI_COLS.map(c => <th key={c.key} style={{ minWidth: c.mw }}>{c.label}</th>)}</tr>
                </thead>
                <tbody>
                  {wisFiltrados.map(item => <WiRow key={item.Id} item={item} obsMap={obsMap} />)}
                </tbody>
              </table>
          }
        </div>
      )}
    </div>
  )
}

//  Componente principal 
export default function PersonView({ allData, obsMap, feriadosSet }) {
  const [search, setSearch] = useState('')
  const summary = useMemo(() => buildPersonSummary(allData, feriadosSet), [allData, feriadosSet])
  const q = search.toLowerCase().trim()

  const totalObs = obsMap ? obsMap.size : 0

  const summaryFiltrado = useMemo(() => {
    if (!q) return summary
    return summary.filter(p =>
      p.name.toLowerCase().includes(q) ||
      allData.some(d => d.AssignedTo === p.name && (
        (d.Title         || '').toLowerCase().includes(q) ||
        (d.TitleAncestor || '').toLowerCase().includes(q) ||
        (d.ClienteNorm   || '').toLowerCase().includes(q) ||
        (d.ActividadNorm || '').toLowerCase().includes(q) ||
        String(d.Id).includes(q)
      ))
    )
  }, [summary, allData, q])

  const totalH = summaryFiltrado.reduce((s, p) => s + p.hours, 0)

  return (
    <div className="drill-wrap">
      <div className="drill-nav">
        <span className="drill-breadcrumb">
          <span style={{ color: COLOR_PERSONA, fontWeight: 700, fontSize: '0.95rem' }}>
             Personas
          </span>
        </span>
      </div>

      {/* Banner explicativo */}
      <div className="obs-banner">
        <div className="obs-banner-title"> Cómo se calculan los indicadores?</div>
        <div className="obs-banner-rules">
          <div className="obs-banner-rule">
            <span className="obs-badge obs-exceso"> {'>'} 8 h/día</span>
            <span>La persona cargó más de 8 horas en un mismo día hábil.</span>
          </div>
          <div className="obs-banner-rule">
            <span className="obs-badge obs-finde"> Fin de semana</span>
            <span>El registro cae en sábado o domingo.</span>
          </div>
          <div className="obs-banner-rule">
            <span className="obs-badge obs-feriado"> Feriado</span>
            <span>La fecha coincide con un feriado nacional de Argentina (configurable en <code>feriados.json</code> desde  Configuración).</span>
          </div>
          <div className="obs-banner-rule">
            <span style={{ display:'inline-flex', alignItems:'center', gap:4, background:'#1e3a5f', color:'#60a5fa', border:'1px solid #2563eb', borderRadius:4, padding:'2px 7px', fontSize:'0.72rem', fontWeight:600, whiteSpace:'nowrap' }}>🔵 Vacaciones / Licencia</span>
            <span>Horas cargadas como ausencia (vacaciones, licencia, feriado interno, etc.). <strong>Se suman al total mensual</strong> y cuentan contra las {HORAS_MES} h de referencia, aunque no se consideran horas trabajadas.</span>
          </div>
        </div>
        <div className="obs-banner-footer">
          Referencia mensual: <strong>{HORAS_MES} h hábiles = 100%</strong> (horas trabajadas + ausencias)
          {totalObs > 0 && <span className="obs-banner-total"> {totalObs} registro{totalObs > 1 ? 's' : ''} con observación en el período</span>}
        </div>
      </div>

      {/* Barra de resumen + buscador */}
      <div className="drill-summary" style={{ borderLeftColor: COLOR_PERSONA, alignItems: 'center' }}>
        <div className="drill-summary-item">
          <span className="drill-summary-label">Personas</span>
          <span className="drill-summary-value" style={{ color: COLOR_PERSONA }}>
            {summaryFiltrado.length}{q && summaryFiltrado.length !== summary.length ? ` / ${summary.length}` : ''}
          </span>
        </div>
        <div className="drill-summary-item">
          <span className="drill-summary-label">Total horas</span>
          <span className="drill-summary-value" style={{ color: '#7dd3fc' }}>{totalH.toFixed(1)} h</span>
        </div>
        <div className="drill-summary-item">
          <span className="drill-summary-label">Ref. mensual</span>
          <span className="drill-summary-value" style={{ color: '#475569' }}>{HORAS_MES} h</span>
        </div>
        {totalObs > 0 && (
          <div className="drill-summary-item">
            <span className="drill-summary-label">Observaciones</span>
            <span className="drill-summary-value" style={{ color: '#eab308' }}> {totalObs}</span>
          </div>
        )}
        <div style={{ marginLeft: 'auto', minWidth: 240 }}>
          <input
            type="text"
            className="actmap-search"
            placeholder="Filtrar por persona, tarea, cliente"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {/* Lista de personas */}
      <div className="drill-list">
        {summaryFiltrado.length === 0
          ? <div style={{ color: '#475569', padding: '2rem', textAlign: 'center' }}>
              {q ? `Sin resultados para "${search}".` : 'Sin datos de personas.'}
            </div>
          : summaryFiltrado.map((p, i) => (
              <PersonCard
                key={p.name}
                p={p}
                idx={i}
                allData={allData}
                obsMap={obsMap}
                searchQ={q}
              />
            ))
        }
      </div>
    </div>
  )
}