/* ════════════════════════════════════════════════════════════════════
   Data layer — astrae Supabase per sito pubblico e admin.
   In modalità DEMO (Supabase non configurato) legge i cori dal file
   statico js/chants-data.js; voti e proposte sono disattivati.
   ════════════════════════════════════════════════════════════════════ */

const VeneziaAPI = (() => {
  const sb   = window.sb;
  const DEMO = !window.SUPABASE_CONFIGURED || !sb;

  /* selezione cori + media annidati (una sola query) */
  const CHANT_SELECT =
    'id,titolo,testo,categoria,avversario,popolarita_base,voti,' +
    'media(id,piattaforma,url,in_evidenza,stato)';

  function fromStatic() {
    // CHANTS è una const globale definita in chants-data.js (non su window)
    const list = (typeof CHANTS !== 'undefined') ? CHANTS : [];
    return list.map(c => ({
      id: c.id, titolo: c.titolo, testo: c.testo,
      categoria: c.categoria, avversario: c.avversario,
      popolarita_base: c.popolarita, voti: 0, media: []
    }));
  }

  return {
    demo: DEMO,

    /* ── PUBBLICO ─────────────────────────────────────────────── */

    // Cori pubblicati. I media vengono filtrati ai soli approvati in evidenza.
    async getPublishedChants() {
      if (DEMO) return fromStatic();
      const { data, error } = await sb
        .from('chants').select(CHANT_SELECT).eq('stato', 'pubblicato');
      if (error) throw error;
      return data.map(c => ({
        ...c,
        media: (c.media || []).filter(m => m.stato === 'approvato' && m.in_evidenza)
      }));
    },

    // Vota un coro. Ritorna il nuovo conteggio, o null in demo.
    async vote(chantId, token) {
      if (DEMO) return null;
      const { data, error } = await sb.rpc('cast_vote', { p_chant_id: chantId, p_token: token });
      if (error) throw error;
      return data;
    },

    // Proposta coro nuovo (+ video opzionali) via RPC atomica.
    async proposeChant({ titolo, testo, categoria, avversario, media }) {
      if (DEMO) throw new Error('demo');
      const { error } = await sb.rpc('propose_chant', {
        p_titolo: titolo, p_testo: testo, p_categoria: categoria,
        p_avversario: avversario || null, p_media: media || []
      });
      if (error) throw error;
    },

    // Proposta video per un coro esistente.
    async proposeMedia({ chantId, piattaforma, url }) {
      if (DEMO) throw new Error('demo');
      const { error } = await sb.from('media')
        .insert({ chant_id: chantId, piattaforma, url });
      if (error) throw error;
    },

    // Prodotti merch attivi (link affiliati). In demo ritorna lista vuota.
    async getMerch() {
      if (DEMO) return [];
      const { data, error } = await sb
        .from('merch').select('*').eq('attivo', true).order('ordine');
      if (error) throw error;
      return data || [];
    },

    /* ── AUTENTICAZIONE ADMIN ─────────────────────────────────── */
    auth: {
      async signIn(email, password) {
        if (DEMO) throw new Error('demo');
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      async signOut() { if (sb) await sb.auth.signOut(); },
      async getUser() {
        if (DEMO) return null;
        const { data } = await sb.auth.getUser();
        return data?.user || null;
      },
      onChange(cb) { if (sb) sb.auth.onAuthStateChange((_e, s) => cb(s?.user || null)); }
    },

    /* ── ADMIN (richiede login) ───────────────────────────────── */
    admin: {
      async pendingChants() {
        const { data, error } = await sb.from('chants')
          .select(CHANT_SELECT).eq('stato', 'in_attesa').order('created_at');
        if (error) throw error;
        return data;
      },
      // Video proposti per cori GIÀ pubblicati (la idea "manca il video").
      async pendingMedia() {
        const { data, error } = await sb.from('media')
          .select('id,piattaforma,url,in_evidenza,chant_id,chants(titolo,stato)')
          .eq('stato', 'in_attesa').order('created_at');
        if (error) throw error;
        return data;
      },
      async allChants() {
        const { data, error } = await sb.from('chants')
          .select(CHANT_SELECT).order('stato').order('popolarita_base', { ascending: false });
        if (error) throw error;
        return data;
      },
      async setChantStato(id, stato) {
        const { error } = await sb.from('chants').update({ stato }).eq('id', id);
        if (error) throw error;
      },
      // Crea un coro direttamente dall'admin (es. già 'pubblicato').
      // fields: { titolo, testo, categoria, avversario, popolarita_base, stato }
      async addChant(fields) {
        const { data, error } = await sb.from('chants').insert(fields).select('id').single();
        if (error) throw error;
        return data;   // { id } — utile per agganciare eventuali video
      },
      async updateChant(id, fields) {
        const { error } = await sb.from('chants').update(fields).eq('id', id);
        if (error) throw error;
      },
      async deleteChant(id) {
        const { error } = await sb.from('chants').delete().eq('id', id);
        if (error) throw error;
      },
      async setMedia(id, fields) {
        const { error } = await sb.from('media').update(fields).eq('id', id);
        if (error) throw error;
      },
      async deleteMedia(id) {
        const { error } = await sb.from('media').delete().eq('id', id);
        if (error) throw error;
      },
      async addMedia({ chantId, piattaforma, url }) {
        const { error } = await sb.from('media')
          .insert({ chant_id: chantId, piattaforma, url, stato: 'approvato', in_evidenza: true });
        if (error) throw error;
      },

      /* ── MERCH ── */
      async allMerch() {
        const { data, error } = await sb.from('merch').select('*').order('ordine');
        if (error) throw error;
        return data || [];
      },
      async addMerch(fields) {
        const { error } = await sb.from('merch').insert(fields);
        if (error) throw error;
      },
      async updateMerch(id, fields) {
        const { error } = await sb.from('merch').update(fields).eq('id', id);
        if (error) throw error;
      },
      async deleteMerch(id) {
        const { error } = await sb.from('merch').delete().eq('id', id);
        if (error) throw error;
      }
    }
  };
})();

window.VeneziaAPI = VeneziaAPI;
