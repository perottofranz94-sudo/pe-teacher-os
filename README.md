# PE Teacher OS v2

Versione ridisegnata con:
- archivio sport visuale
- 1.390 attività verificate
- classi + alunni protetti da Supabase/RLS
- livelli classe-sport
- programmazione automatica
- calendario e chiusure
- test motori
- classifiche per sesso
- Hall of Fame
- migrazione anno scolastico
- PWA per iPhone

## Aggiornamento GitHub
Carica il contenuto dello ZIP nella root della repository e conferma la sostituzione dei file.
GitHub Pages si aggiornerà automaticamente.

## AttivaMente · branding e accesso
- Nome PWA: AttivaMente
- Icone iPhone/PWA: `assets/icon-180.png`, `icon-192.png`, `icon-512.png`, derivate dall'immagine AttivaMente fornita.
- I dati rimangono nel progetto Supabase remoto e sono quindi condivisi tra PC e iPhone quando si usa lo stesso account.
- L'interfaccia non offre registrazione pubblica: l'accesso avviene esclusivamente tramite Supabase Auth con email e password già abilitate nel progetto.
- Le tabelle personali `pe_*` sono protette dalle policy RLS basate su `auth.uid() = owner_id`; questo pacchetto non contiene migrazioni, DROP, TRUNCATE o script che cancellano i dati esistenti.
