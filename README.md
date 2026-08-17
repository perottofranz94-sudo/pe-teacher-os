# PE Teacher OS

Pacchetto pronto per GitHub Pages.

## Caricamento
1. Crea una nuova repository GitHub (consigliato: `pe-teacher-os`).
2. Carica tutti i file di questo pacchetto mantenendo la cartella `assets`.
3. GitHub → Settings → Pages.
4. Build and deployment → Deploy from a branch.
5. Branch `main`, cartella `/ (root)`.
6. Salva.

## Funzioni già collegate
- login Supabase
- dashboard
- classi
- calendario
- chiusure scolastiche / gite
- generazione moduli progressivi
- archivio esercizi verificati
- scheda esercizio completa
- apertura lezione da 120'
- cambio esercizio limitato allo stesso sport
- sostituzione senza rigenerare l'intera lezione
- PWA installabile su iPhone

`config.js` contiene soltanto la publishable key di Supabase, adatta al frontend. Le RLS restano il vero controllo di accesso.
