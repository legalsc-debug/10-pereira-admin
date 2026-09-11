import type { Estado } from './types';

export const ESTADOS: { value: Estado; label: string; color: string; bg: string }[] = [
  { value: 'sin_contactar', label: 'Sin contactar', color: '#6B7280', bg: '#F3F4F6' },
  { value: 'contactado', label: 'Contactado', color: '#D97706', bg: '#FEF3C7' },
  { value: 'confirmado_visita', label: 'Confirmado visita', color: '#2563EB', bg: '#DBEAFE' },
  { value: 'visitado', label: 'Visitado', color: '#7C3AED', bg: '#EDE9FE' },
  { value: 'rechazado', label: 'Rechazado', color: '#DC2626', bg: '#FEE2E2' },
  { value: 'aprobado', label: 'Aprobado', color: '#059669', bg: '#D1FAE5' },
  { value: 'rehabilitacion', label: 'Rehabilitación', color: '#0891B2', bg: '#CFFAFE' },
  { value: 'reubicacion', label: 'Reubicación', color: '#CA8A04', bg: '#FEF9C3' },
  { value: 'reconstruccion', label: 'Reconstrucción', color: '#EA580C', bg: '#FFF7ED' },
];

export const ESTADO_MAP = Object.fromEntries(ESTADOS.map(e => [e.value, e]));

export const SECTORES_COLORES: Record<string, string> = {
  'BOSTON': '#2E7D5B',
  'CENTRO': '#3D8B37',
  'CONSOTA': '#6D9B2B',
  'CUBA': '#8B6914',
  'DEL CAFÉ': '#A85723',
  'EL JARDÍN': '#C44B3C',
  'EL OSO': '#B03A6B',
  'EL POBLADO': '#8E3B99',
  'EL ROCÍO': '#5C4BA8',
  'FERROCARRIL': '#3565A8',
  'OLÍMPICA': '#2B7FA0',
  'ORIENTE': '#2A9680',
  'PERLA DEL OTÚN': '#1B8A6B',
  'RÍO OTÚN': '#D4830A',
  'SAN JOAQUÍN': '#1976A8',
  'SAN NICOLÁS': '#6A5ACD',
  'UNIVERSIDAD': '#C0392B',
  'VILLASANTANA': '#E67E22',
  'VILLAVICENCIO': '#16A085',
  'CORR. ALTAGRACIA': '#7B8D3A',
  'CORR. ARABIA': '#5D7A3A',
  'CORR. CAIMALITO': '#4A7C59',
  'CORR. CERRITOS': '#3A6B5C',
  'CORR. LA BELLA': '#8B5E3C',
  'CORR. LA FLORIDA': '#2E8B57',
  'CORR. MORELIA': '#6B4C3B',
  'CORR. PUERTO CALDAS': '#4682B4',
  'CORR. TRIBUNAS CORSEGA': '#8B4513',
  'CORR. ESTRELLA LA PALMILLA': '#9B6B3A',
  'CORR. COMBIA ALTA': '#5B8C5A',
  'CORR. COMBIA BAJA': '#3D7A4A',
  'SECTOR AEROPUERTO': '#607D8B',
  'SECTOR BATALLON': '#78909C',
};

export const SECTORES = Object.keys(SECTORES_COLORES);
