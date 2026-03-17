import { useState } from 'react'

const MESES_ES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
]

const DOW_NAMES = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']

function parseFecha(ds) {
  const [y, m, d] = ds.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function fmtFecha(ds) {
  const dt = parseFecha(ds)
  return `${DOW_NAMES[dt.getDay()]} ${dt.getDate()} de ${MESES_ES[dt.getMonth()]} ${dt.getFullYear()}`
}

// Agrupa feriados por año
function groupByYear(feriados) {
  const map = {}
  for (const f of feriados) {
    const y = f.slice(0, 4)
    if (!map[y]) map[y] = []
    map[y].push(f)
  }
  return map
}

export default function HolidayView({ feriados = [] }) {
  const [expandedYear, setExpandedYear] = useState(null)

  const sorted = [...feriados].sort()
  const byYear = groupByYear(sorted)
  const years  = Object.keys(byYear).sort()

  // Expandir el año con la fecha más próxima por defecto (solo en primer render)
  const today = new Date().toISOString().slice(0, 10)
  const defaultYear = years.find(y => byYear[y].some(f => f >= today)) || years[years.length - 1]
  const activeYear  = expandedYear ?? defaultYear

  return (
    <div style={{ padding: '1.25rem 1rem' }}>
      {/* Descripción */}
      <div className="obs-banner" style={{ marginBottom: '1.2rem' }}>
        <div className="obs-banner-title"> Feriados nacionales de Argentina</div>
        <div style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.55 }}>
          Estas fechas se usan en la vista <strong>Personas</strong> para marcar registros con observación
          de tipo <span className="obs-badge obs-feriado"> Feriado</span>.
          <br />
          Para modificar la lista, editá el archivo <code style={{ background: '#1e293b', padding: '0.1rem 0.35rem', borderRadius: 4, color: '#7dd3fc' }}>feriados.json</code> en{' '}
          <code style={{ background: '#1e293b', padding: '0.1rem 0.35rem', borderRadius: 4, color: '#7dd3fc' }}>dashboard/public/</code>{' '}
          y volvé a desplegar.
        </div>
        <div className="obs-banner-footer" style={{ marginTop: '0.5rem' }}>
          <span>Total registrado: <strong style={{ color: '#e2e8f0' }}>{sorted.length} feriados</strong></span>
          <span>Período: <strong style={{ color: '#e2e8f0' }}>{years[0]}  {years[years.length - 1]}</strong></span>
        </div>
      </div>

      {/* Tabs por año */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', flexWrap: 'wrap' }}>
        {years.map(y => (
          <button
            key={y}
            className={activeYear === y ? 'tab-btn tab-active' : 'tab-btn'}
            onClick={() => setExpandedYear(y)}
          >
             {y}
            <span className="tab-count">{byYear[y].length}</span>
          </button>
        ))}
      </div>

      {/* Tabla del año activo */}
      {byYear[activeYear] && (
        <table style={{ width: '100%', maxWidth: 520 }}>
          <thead>
            <tr>
              <th style={{ width: 40, textAlign: 'center' }}>#</th>
              <th>Fecha</th>
              <th>Día</th>
              <th style={{ width: 100, textAlign: 'center' }}>En datos</th>
            </tr>
          </thead>
          <tbody>
            {byYear[activeYear].map((f, i) => {
              const dt  = parseFecha(f)
              const dow = dt.getDay()
              const esFinde = dow === 0 || dow === 6
              return (
                <tr key={f}>
                  <td style={{ textAlign: 'center', color: '#475569', fontSize: '0.75rem' }}>{i + 1}</td>
                  <td style={{ fontWeight: 700, color: '#e2e8f0', fontFamily: 'monospace', fontSize: '0.85rem' }}>{f}</td>
                  <td>
                    <span className="obs-badge obs-feriado"> {fmtFecha(f)}</span>
                    {esFinde && (
                      <span className="obs-badge obs-finde" style={{ marginLeft: 4 }}> Fin de semana</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {f >= today
                      ? <span style={{ color: '#475569', fontSize: '0.72rem' }}>futuro</span>
                      : <span style={{ color: '#22c55e', fontSize: '0.72rem' }}></span>
                    }
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}