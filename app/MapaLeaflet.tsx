'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { COMUNAS_GEO, CORREGIMIENTOS_GEO, VEREDAS_GEO, BARRIOS_GEO } from '@/lib/geo-data';
import { ESTADOS, SECTORES_COLORES } from '@/lib/constants';
import type { Contacto, GeoRing } from '@/lib/types';

function toLatLngs(ring: number[][]): [number, number][] {
  return ring.map(p => [p[1], p[0]]);
}

function InvalidateOnResize() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

export default function MapaLeaflet({ contactos }: { contactos: Contacto[] }) {
  const [layers, setLayers] = useState({ comunas: true, corregimientos: true, barrios: true, veredas: true, labels: true });
  const [filterEstado, setFilterEstado] = useState<string>('');
  const [filterRespVisita, setFilterRespVisita] = useState<string>('');

  const responsablesVisita = useMemo(() =>
    [...new Set(contactos.map(c => c.responsable_visita).filter(Boolean))].sort(),
    [contactos]
  );

  const filteredContactos = useMemo(() => {
    let list = contactos;
    if (filterEstado) list = list.filter(c => c.estado === filterEstado);
    if (filterRespVisita) list = list.filter(c => c.responsable_visita === filterRespVisita);
    return list;
  }, [contactos, filterEstado, filterRespVisita]);

  const totalBySector = useMemo(() => {
    const t: Record<string, number> = {};
    filteredContactos.forEach(c => { t[c.sector_comuna] = (t[c.sector_comuna] || 0) + 1; });
    return t;
  }, [filteredContactos]);

  const barrioGeoMap = useMemo(() => {
    const map: Record<string, { cx: number; cy: number }> = {};
    [...BARRIOS_GEO, ...VEREDAS_GEO].forEach(b => {
      const key = b.n.trim().toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      if (b.r[0] && b.r[0].length > 0 && !map[key]) {
        let sx = 0, sy = 0;
        b.r[0].forEach(p => { sx += p[0]; sy += p[1]; });
        map[key] = { cx: sx / b.r[0].length, cy: sy / b.r[0].length };
      }
    });
    COMUNAS_GEO.forEach(c => {
      const key = c.n.trim().toUpperCase();
      if (c.r[0] && c.r[0].length > 0 && !map[key]) {
        let sx = 0, sy = 0;
        c.r[0].forEach(p => { sx += p[0]; sy += p[1]; });
        map[key] = { cx: sx / c.r[0].length, cy: sy / c.r[0].length };
      }
    });
    return map;
  }, []);

  const normalizeBarrio = useCallback((raw: string, sectorComuna?: string): string => {
    let s = raw.trim().toUpperCase().replace(/\s+/g, ' ')
      .normalize('NFD').replace(/[̀-ͯ]/g, '');
    const stripped = s.replace(/^(BARRIO|VEREDA\.?)\s+/i, '');
    const aliases: Record<string, string> = {};
    const matched = aliases[stripped] || aliases[s];
    if (matched && barrioGeoMap[matched]) return matched;
    if (barrioGeoMap[stripped]) return stripped;
    if (barrioGeoMap[s]) return s;
    if (matched) return matched;
    if (sectorComuna) {
      const sc = sectorComuna.trim().toUpperCase();
      if (barrioGeoMap[sc]) return sc;
    }
    return stripped || s;
  }, [barrioGeoMap]);

  const barrioCounts = useMemo(() => {
    const t: Record<string, number> = {};
    filteredContactos.forEach(c => {
      const key = normalizeBarrio(c.barrio_vereda, c.sector_comuna);
      if (key) t[key] = (t[key] || 0) + 1;
    });
    return t;
  }, [filteredContactos, normalizeBarrio]);

  const markers = useMemo(() => {
    return Object.entries(barrioCounts)
      .filter(([barrio]) => barrioGeoMap[barrio])
      .map(([barrio, count]) => {
        const geo = barrioGeoMap[barrio];
        const size = Math.max(18, Math.min(40, Math.sqrt(count) * 8));
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:rgba(245,197,24,0.75);border:2px solid #d4a017;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:${Math.max(9, size * 0.35)}px;color:#3a2800;box-shadow:0 1px 4px rgba(0,0,0,0.3)">${count}</div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
        return { barrio, count, lat: geo.cy, lng: geo.cx, icon };
      });
  }, [barrioCounts, barrioGeoMap]);

  const comunaKey = (n: string) => {
    const upper = n.trim().toUpperCase();
    const m = upper.match(/^COMUNA\s+(.+)/);
    return m ? m[1] : upper;
  };

  const toggleLayer = (key: keyof typeof layers) => {
    setLayers(l => ({ ...l, [key]: !l[key] }));
  };

  const center: [number, number] = [4.8133, -75.6961];

  return (
    <div className="flex h-full">
      <div className="w-64 min-w-64 bg-surface border-r border-border flex flex-col overflow-hidden">
        <div className="p-3 border-b border-border">
          <h3 className="text-sm font-bold mb-2">Capas</h3>
          <div className="flex flex-wrap gap-1">
            {(['comunas', 'corregimientos', 'barrios', 'veredas', 'labels'] as const).map(key => (
              <button
                key={key}
                onClick={() => toggleLayer(key)}
                className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                  layers[key]
                    ? 'bg-accent text-white border-accent'
                    : 'bg-background border-border text-muted'
                }`}
              >
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="p-3 border-b border-border space-y-2">
          <div>
            <h3 className="text-sm font-bold mb-1">Filtrar por estado</h3>
            <select
              value={filterEstado}
              onChange={e => setFilterEstado(e.target.value)}
              className="w-full text-xs bg-background border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">Todos</option>
              {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
          </div>
          <div>
            <h3 className="text-sm font-bold mb-1">Resp. Visita</h3>
            <select
              value={filterRespVisita}
              onChange={e => setFilterRespVisita(e.target.value)}
              className="w-full text-xs bg-background border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">Todos</option>
              {responsablesVisita.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <h3 className="text-xs font-bold text-muted px-1 mb-1">Sectores</h3>
          {Object.entries(totalBySector)
            .sort((a, b) => b[1] - a[1])
            .map(([sector, count]) => (
              <div key={sector} className="flex items-center gap-2 px-2 py-1 text-xs">
                <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: SECTORES_COLORES[sector] || '#888' }} />
                <span className="flex-1 truncate">{sector}</span>
                <span className="font-mono font-medium">{count}</span>
              </div>
            ))}
        </div>
      </div>

      <div className="flex-1 relative">
        <MapContainer
          center={center}
          zoom={13}
          className="w-full h-full"
          zoomControl={false}
          style={{ background: '#1a1a2e' }}
        >
          <InvalidateOnResize />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {layers.corregimientos && CORREGIMIENTOS_GEO.map((cg, i) => {
            const corrKey = 'CORR. ' + cg.n.toUpperCase().replace('LA ESTRELLA-LA PALMILLA', 'ESTRELLA LA PALMILLA').replace('TRIBUNAS CORCEGA', 'TRIBUNAS CORSEGA');
            const col = SECTORES_COLORES[corrKey] || '#556B2F';
            const count = totalBySector[corrKey] || 0;
            const intensity = Math.min(0.35, 0.06 + (count / 80) * 0.2);
            return (
              <Polygon
                key={`cg-${i}`}
                positions={cg.r.map(toLatLngs)}
                pathOptions={{ color: col, fillColor: col, weight: 2, dashArray: '6 4', fillOpacity: intensity }}
              >
                <Tooltip sticky>
                  <strong>{corrKey}</strong><br />
                  {count} contactos
                </Tooltip>
              </Polygon>
            );
          })}

          {layers.veredas && VEREDAS_GEO.map((v, i) => (
            <Polygon
              key={`v-${i}`}
              positions={v.r.map(toLatLngs)}
              pathOptions={{ color: 'rgba(85,120,50,0.6)', fillColor: 'rgba(85,120,50,0.12)', weight: 1.2, fillOpacity: 0.12 }}
            >
              {layers.labels && <Tooltip sticky>{v.n}</Tooltip>}
            </Polygon>
          ))}

          {layers.barrios && BARRIOS_GEO.map((b, i) => (
            <Polygon
              key={`b-${i}`}
              positions={b.r.map(toLatLngs)}
              pathOptions={{ color: 'rgba(180,140,60,0.5)', fillColor: 'rgba(180,140,60,0.08)', weight: 0.8, fillOpacity: 0.08 }}
            >
              {layers.labels && <Tooltip sticky>{b.n}</Tooltip>}
            </Polygon>
          ))}

          {layers.comunas && COMUNAS_GEO.map((c, i) => {
            const key = comunaKey(c.n);
            const col = SECTORES_COLORES[key] || '#888';
            const count = totalBySector[key] || 0;
            const intensity = Math.min(0.4, 0.08 + (count / 100) * 0.25);
            return (
              <Polygon
                key={`c-${i}`}
                positions={c.r.map(toLatLngs)}
                pathOptions={{ color: col, fillColor: col, weight: 2, fillOpacity: intensity }}
              >
                <Tooltip sticky>
                  <strong>{key}</strong><br />
                  {count} contactos
                </Tooltip>
              </Polygon>
            );
          })}

          {layers.labels && markers.map(m => (
            <Marker
              key={m.barrio}
              position={[m.lat, m.lng]}
              icon={m.icon}
            >
              <Tooltip direction="top" offset={[0, -10]}>
                <strong>{m.barrio}</strong><br />
                {m.count} contacto{m.count !== 1 ? 's' : ''}
              </Tooltip>
            </Marker>
          ))}
        </MapContainer>

        <div className="absolute top-3 left-3 z-[1000] flex gap-2">
          <div className="bg-surface/90 backdrop-blur border border-border rounded-md px-2 py-1 text-xs shadow-sm">
            <span className="font-mono font-medium">{filteredContactos.length}</span> contactos
          </div>
        </div>
      </div>
    </div>
  );
}
