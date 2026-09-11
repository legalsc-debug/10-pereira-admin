export type Estado =
  | 'sin_contactar'
  | 'contactado'
  | 'confirmado_visita'
  | 'visitado'
  | 'rechazado'
  | 'aprobado'
  | 'rehabilitacion'
  | 'reubicacion'
  | 'reconstruccion';

export interface Contacto {
  id: string;
  no: number;
  nombre_completo: string;
  cedula: string;
  telefono: string;
  direccion: string;
  sector_comuna: string;
  barrio_vereda: string;
  notas: string;
  mpio: string;
  rud: string;
  prioridad: string;
  responsable_llamada: string;
  responsable_visita: string;
  estado: Estado;
  created_at: string;
  updated_at: string;
}

export type ContactoInsert = Omit<Contacto, 'id' | 'created_at' | 'updated_at'>;
export type ContactoUpdate = Partial<ContactoInsert>;

export interface GeoRing {
  n: string;
  r: number[][][];
}
