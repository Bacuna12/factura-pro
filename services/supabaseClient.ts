
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

// =========================================================================
// CONFIGURACIÓN DE SUPABASE
// =========================================================================

// 1. Tu URL del proyecto
const supabaseUrl = 'https://tsspacjibmpdgxanttql.supabase.co';

/**
 * 2. TU LLAVE ANON PUBLIC 
 * Integrada correctamente: Empieza por eyJ...
 */
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzc3BhY2ppYm1wZGd4YW50dHFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MjcxODUsImV4cCI6MjA4MzMwMzE4NX0.-a8H4rgjbTD5mU9wsN0WzW6iHn6XzngaAVYZu_XpAWg'; 

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Verifica si la configuración es válida
 */
export const isSupabaseConfigured = () => {
  return supabaseUrl.includes('.supabase.co') && 
         supabaseAnonKey.length > 50 && 
         supabaseAnonKey.startsWith('eyJ');
};

export const getSupabaseConfigError = () => {
  if (!supabaseUrl.includes('.supabase.co')) return "URL de proyecto inválida.";
  if (supabaseAnonKey.startsWith('sb_')) return "⚠️ ¡Atención! Has pegado una llave de Stripe. Necesitas la llave 'anon public' de Supabase.";
  if (!supabaseAnonKey.startsWith('eyJ')) return "La llave debe empezar por 'eyJ'. Búscala en: Dashboard Supabase -> Settings -> API -> anon public.";
  return null;
};
