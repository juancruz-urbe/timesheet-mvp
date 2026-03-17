import { useState, useEffect, useMemo } from 'react'
import { buildActivityMapper, normalizeActividad, buildClientMapper, normalizeCliente, buildAncestorCategorizer, buildObservaciones } from './utils'
import { fetchFlat, fetchActivity, fetchClients, fetchFeriados, fetchAncestor } from './api'
import Filters  from './components/Filters'
import KpiCards from './components/KpiCards'
import Charts   from './components/Charts'
import DataTable from './components/DataTable'
import DrilldownView    from './components/DrilldownView'
import PersonView       from './components/PersonView'
import ActivityMappingView from './components/ActivityMappingView'
import ClientMappingView   from './components/ClientMappingView'
import AncestorMappingView from './components/AncestorMappingView'
import HolidayView         from './components/HolidayView'

const EMPTY_FILTERS = {
  search:                '',
  AssignedTo:            '',
  Actividad:             '',
  Vertical:              '',
  Seccion:               '',
  Posicion:              '',
  TitleAncestor:         '',
  WorkItemTypeAncestor:  '',
  Cliente:               '',
  Producto:              '',
  CategoriaAnc:          '',
  dateFrom:              '',
  dateTo:                '',
}

function applyFilters(data, f, mapper) {
  return data.filter(d => {
    if (f.search) {
      const q = f.search.toLowerCase()
      const hit =
        String(d.Id).includes(q) ||
        (d.Title         || '').toLowerCase().includes(q) ||
        (d.AssignedTo    || '').toLowerCase().includes(q) ||
        (d.TitleAncestor || '').toLowerCase().includes(q)
      if (!hit) return false
    }
    if (f.AssignedTo           && d.AssignedTo            !== f.AssignedTo)           return false
    if (f.Actividad            && d.ActividadNorm !== f.Actividad)                            return false
    if (f.Cliente              && d.ClienteNorm   !== f.Cliente)               return false
    if (f.Producto             && d.Producto      !== f.Producto)              return false
    if (f.CategoriaAnc         && d.CategoriaAnc  !== f.CategoriaAnc)         return false
    if (f.Vertical             && d.Vertical              !== f.Vertical)             return false
    if (f.Seccion              && d.Seccion               !== f.Seccion)              return false
    if (f.Posicion             && d.Posicion              !== f.Posicion)             return false
    if (f.TitleAncestor        && d.TitleAncestor         !== f.TitleAncestor)        return false
    if (f.WorkItemTypeAncestor && d.WorkItemTypeAncestor  !== f.WorkItemTypeAncestor) return false
    if (f.dateFrom) {
      const from = new Date(f.dateFrom)
      const sd   = d.StartDate ? new Date(d.StartDate) : null
      if (!sd || sd < from) return false
    }
    if (f.dateTo) {
      const to = new Date(f.dateTo)
      to.setDate(to.getDate() + 1)
      const sd = d.StartDate ? new Date(d.StartDate) : null
      if (!sd || sd >= to) return false
    }
    return true
  })
}

export default function App() {
  const [allData,        setAllData]        = useState([])
  const [activityMapper, setActivityMapper] = useState(new Map())
  const [clientMapper,   setClientMapper]   = useState(new Map())
  const [mappings,       setMappings]       = useState([])
  const [clientMappings, setClientMappings] = useState([])
  const [ancestorMappings, setAncestorMappings] = useState([])
  const [ancColorMap,    setAncColorMap]    = useState({})
  const [loading,        setLoading]        = useState(true)
  const [filters,        setFilters]        = useState(EMPTY_FILTERS)
  const [drillCat,       setDrillCat]       = useState(null)  // null = vista principal
  const [configTab,      setConfigTab]      = useState('actividades') // tab activo en Configuración
  const [feriadosSet,    setFeriadosSet]    = useState(new Set())

  useEffect(() => {
    Promise.all([
      fetchFlat(),
      fetchActivity().catch(() => ({ mappings: [] })),
      fetchClients().catch(() => ({ mappings: [] })),
      fetchAncestor().catch(() => ({ categorias: [] })),
      fetchFeriados().catch(() => ({ feriados: [] }))
    ]).then(([data, actMapping, cliMapping, ancMapping, ferData]) => {
      const rawAct = actMapping.mappings   || []
      const rawCli = cliMapping.mappings   || []
      const rawAnc = ancMapping.categorias || []
      const aMapper = buildActivityMapper(rawAct)
      const cMapper = buildClientMapper(rawCli)
      const { categorize, colorMap } = buildAncestorCategorizer(rawAnc)
      setActivityMapper(aMapper)
      setClientMapper(cMapper)
      setMappings(rawAct)
      setClientMappings(rawCli)
      setAncestorMappings(rawAnc)
      setAncColorMap(colorMap)
      setFeriadosSet(new Set(ferData.feriados || []))
      const enriched = data.map(d => {
        const ActividadNorm = normalizeActividad(d, aMapper)
        return {
          ...d,
          ActividadNorm,
          ClienteNorm:   normalizeCliente(d, cMapper),
          Producto:      d.CustomCostos || null,
          CategoriaAnc:  categorize(d),
          _esAusencia:   ActividadNorm === 'Vacaciones / Licencia',
        }
      })
      setAllData(enriched)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const filtered            = useMemo(() => applyFilters(allData, filters, activityMapper), [allData, filters, activityMapper])
  // Para el gr\u00e1fico de actividad: respetar filtros pero incluir siempre las ausencias del mismo subconjunto de personas
  const filteredConAusencias = useMemo(() => {
    if (!filters.Actividad) return filtered
    // Si hay un filtro de actividad activo, hacer la misma consulta sin ese filtro para el gr\u00e1fico
    const sinFiltroAct = applyFilters(allData, { ...filters, Actividad: '' }, activityMapper)
    return sinFiltroAct
  }, [allData, filters, activityMapper, filtered])
  const obsMap       = useMemo(() => buildObservaciones(allData, feriadosSet), [allData, feriadosSet])
  const feriadosArr  = useMemo(() => [...feriadosSet].sort(), [feriadosSet])

  const totalAll     = allData.length
  const horasAll     = allData.reduce((s, d) => s + (d._esAusencia ? 0 : (d.CompletedWork || 0)), 0)
  const totalFiltered = filtered.length

  if (loading) return <div className="loading">Cargando datos…</div>

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div>
          <h1>⏱ Timesheet Dashboard</h1>
          <div className="subtitle">
            {totalAll.toLocaleString('es-AR')} WIs · {horasAll.toFixed(1)} hs totales
            {totalFiltered !== totalAll && (
              <span style={{ color: '#3b82f6', marginLeft: 10 }}>
                → {totalFiltered.toLocaleString('es-AR')} filtrados
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="main">
        <Filters
          data={allData}
          filters={filters}
          onChange={setFilters}
          onReset={() => setFilters(EMPTY_FILTERS)}
          ancColorMap={ancColorMap}
        />

        <main className="content">
          <KpiCards data={filtered} onDrilldown={setDrillCat} drillCat={drillCat} />

          {drillCat === 'personas'
            ? <div className="table-card">
                <PersonView allData={allData} obsMap={obsMap} feriadosSet={feriadosSet} />
              </div>
            : drillCat === 'config'
            ? <div className="table-card">
                <div className="config-header">
                  <span className="config-title">⚙️ Configuración de Mapeos</span>
                  <span className="config-subtitle">Los cambios en los archivos JSON se reflejan automáticamente al recargar.</span>
                </div>
                <div className="table-tabs">
                  <button
                    className={configTab === 'actividades' ? 'tab-btn tab-active' : 'tab-btn'}
                    onClick={() => setConfigTab('actividades')}
                  >
                    🗂️ Mapeo de Actividades
                    <span className="tab-count">{(mappings || []).length}</span>
                  </button>
                  <button
                    className={configTab === 'clientes' ? 'tab-btn tab-active' : 'tab-btn'}
                    onClick={() => setConfigTab('clientes')}
                  >
                    🏢 Mapeo de Clientes
                    <span className="tab-count">{(clientMappings || []).length}</span>
                  </button>
                  <button
                    className={configTab === 'ancestros' ? 'tab-btn tab-active' : 'tab-btn'}
                    onClick={() => setConfigTab('ancestros')}
                  >
                    🌳 Mapeo de Ancestros
                    <span className="tab-count">{(ancestorMappings || []).length}</span>
                  </button>
                  <button
                    className={configTab === 'feriados' ? 'tab-btn tab-active' : 'tab-btn'}
                    onClick={() => setConfigTab('feriados')}
                  >
                    📅 Feriados
                    <span className="tab-count">{feriadosArr.length}</span>
                  </button>
                </div>
                {configTab === 'actividades' && <ActivityMappingView allData={allData} mappings={mappings} />}
                {configTab === 'clientes'    && <ClientMappingView   allData={allData} mappings={clientMappings} />}
                {configTab === 'ancestros'   && <AncestorMappingView allData={allData} ancestorMappings={ancestorMappings} ancColorMap={ancColorMap} />}
                {configTab === 'feriados'    && <HolidayView feriados={feriadosArr} />}
              </div>
            : drillCat
            ? <DrilldownView
                data={filtered}
                categoria={drillCat}
                onBack={() => setDrillCat(null)}
              />
            : <>
                <Charts   data={filtered} dataConAusencias={filteredConAusencias} ancColorMap={ancColorMap} />
                <DataTable data={filtered} allData={allData} />
              </>
          }
        </main>
      </div>
    </div>
  )
}

