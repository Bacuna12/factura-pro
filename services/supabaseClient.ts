// @ts-nocheck
// @ts-ignore
import { createClient } from '@supabase/supabase-js';

// =========================================================================
// CONFIGURACIÓN DE SUPABASE
// =========================================================================

const supabaseUrl = 'https://tsspacjibmpdgxanttql.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzc3BhY2ppYm1wZGd4YW50dHFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MjcxODUsImV4cCI6MjA4MzMwMzE4NX0.-a8H4rgjbTD5mU9wsN0WzW6iHn6XzngaAVYZu_XpAWg'; 

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isSupabaseConfigured = () => {
  return supabaseUrl.includes('.supabase.co') && 
         supabaseAnonKey.length > 50 && 
         supabaseAnonKey.startsWith('eyJ');
};

export const getSupabaseConfigError = () => {
  if (!supabaseUrl.includes('.supabase.co')) return "URL de proyecto inválida.";
  if (supabaseAnonKey.startsWith('sb_')) return "⚠️ ¡Atención! Has pegado una llave de Stripe.";
  if (!supabaseAnonKey.startsWith('eyJ')) return "La llave debe empezar por 'eyJ'.";
  return null;
};