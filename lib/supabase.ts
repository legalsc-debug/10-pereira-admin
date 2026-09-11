import { createClient } from '@supabase/supabase-js';
import type { Contacto, ContactoInsert, ContactoUpdate } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

function getClient() {
  if (!supabase) throw new Error('Supabase no configurado — verifica las variables NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY');
  return supabase;
}

export async function getContactos() {
  const { data, error } = await getClient()
    .from('contactos_pereira')
    .select('*')
    .order('sector_comuna')
    .order('barrio_vereda')
    .order('no');
  if (error) throw error;
  return data as Contacto[];
}

export async function crearContacto(contacto: ContactoInsert) {
  const { data, error } = await getClient()
    .from('contactos_pereira')
    .insert([contacto])
    .select();
  if (error) throw error;
  return data[0] as Contacto;
}

export async function actualizarContacto(id: string, changes: ContactoUpdate) {
  const { data, error } = await getClient()
    .from('contactos_pereira')
    .update(changes)
    .eq('id', id)
    .select();
  if (error) throw error;
  return data[0] as Contacto;
}

export async function eliminarContacto(id: string) {
  const { error } = await getClient()
    .from('contactos_pereira')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
