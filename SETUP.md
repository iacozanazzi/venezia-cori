# Setup — Venezia Cori (database, admin, deploy)

Guida passo-passo per attivare proposte community, voti e pannello admin.
Finché non completi i passi 1–3 il sito gira in **modalità demo** (legge i 18 cori
dal file statico; voti e proposte disattivati). Tutto il resto funziona già.

---

## 1. Crea il progetto Supabase (gratis)

1. Vai su https://supabase.com → **Start your project** → accedi.
2. **New project** → scegli un nome (es. `venezia-cori`), una password DB (salvala), regione Europa.
3. Aspetta ~1 minuto che il progetto si crei.

## 2. Crea le tabelle (esegui lo schema)

1. Nel progetto Supabase, menu a sinistra → **SQL Editor** → **New query**.
2. Apri il file [`db/schema.sql`](db/schema.sql), copia **tutto** il contenuto, incollalo.
3. Premi **Run**. Deve finire senza errori (crea tabelle, regole di sicurezza, voti, e carica i 18 cori).
4. Verifica: menu **Table Editor** → tabella `chants` → devi vedere 18 righe `pubblicato`.

## 3. Collega il sito a Supabase

1. In Supabase: **Project Settings** (⚙) → **API**.
2. Copia **Project URL** e **anon public** key.
3. Apri [`js/supabase-config.js`](js/supabase-config.js) e incolla i due valori:
   ```js
   const SUPABASE_URL      = 'https://xxxx.supabase.co';
   const SUPABASE_ANON_KEY = 'eyJhbGciOi...';
   ```
4. Ricarica il sito: ora legge i cori dal database, i voti e le proposte sono attivi.

> La anon key **è pubblica per design**: sta nel frontend ed è giusto così. La sicurezza
> vera sono le regole RLS dentro `db/schema.sql` (chiunque può solo leggere il pubblicato
> e inviare proposte in coda; modificare/pubblicare solo da loggato).

## 4. Crea il tuo utente admin

1. In Supabase: **Authentication** → **Users** → **Add user** → **Create new user**.
2. Inserisci la tua email e una password. (Disattiva "Send confirmation email" / conferma a mano se richiesto.)
3. Vai su `/admin.html`, accedi con quelle credenziali → vedi le code di moderazione.

## 5. Pubblica online su Vercel (dominio gratuito `*.vercel.app`)

Il sito è statico, **nessun build**. Il file `vercel.json` è già incluso (URL puliti + header di sicurezza).

1. Inizializza il repo e fai il primo commit:
   ```sh
   git init && git add . && git commit -m "Venezia Cori"
   ```
2. Crea un repo su **GitHub** e fai push (`git remote add origin … && git push -u origin main`).
3. Vai su https://vercel.com → **Add New… → Project** → **Import** il repo da GitHub.
4. Lascia tutto di default: **Framework Preset = Other**, **Build Command = vuoto**, **Output Directory = vuoto** (root). Premi **Deploy**.
5. In pochi secondi ottieni un indirizzo gratuito tipo `https://venezia-cori.vercel.app`.

> ⚠️ I valori in `js/supabase-config.js` (URL + anon key) sono nel codice e vengono pubblicati
> così come sono: l'anon key è **pubblica per design**, la sicurezza vera sono le regole RLS.
> Assicurati che siano quelli reali prima del push. Ogni `git push` riaggiorna il sito online.

---

## 6. Donazioni — Ko-fi (offrimi un caffè)

1. Crea un account gratuito su https://ko-fi.com e scegli il tuo **username** (es. `veneziacori`).
2. Collega un metodo di incasso (PayPal o Stripe) nelle impostazioni Ko-fi.
3. Nel codice, sostituisci **`KOFI_USERNAME`** con il tuo username. Compare in due punti di
   [`index.html`](index.html): il bottone nell'header e quello nella sezione donazioni
   (`https://ko-fi.com/KOFI_USERNAME`).

> Donazioni piccole/occasionali sono liberalità: in genere gestibili come hobby senza partita IVA.

## 7. Merch — link di affiliazione (Amazon ecc.)

Lo schema crea una tabella `merch` gestita **solo dall'admin** (la sezione resta nascosta sul sito
finché non aggiungi prodotti).

1. Iscriviti a un programma di affiliazione (es. **Amazon Associates** — https://programma-affiliazione.amazon.it).
   Otterrai un **tag affiliato** da includere nei link prodotto.
2. Vai su `/admin.html` → tab **Merch** → **+ Aggiungi prodotto**: titolo, link affiliato
   (incollalo già completo del tuo tag), immagine, prezzo, categoria, ordine.
3. Il prodotto appare subito nella sezione "Merch arancioverde" della home. Togli la spunta
   **attivo** per nasconderlo senza eliminarlo.

> Le commissioni di affiliazione sono reddito occasionale: in Italia, sotto **5.000 €/anno lordi**
> non serve partita IVA, ma vanno **dichiarate nel 730/Modello Redditi**. La disclosure obbligatoria
> ("link di affiliazione") è già presente nella sezione merch, nel footer e nella privacy.

## 8. Parte legale (obbligatoria)

La pagina [`privacy.html`](privacy.html) è una **bozza-modello**: apri il file e compila i segnaposto
`[NOME]`, `[EMAIL]`, `[DATA]`. È già linkata dal footer e da un cookie banner informativo
(solo cookie tecnici; i cookie di affiliazione/donazioni si attivano sui siti esterni).

---

## 9. Pannello admin — gestione completa dei contenuti

Per sbloccare la gestione avanzata (modifica/aggiunta/nascondi cori, recupero rifiutati,
azzeramento popolarità) esegui **una volta** la migrazione:

1. Supabase → **SQL Editor** → **New query**
2. Apri [`db/migration-admin.sql`](db/migration-admin.sql), copia tutto, incolla, **Run**
   (aggiunge lo stato `nascosto`, abilita l'inserimento cori da admin e azzera i punteggi base)

Poi, nella tab **Gestione** di `/admin.html` puoi:

- **Aggiungi coro** → form in cima: crea un coro già pubblicato (con video opzionale).
- **Modifica** → su ogni coro correggi titolo, testo, categoria, avversario e **Punteggio base**, poi **Salva**.
- **Nascondi / Ripubblica** → metti un coro offline senza cancellarlo, e rimettilo quando vuoi.
- **Elimina** → rimuove il coro (e i suoi video/voti). Chiede sempre conferma.
- **Filtri** `Pubblicati / Nascosti / Rifiutati` + **ricerca** per trovare velocemente un coro.
- **Rifiutati** → dal filtro omonimo puoi **Ripubblicare** una proposta scartata o **eliminarla** del tutto.
- **Video** → su ogni coro: aggiungi, elimina, modifica url/piattaforma, o segna "in evidenza".

> **Popolarità:** il numero mostrato sul sito = *punteggio base* + *voti degli utenti*. Dopo la
> migrazione il punteggio base parte da 0 per tutti (classifica veritiera); puoi rialzarlo a mano
> dall'admin per dare risalto a un coro.

---

## 10. (Opzionale) Anti-spam più forte — Cloudflare Turnstile

I form hanno già un **honeypot** (campo trappola invisibile) e tutto passa per moderazione,
quindi nulla finisce pubblico senza il tuo ok. Se vuoi alzare l'asticella:

1. https://dash.cloudflare.com → **Turnstile** → crea un sito → ottieni **site key**.
2. Aggiungi il widget nei form di `index.html` e verifica il token (richiede un piccolo
   endpoint serverless, es. Netlify Functions). Da fare solo se lo spam diventa un problema.

---

## Come funziona, in breve

| Chi | Cosa può fare |
|-----|---------------|
| **Visitatore** | Legge i cori pubblicati, vota (1 volta a browser), propone cori e video |
| **Tu (admin)** | Su `/admin.html`: approvi/rifiuti/modifichi proposte, gestisci video, elimini |

- **Proposte cori** → tab "Proposte cori": correggi se serve, poi **Pubblica** → appare sul sito.
- **Proposte video** → tab "Proposte video": **Approva + mostra** → il bottone media compare sulla card.
- **Gestione** → tab "Gestione": crea/modifica/nascondi/elimina cori, gestisci i video e
  recupera le proposte rifiutate (vedi sezione 9).
