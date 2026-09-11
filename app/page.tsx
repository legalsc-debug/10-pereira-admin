'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  Users, BarChart3, Map, Plus, Search, Pencil, Trash2, X, Check,
  ChevronLeft, ChevronRight, Filter, Download
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { getContactos, crearContacto, actualizarContacto, eliminarContacto } from '@/lib/supabase';
import { ESTADOS, ESTADO_MAP, SECTORES_COLORES, SECTORES } from '@/lib/constants';
import type { Contacto, ContactoInsert, Estado } from '@/lib/types';

const MapaTab = dynamic(() => import('./MapaLeaflet'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full text-muted">Cargando mapa...</div>,
});

const TABS = [
  { id: 'directorio', label: 'Directorio', icon: Users },
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'mapa', label: 'Mapa', icon: Map },
] as const;

type TabId = typeof TABS[number]['id'];

const EMPTY_FORM: ContactoInsert = {
  no: 0, nombre_completo: '', cedula: '', telefono: '', direccion: '',
  sector_comuna: 'CENTRO', barrio_vereda: '', notas: '', mpio: 'PEREIRA',
  rud: '', prioridad: 'NO', responsable_llamada: '', responsable_visita: '',
  estado: 'sin_contactar',
};

const PAGE_SIZE = 25;

export default function Home() {
  const [tab, setTab] = useState<TabId>('directorio');
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getContactos();
      setContactos(data);
      setError('');
    } catch (e) {
      setError('Error cargando datos: ' + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="bg-surface border-b border-border px-4 py-3 flex items-center gap-4 shrink-0">
        <div className="flex-1">
          <h1 className="text-lg font-bold tracking-tight">Pereira Admin</h1>
          <p className="text-xs text-muted">Gestión de contactos y rutas estratégicas</p>
        </div>
        <nav className="flex gap-1 bg-background rounded-lg p-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-accent text-white'
                  : 'text-muted hover:text-foreground hover:bg-surface'
              }`}
            >
              <t.icon size={15} />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </nav>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-hidden">
        {error && (
          <div className="mx-4 mt-3 p-3 bg-danger-light text-danger rounded-lg text-sm flex items-center gap-2">
            <X size={14} /> {error}
          </div>
        )}
        {tab === 'directorio' && <DirectorioTab contactos={contactos} loading={loading} onRefresh={loadData} />}
        {tab === 'dashboard' && <DashboardTab contactos={contactos} loading={loading} />}
        {tab === 'mapa' && <MapaTab contactos={contactos} />}
      </main>
    </div>
  );
}

// ─── DIRECTORIO TAB ─────────────────────────────────────────

function DirectorioTab({ contactos, loading, onRefresh }: {
  contactos: Contacto[]; loading: boolean; onRefresh: () => void;
}) {
  const [search, setSearch] = useState('');
  const [filterSector, setFilterSector] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterPrioridad, setFilterPrioridad] = useState('');
  const [filterRud, setFilterRud] = useState('');
  const [filterRespLlamada, setFilterRespLlamada] = useState('');
  const [filterRespVisita, setFilterRespVisita] = useState('');
  const [page, setPage] = useState(0);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editing, setEditing] = useState<Contacto | null>(null);
  const [form, setForm] = useState<ContactoInsert>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = contactos;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.nombre_completo.toLowerCase().includes(q) ||
        c.cedula?.toLowerCase().includes(q) ||
        c.barrio_vereda.toLowerCase().includes(q) ||
        c.direccion.toLowerCase().includes(q)
      );
    }
    if (filterSector) list = list.filter(c => c.sector_comuna === filterSector);
    if (filterEstado) list = list.filter(c => c.estado === filterEstado);
    if (filterPrioridad) list = list.filter(c => c.prioridad === filterPrioridad);
    if (filterRud) list = list.filter(c => c.rud === filterRud);
    if (filterRespLlamada) list = list.filter(c => c.responsable_llamada === filterRespLlamada);
    if (filterRespVisita) list = list.filter(c => c.responsable_visita === filterRespVisita);
    return list;
  }, [contactos, search, filterSector, filterEstado, filterPrioridad, filterRud, filterRespLlamada, filterRespVisita]);

  const responsablesLlamada = useMemo(() =>
    [...new Set(contactos.map(c => c.responsable_llamada).filter(Boolean))].sort(),
    [contactos]
  );
  const responsablesVisita = useMemo(() =>
    [...new Set(contactos.map(c => c.responsable_visita).filter(Boolean))].sort(),
    [contactos]
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  useEffect(() => { setPage(0); }, [search, filterSector, filterEstado, filterPrioridad, filterRud, filterRespLlamada, filterRespVisita]);

  const openAdd = () => {
    setForm({ ...EMPTY_FORM, no: contactos.length > 0 ? Math.max(...contactos.map(c => c.no)) + 1 : 1 });
    setEditing(null);
    setModal('add');
  };

  const openEdit = (c: Contacto) => {
    setForm({
      no: c.no, nombre_completo: c.nombre_completo, cedula: c.cedula,
      telefono: c.telefono, direccion: c.direccion, sector_comuna: c.sector_comuna,
      barrio_vereda: c.barrio_vereda, notas: c.notas, mpio: c.mpio,
      rud: c.rud, prioridad: c.prioridad,
      responsable_llamada: c.responsable_llamada, responsable_visita: c.responsable_visita,
      estado: c.estado,
    });
    setEditing(c);
    setModal('edit');
  };

  const saveForm = async () => {
    setSaving(true);
    try {
      if (modal === 'add') {
        await crearContacto(form);
      } else if (editing) {
        await actualizarContacto(editing.id, form);
      }
      setModal(null);
      onRefresh();
    } catch (e) {
      alert('Error: ' + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await eliminarContacto(id);
      setDeleteConfirm(null);
      onRefresh();
    } catch (e) {
      alert('Error: ' + (e as Error).message);
    }
  };

  const handleEstadoChange = async (c: Contacto, estado: Estado) => {
    try {
      await actualizarContacto(c.id, { estado });
      onRefresh();
    } catch (e) {
      alert('Error: ' + (e as Error).message);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="p-3 border-b border-border bg-surface flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Buscar nombre, cédula, barrio..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <select
          value={filterSector}
          onChange={e => setFilterSector(e.target.value)}
          className="text-sm bg-background border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="">Todos los sectores</option>
          {SECTORES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={filterEstado}
          onChange={e => setFilterEstado(e.target.value)}
          className="text-sm bg-background border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
        </select>
        <select
          value={filterPrioridad}
          onChange={e => setFilterPrioridad(e.target.value)}
          className="text-sm bg-background border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="">Prioridad</option>
          <option value="SI">Prioridad SI</option>
          <option value="NO">Prioridad NO</option>
        </select>
        <select
          value={filterRud}
          onChange={e => setFilterRud(e.target.value)}
          className="text-sm bg-background border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="">RUD</option>
          <option value="SI">RUD SI</option>
          <option value="NO">RUD NO</option>
        </select>
        <select
          value={filterRespLlamada}
          onChange={e => setFilterRespLlamada(e.target.value)}
          className="text-sm bg-background border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="">Resp. Llamada</option>
          {responsablesLlamada.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select
          value={filterRespVisita}
          onChange={e => setFilterRespVisita(e.target.value)}
          className="text-sm bg-background border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="">Resp. Visita</option>
          {responsablesVisita.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <span className="text-xs text-muted font-mono">{filtered.length} registros</span>
        <button
          onClick={openAdd}
          className="flex items-center gap-1 px-3 py-1.5 bg-accent text-white text-sm font-medium rounded-md hover:opacity-90 transition-opacity"
        >
          <Plus size={14} /> Agregar
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-muted text-sm">Cargando datos...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface sticky top-0 z-10">
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left font-medium text-muted w-12">No</th>
                <th className="px-3 py-2 text-left font-medium text-muted">Nombre</th>
                <th className="px-3 py-2 text-left font-medium text-muted hidden lg:table-cell">Cédula</th>
                <th className="px-3 py-2 text-left font-medium text-muted hidden md:table-cell">Teléfono</th>
                <th className="px-3 py-2 text-left font-medium text-muted hidden xl:table-cell">Dirección</th>
                <th className="px-3 py-2 text-left font-medium text-muted">Sector</th>
                <th className="px-3 py-2 text-left font-medium text-muted hidden lg:table-cell">Barrio</th>
                <th className="px-3 py-2 text-left font-medium text-muted hidden xl:table-cell">Notas</th>
                <th className="px-3 py-2 text-center font-medium text-muted hidden md:table-cell w-14">RUD</th>
                <th className="px-3 py-2 text-center font-medium text-muted w-16">Prior.</th>
                <th className="px-3 py-2 text-left font-medium text-muted hidden xl:table-cell">Resp. Llamada</th>
                <th className="px-3 py-2 text-left font-medium text-muted hidden xl:table-cell">Resp. Visita</th>
                <th className="px-3 py-2 text-left font-medium text-muted w-40">Estado</th>
                <th className="px-3 py-2 text-right font-medium text-muted w-20">Acc.</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(c => {
                const est = ESTADO_MAP[c.estado];
                return (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-accent-light/50 transition-colors">
                    <td className="px-3 py-2 font-mono text-xs text-muted">{c.no}</td>
                    <td className="px-3 py-2 font-medium">{c.nombre_completo}</td>
                    <td className="px-3 py-2 font-mono text-xs hidden lg:table-cell">{c.cedula || '—'}</td>
                    <td className="px-3 py-2 font-mono text-xs hidden md:table-cell">{c.telefono || '—'}</td>
                    <td className="px-3 py-2 text-xs text-muted hidden xl:table-cell max-w-[200px] truncate">{c.direccion}</td>
                    <td className="px-3 py-2">
                      <span
                        className="inline-block px-1.5 py-0.5 text-xs rounded font-medium text-white"
                        style={{ backgroundColor: SECTORES_COLORES[c.sector_comuna] || '#888' }}
                      >
                        {c.sector_comuna}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs hidden lg:table-cell">{c.barrio_vereda}</td>
                    <td className="px-3 py-2 text-xs text-muted hidden xl:table-cell max-w-[200px] truncate" title={c.notas || ''}>{c.notas || '—'}</td>
                    <td className="px-3 py-2 text-center hidden md:table-cell">
                      {c.rud === 'SI' ? (
                        <span className="inline-block px-1.5 py-0.5 text-xs rounded font-medium bg-blue-100 text-blue-700">SI</span>
                      ) : (
                        <span className="text-xs text-muted/40">NO</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {c.prioridad === 'SI' ? (
                        <span className="inline-block px-1.5 py-0.5 text-xs rounded font-bold bg-amber-100 text-amber-700">SI</span>
                      ) : (
                        <span className="text-xs text-muted/40">NO</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs hidden xl:table-cell">
                      {c.responsable_llamada ? (
                        <span className="inline-block px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 font-medium">{c.responsable_llamada}</span>
                      ) : <span className="text-muted/40">—</span>}
                    </td>
                    <td className="px-3 py-2 text-xs hidden xl:table-cell">
                      {c.responsable_visita ? (
                        <span className="inline-block px-1.5 py-0.5 rounded bg-teal-100 text-teal-700 font-medium">{c.responsable_visita}</span>
                      ) : <span className="text-muted/40">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={c.estado}
                        onChange={e => handleEstadoChange(c, e.target.value as Estado)}
                        className="text-xs px-1.5 py-0.5 rounded border font-medium"
                        style={{
                          backgroundColor: est?.bg || '#F3F4F6',
                          color: est?.color || '#6B7280',
                          borderColor: est?.color || '#D1D5DB',
                        }}
                      >
                        {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(c)} className="p-1 text-muted hover:text-accent rounded" title="Editar">
                          <Pencil size={13} />
                        </button>
                        {deleteConfirm === c.id ? (
                          <>
                            <button onClick={() => handleDelete(c.id)} className="p-1 text-danger hover:bg-danger-light rounded" title="Confirmar">
                              <Check size={13} />
                            </button>
                            <button onClick={() => setDeleteConfirm(null)} className="p-1 text-muted hover:bg-surface rounded" title="Cancelar">
                              <X size={13} />
                            </button>
                          </>
                        ) : (
                          <button onClick={() => setDeleteConfirm(c.id)} className="p-1 text-muted hover:text-danger rounded" title="Eliminar">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-2 border-t border-border bg-surface flex items-center justify-between text-xs text-muted">
          <span>Página {page + 1} de {totalPages}</span>
          <div className="flex gap-1">
            <button
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              className="p-1 rounded hover:bg-accent-light disabled:opacity-30"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
              className="p-1 rounded hover:bg-accent-light disabled:opacity-30"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setModal(null)}>
          <div className="bg-surface rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto m-4" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-bold text-base">{modal === 'add' ? 'Agregar contacto' : 'Editar contacto'}</h2>
              <button onClick={() => setModal(null)} className="p-1 text-muted hover:text-foreground"><X size={18} /></button>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              <FormField label="No" value={String(form.no)} onChange={v => setForm(f => ({ ...f, no: parseInt(v) || 0 }))} />
              <FormField label="Cédula" value={form.cedula} onChange={v => setForm(f => ({ ...f, cedula: v }))} />
              <FormField label="Nombre completo" value={form.nombre_completo} onChange={v => setForm(f => ({ ...f, nombre_completo: v }))} span={2} />
              <FormField label="Teléfono" value={form.telefono} onChange={v => setForm(f => ({ ...f, telefono: v }))} />
              <FormField label="Municipio" value={form.mpio} onChange={v => setForm(f => ({ ...f, mpio: v }))} />
              <FormField label="Dirección" value={form.direccion} onChange={v => setForm(f => ({ ...f, direccion: v }))} span={2} />
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Sector/Comuna</label>
                <select
                  value={form.sector_comuna}
                  onChange={e => setForm(f => ({ ...f, sector_comuna: e.target.value }))}
                  className="w-full text-sm bg-background border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  {SECTORES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <FormField label="Barrio/Vereda" value={form.barrio_vereda} onChange={v => setForm(f => ({ ...f, barrio_vereda: v }))} />
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Estado</label>
                <select
                  value={form.estado}
                  onChange={e => setForm(f => ({ ...f, estado: e.target.value as Estado }))}
                  className="w-full text-sm bg-background border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">RUD</label>
                <select
                  value={form.rud}
                  onChange={e => setForm(f => ({ ...f, rud: e.target.value }))}
                  className="w-full text-sm bg-background border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="NO">NO</option>
                  <option value="SI">SI</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Prioridad</label>
                <select
                  value={form.prioridad}
                  onChange={e => setForm(f => ({ ...f, prioridad: e.target.value }))}
                  className="w-full text-sm bg-background border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="NO">NO</option>
                  <option value="SI">SI</option>
                </select>
              </div>
              <FormField label="Resp. Llamada" value={form.responsable_llamada} onChange={v => setForm(f => ({ ...f, responsable_llamada: v }))} />
              <FormField label="Resp. Visita" value={form.responsable_visita} onChange={v => setForm(f => ({ ...f, responsable_visita: v }))} />
              <FormField label="Notas" value={form.notas} onChange={v => setForm(f => ({ ...f, notas: v }))} span={2} />
            </div>
            <div className="p-4 border-t border-border flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="px-4 py-1.5 text-sm border border-border rounded-md hover:bg-background">Cancelar</button>
              <button
                onClick={saveForm}
                disabled={saving || !form.nombre_completo || !form.direccion}
                className="px-4 py-1.5 text-sm bg-accent text-white rounded-md hover:opacity-90 disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FormField({ label, value, onChange, span }: {
  label: string; value: string; onChange: (v: string) => void; span?: number;
}) {
  return (
    <div className={span === 2 ? 'col-span-2' : ''}>
      <label className="block text-xs font-medium text-muted mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full text-sm bg-background border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
      />
    </div>
  );
}

// ─── DASHBOARD TAB ──────────────────────────────────────────

function DashboardTab({ contactos, loading }: { contactos: Contacto[]; loading: boolean }) {
  if (loading) return <div className="flex items-center justify-center h-64 text-muted text-sm">Cargando...</div>;

  const total = contactos.length;
  const byEstado = ESTADOS.map(e => ({
    ...e,
    count: contactos.filter(c => c.estado === e.value).length,
  }));
  const visitados = byEstado.find(e => e.value === 'visitado')?.count || 0;
  const aprobados = byEstado.find(e => e.value === 'aprobado')?.count || 0;
  const avance = total > 0 ? Math.round(((visitados + aprobados) / total) * 100) : 0;

  const bySector = Object.entries(
    contactos.reduce<Record<string, number>>((acc, c) => {
      acc[c.sector_comuna] = (acc[c.sector_comuna] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([name, count]) => ({ name, count, fill: SECTORES_COLORES[name] || '#888' }))
    .sort((a, b) => b.count - a.count);

  const pieData = byEstado.filter(e => e.count > 0).map(e => ({
    name: e.label,
    value: e.count,
    fill: e.color,
  }));

  const sectorEstado = bySector.map(s => {
    const sectorContacts = contactos.filter(c => c.sector_comuna === s.name);
    const row: Record<string, number | string> = { sector: s.name, total: s.count };
    ESTADOS.forEach(e => {
      row[e.value] = sectorContacts.filter(c => c.estado === e.value).length;
    });
    return row;
  });

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-surface border border-border rounded-lg p-3">
          <div className="text-xs text-muted font-medium">Total</div>
          <div className="text-2xl font-bold font-mono">{total}</div>
        </div>
        {byEstado.map(e => (
          <div key={e.value} className="bg-surface border border-border rounded-lg p-3">
            <div className="text-xs font-medium" style={{ color: e.color }}>{e.label}</div>
            <div className="text-2xl font-bold font-mono" style={{ color: e.color }}>{e.count}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="bg-surface border border-border rounded-lg p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">Avance general</span>
          <span className="text-sm font-mono font-bold text-accent">{avance}%</span>
        </div>
        <div className="h-3 bg-background rounded-full overflow-hidden">
          <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${avance}%` }} />
        </div>
        <div className="text-xs text-muted mt-1">{visitados + aprobados} de {total} contactos visitados o aprobados</div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bar chart by sector */}
        <div className="bg-surface border border-border rounded-lg p-4">
          <h3 className="text-sm font-bold mb-3">Contactos por sector</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={bySector} layout="vertical" margin={{ left: 80 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
              <RTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="count" name="Contactos" radius={[0, 4, 4, 0]}>
                {bySector.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart by estado */}
        <div className="bg-surface border border-border rounded-lg p-4">
          <h3 className="text-sm font-bold mb-3">Distribución por estado</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={(props) => `${props.name ?? ''} ${((props.percent ?? 0) * 100).toFixed(0)}%`}>
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <RTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cross table */}
      <div className="bg-surface border border-border rounded-lg p-4 overflow-x-auto">
        <h3 className="text-sm font-bold mb-3">Matriz sector × estado</h3>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="px-2 py-1.5 text-left font-medium text-muted">Sector</th>
              {ESTADOS.map(e => (
                <th key={e.value} className="px-2 py-1.5 text-center font-medium" style={{ color: e.color }}>{e.label}</th>
              ))}
              <th className="px-2 py-1.5 text-center font-medium text-muted">Total</th>
            </tr>
          </thead>
          <tbody>
            {sectorEstado.map(row => (
              <tr key={row.sector as string} className="border-b border-border/50">
                <td className="px-2 py-1.5 font-medium">{row.sector as string}</td>
                {ESTADOS.map(e => {
                  const val = row[e.value] as number;
                  return (
                    <td key={e.value} className="px-2 py-1.5 text-center font-mono">
                      {val > 0 ? <span style={{ color: e.color }}>{val}</span> : <span className="text-muted/30">0</span>}
                    </td>
                  );
                })}
                <td className="px-2 py-1.5 text-center font-mono font-bold">{row.total as number}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

