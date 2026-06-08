/* ════════════════════════════════════════════════════════════════════
   Configurazione Supabase
   ────────────────────────────────────────────────────────────────────
   1. Crea un progetto gratuito su https://supabase.com
   2. Project Settings → API → copia "Project URL" e "anon public key"
   3. Incollali qui sotto al posto dei placeholder.

   NB: la "anon key" È PUBBLICA per design: sta nel frontend e va bene così.
       La sicurezza vera è nelle regole RLS del database (vedi db/schema.sql),
       non nel nascondere questa chiave.

   Finché restano i placeholder, il sito funziona in modalità DEMO leggendo
   i cori dal file statico js/chants-data.js (voti e proposte disattivati).
   ════════════════════════════════════════════════════════════════════ */

const SUPABASE_URL      = 'INCOLLA_QUI_PROJECT_URL';
const SUPABASE_ANON_KEY = 'INCOLLA_QUI_ANON_KEY';

const SUPABASE_CONFIGURED =
  SUPABASE_URL.startsWith('http') && !SUPABASE_ANON_KEY.startsWith('INCOLLA');

/* Crea il client solo se la libreria è caricata e la config è valida. */
let sb = null;
if (SUPABASE_CONFIGURED && window.supabase?.createClient) {
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else if (!SUPABASE_CONFIGURED) {
  console.info('[Venezia Cori] Modalità DEMO: Supabase non configurato, uso i dati statici.');
}

window.sb = sb;
window.SUPABASE_CONFIGURED = SUPABASE_CONFIGURED;
