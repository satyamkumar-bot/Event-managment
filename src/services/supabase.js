import { createClient } from '@supabase/supabase-js'
const url = import.meta.env.VITE_SUPABASE_URL
// Supabase now labels this a Publishable key; ANON_KEY remains supported for older projects.
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY
export const configured = Boolean(url && key && !url.includes('your-project'))
export const supabase = configured ? createClient(url, key) : null
export function requireSupabase() {
  if (!supabase)
    throw new Error(
      'Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env, then restart the dev server.'
    )
  return supabase
}
