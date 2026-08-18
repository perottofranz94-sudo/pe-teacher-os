# AttivaMente v3.4

Upgrade: grado scolastico nelle classi, Giochi Scuola Primaria integrati nell’Archivio Sport e sostituzione attività con scelta “stessa disciplina” / “cambia liberamente”.

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

## v3.2 - Giochi scuola primaria
- Nuova sezione "Giochi scuola primaria".
- 75 schede importate da LIBRO GIOCHI.pdf, una per pagina, con immagine originale, difficolta, materiale e spazi, descrizione, regole e varianti.
- Ricerca e filtro per difficolta.
- Creazione/modifica/eliminazione di giochi personali sincronizzati su Supabase.
- Upload immagini personali su bucket privato Supabase `pe-primary-games` (max 5 MB, JPG/PNG/WebP).
- Nuova tabella dedicata `pe_primary_games` protetta da RLS; nessuna modifica alle tabelle esistenti.


## v3.6 — iPhone full navigation
- Menu mobile completo equivalente alla sidebar desktop.
- Barra rapida Home / Calendario / Classi / Menu.
- Creazione e modifica classi accessibile da iPhone.
- Calendario mensile scorrevole orizzontalmente su schermi piccoli.
- Nessuna modifica dati o schema Supabase.


## v3.9
- Sincronizzazione livelli sportivi senza upsert, più robusta su iPhone/Safari.
- Pulsante Elimina classe con archiviazione sicura dello storico.
- Nuovo anno: 5ª primaria, 3ª media e 5ª superiore vengono archiviate e non migrate al ciclo successivo.

## v4.0 — promozione classi
Alla creazione di un nuovo anno scolastico l'app chiede “Promuovi tutte le classi?”. Con Sì: primaria 1→2→3→4→5 e archivia la 5ª; medie 1→2→3 e archivia la 3ª; superiori 1→2→3→4→5 e archivia la 5ª. Con No: crea il nuovo anno senza migrare le classi.


## v4.2
- Correzione gestione duplicati classi e cache iPhone.
- Elenco anni scolastici nelle Impostazioni.
- Eliminazione sicura di un anno scolastico tramite RPC dedicata e doppia conferma.
- Indicatore versione visibile per verificare che la PWA sia aggiornata.
