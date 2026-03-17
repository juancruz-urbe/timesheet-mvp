import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LabelList
} from 'recharts'
import { groupBySum } from '../utils'

const COLORS = [
  '#3b82f6','#06b6d4','#8b5cf6','#f59e0b','#10b981',
  '#f43f5e','#a3e635','#fb923c','#e879f9','#34d399',
  '#60a5fa','#fbbf24','#c084fc','#4ade80','#f87171'
]

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#1e2d42', border: '1px solid #2d4a6e',
      borderRadius: 7, padding: '0.6rem 0.9rem', fontSize: '0.78rem'
    }}>
      <div style={{ color: '#94a3b8', marginBottom: 4, maxWidth: 200,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </div>
      <div style={{ color: '#7dd3fc', fontWeight: 700 }}>
        {Number(payload[0].value).toFixed(2)} h
      </div>
    </div>
  )
}

function HBarChart({ data, top = 12 }) {
  const slice = data.slice(0, top)
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, slice.length * 30)}>
      <BarChart data={slice} layout="vertical" margin={{ left: 0, right: 56, top: 0, bottom: 0 }}>
        <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis
          dataKey="name"
          type="category"
          width={160}
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => v.length > 22 ? v.slice(0, 22) + '…' : v}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1a2a3a' }} />
        <Bar dataKey="value" radius={[0, 5, 5, 0]}>
          {slice.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          <LabelList
            dataKey="value"
            position="right"
            formatter={v => Number(v).toFixed(1) + ' h'}
            style={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// Label personalizado para el Pie (muestra valor dentro/fuera del segmento)
const PieLabel = ({ cx, cy, midAngle, outerRadius, value, percent }) => {
  if (percent < 0.04) return null // omitir segmentos muy pequeños
  const RAD = Math.PI / 180
  const r = outerRadius + 18
  const x = cx + r * Math.cos(-midAngle * RAD)
  const y = cy + r * Math.sin(-midAngle * RAD)
  return (
    <text
      x={x} y={y}
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      style={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }}
    >
      {Number(value).toFixed(1)} h
    </text>
  )
}

function DoughnutChart({ data, top = 8 }) {
  const slice = data.slice(0, top)
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
        <Pie
          data={slice}
          dataKey="value"
          nameKey="name"
          cx="40%"
          cy="50%"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={2}
          labelLine={false}
          label={PieLabel}
        >
          {slice.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Legend
          layout="vertical"
          align="right"
          verticalAlign="middle"
          formatter={(value) => (
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              {value.length > 20 ? value.slice(0, 20) + '…' : value}
            </span>
          )}
        />
        <Tooltip
          formatter={(v) => [Number(v).toFixed(2) + ' h', 'Horas']}
          contentStyle={{ background: '#1e2d42', border: '1px solid #2d4a6e', borderRadius: 7, fontSize: '0.78rem' }}
          labelStyle={{ color: '#94a3b8' }}
          itemStyle={{ color: '#7dd3fc' }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

function CategoriaBarChart({ data, ancColorMap }) {
  if (!data.length) return null
  return (
    <ResponsiveContainer width="100%" height={Math.max(140, data.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 64, top: 0, bottom: 0 }}>
        <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis
          dataKey="name" type="category" width={200}
          tick={{ fill: '#94a3b8', fontSize: 12 }}
          axisLine={false} tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1a2a3a' }} />
        <Bar dataKey="value" radius={[0, 5, 5, 0]}>
          {data.map((d) => <Cell key={d.name} fill={ancColorMap[d.name] || '#64748b'} />)}
          <LabelList
            dataKey="value"
            position="right"
            formatter={v => Number(v).toFixed(1) + ' h'}
            style={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export default function Charts({ data, dataConAusencias, ancColorMap = {} }) {
  const byPerson    = groupBySum(data, 'AssignedTo')
  const byActividad = groupBySum(dataConAusencias ?? data, 'ActividadNorm')
  const byCliente   = groupBySum(data, 'ClienteNorm')
  const byProducto  = groupBySum(data, 'Producto')
  const byCategoria = groupBySum(data, 'CategoriaAnc')
  const byAncestor  = groupBySum(data, 'TitleAncestor')
  const byVertical  = groupBySum(data, 'Vertical')
  const bySeccion   = groupBySum(data, 'Seccion')
  const byPosicion  = groupBySum(data, 'Posicion')

  return (
    <div className="charts-grid">

      <div className="chart-card">
        <h3>👤 Horas por Persona (top 15)</h3>
        <HBarChart data={byPerson} top={15} />
      </div>

      <div className="chart-card">
        <h3>🏢 Horas por Cliente</h3>
        <HBarChart data={byCliente} top={15} />
      </div>

      <div className="chart-card">
        <h3>📦 Horas por Producto</h3>
        <HBarChart data={byProducto} top={15} />
      </div>

      <div className="chart-card">
        <h3>⚡ Horas por Actividad</h3>
        <HBarChart data={byActividad} top={15} />
      </div>

      <div className="chart-card">
        <h3>🏷️ Horas por Categoría de Ancestro</h3>
        <CategoriaBarChart data={byCategoria} ancColorMap={ancColorMap} />
      </div>

      <div className="chart-card">
        <h3>🌳 Horas por Ancestro raíz (top 12)</h3>
        <HBarChart data={byAncestor} top={12} />
      </div>

      <div className="chart-card">
        <h3>🏛 Horas por Vertical / Área</h3>
        <HBarChart data={byVertical} top={15} />
      </div>

      <div className="chart-card">
        <h3>🔬 Horas por Sección</h3>
        <HBarChart data={bySeccion} top={15} />
      </div>

      <div className="chart-card">
        <h3>🎯 Horas por Posición</h3>
        <DoughnutChart data={byPosicion} top={10} />
      </div>

    </div>
  )
}
