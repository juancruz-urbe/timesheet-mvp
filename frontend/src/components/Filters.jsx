import { unique } from '../utils'

export default function Filters({ data, filters, onChange, onReset, ancColorMap = {} }) {
  const set = (key, val) => onChange({ ...filters, [key]: val })

  const persons     = unique(data, 'AssignedTo')
  const actividades = unique(data, 'ActividadNorm')
  const clientes    = unique(data, 'ClienteNorm')
  const productos   = unique(data, 'Producto')
  const ancestors   = unique(data, 'TitleAncestor')
  const verticals   = unique(data, 'Vertical')
  const secciones   = unique(data, 'Seccion')
  const posiciones  = unique(data, 'Posicion')
  const categorias  = unique(data, 'CategoriaAnc')

  return (
    <aside className="sidebar">
      <h2>🔍 Filtros</h2>

      <div className="filter-group">
        <label>Fecha</label>
        <input
          type="date"
          value={filters.dateFrom}
          onChange={e => set('dateFrom', e.target.value)}
        />
        <input
          type="date"
          value={filters.dateTo}
          onChange={e => set('dateTo', e.target.value)}
          style={{ marginTop: '0.3rem' }}
        />
      </div>

      <div className="filter-group">
        <label>Búsqueda libre</label>
        <input
          type="text"
          placeholder="Id, título, persona..."
          value={filters.search}
          onChange={e => set('search', e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>Persona</label>
        <select value={filters.AssignedTo} onChange={e => set('AssignedTo', e.target.value)}>
          <option value="">Todas</option>
          {persons.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="filter-group">
        <label>Cliente</label>
        <select value={filters.Cliente} onChange={e => set('Cliente', e.target.value)}>
          <option value="">Todos</option>
          {clientes.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="filter-group">
        <label>Producto</label>
        <select value={filters.Producto} onChange={e => set('Producto', e.target.value)}>
          <option value="">Todos</option>
          {productos.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="filter-group">
        <label>Actividad</label>
        <select value={filters.Actividad} onChange={e => set('Actividad', e.target.value)}>
          <option value="">Todas</option>
          {actividades.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <div className="filter-group">
        <label>Categoría ancestro</label>
        <select value={filters.CategoriaAnc} onChange={e => set('CategoriaAnc', e.target.value)}>
          <option value="">Todas</option>
          {categorias.map(c => (
            <option key={c} value={c}>
              {ancColorMap[c] ? '● ' : ''}{c}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label>Vertical / Área</label>
        <select value={filters.Vertical} onChange={e => set('Vertical', e.target.value)}>
          <option value="">Todas</option>
          {verticals.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>

      <div className="filter-group">
        <label>Sección</label>
        <select value={filters.Seccion} onChange={e => set('Seccion', e.target.value)}>
          <option value="">Todas</option>
          {secciones.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="filter-group">
        <label>Posición</label>
        <select value={filters.Posicion} onChange={e => set('Posicion', e.target.value)}>
          <option value="">Todas</option>
          {posiciones.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="filter-group">
        <label>Ancestro (raíz)</label>
        <select value={filters.TitleAncestor} onChange={e => set('TitleAncestor', e.target.value)}>
          <option value="">Todos</option>
          {ancestors.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <div className="filter-group">
        <label>Tipo ancestro</label>
        <select value={filters.WorkItemTypeAncestor} onChange={e => set('WorkItemTypeAncestor', e.target.value)}>
          <option value="">Todos</option>
          {unique(data, 'WorkItemTypeAncestor').map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <button className="btn-reset" onClick={onReset}>✕ Limpiar filtros</button>
    </aside>
  )
}
