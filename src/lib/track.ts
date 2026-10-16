'use client';

import { supabase } from './supabase';

// Persistent anonymous session id — survives reloads, unique per browser.
function sessionId(): string {
  if (typeof window === 'undefined') return 'ssr';
  let id = localStorage.getItem('c4_sid');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('c4_sid', id);
  }
  return id;
}

export async function track(
  event_type: string,
  opts: { product_id?: string; meta?: Record<string, unknown> } = {}
) {
  try {
    const { data } = await supabase.auth.getSession();
    await supabase.from('events').insert({
      user_id: data.session?.user.id || null,
      session_id: sessionId(),
      event_type,
      product_id: opts.product_id || null,
      path: window.location.pathname,
      meta: opts.meta || {},
    });
  } catch {
    /* tracking nunca quebra a pagina */
  }
}
