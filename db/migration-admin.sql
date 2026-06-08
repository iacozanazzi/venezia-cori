-- ════════════════════════════════════════════════════════════════════════
--  Venezia Cori — Migrazione: pannello admin completo
--  Esegui questo file UNA VOLTA nello SQL Editor di Supabase,
--  DOPO aver già eseguito db/schema.sql.
--  Aggiunge: stato 'nascosto', inserimento cori da admin, azzeramento punteggi.
-- ════════════════════════════════════════════════════════════════════════

-- 1. Nuovo stato 'nascosto' — coro offline senza cancellarlo.
--    Resta invisibile al pubblico: la policy chants_read_public filtra
--    solo 'pubblicato', quindi nessuna altra modifica serve lato lettura.
alter table public.chants drop constraint if exists chants_stato_check;
alter table public.chants add constraint chants_stato_check
  check (stato in ('in_attesa','pubblicato','rifiutato','nascosto'));

-- 2. Permetti all'admin loggato di inserire cori in qualsiasi stato
--    (es. creare un coro già 'pubblicato' dal pannello, senza proposta pubblica).
drop policy if exists chants_insert_admin on public.chants;
create policy chants_insert_admin on public.chants
  for insert to authenticated with check (true);

-- 3. Azzera la popolarità base di tutti i cori: la classifica riparte
--    veritiera e cresce dai voti reali. Potrai rialzarla a mano dall'admin.
update public.chants set popolarita_base = 0;
