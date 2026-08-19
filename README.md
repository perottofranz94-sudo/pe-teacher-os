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


## v4.3
- Orario settimanale obbligatorio per ogni classe (più giorni supportati).
- Il generatore automatico usa l’orario della classe e assegna l’orario alle lezioni create.
- L’orario viene copiato automaticamente quando una classe viene promossa al nuovo anno.
- Nuovo pulsante Calendario → Lezione extra, con data, ora e classe.


## v4.4
- Classifiche test premium con KPI, podio e confronto con media.
- Trend della media classe rispetto alla rilevazione precedente dello stesso test.
- Hall of Fame ridisegnata con bacheca record, statistiche e atleta con più presenze.


## v4.6
- Corretto embed PostgREST tra pe_lesson_exercises e pe_exercises specificando la FK exercise_id.
- Evita ambiguità introdotta dalla seconda FK replaced_from_exercise_id.


## v4.7
- Lezione extra: singola attività archivio / lezione automatica completa / attività manuali.
- Nuovo pulsante Lezione Manuale con builder misto archivio + attività scritte dal docente.
- Durate controllate e dettaglio attività cliccabile tramite pe_lesson_exercises.


## v4.8
- Chiusure scuola/classe: slittamento automatico delle lezioni programmate, mantenendo la sequenza.
- Generatore iPhone: pulsante esplicito e gestione robusta degli errori.
- Classifiche: filtri Classe + Test + Generale/Femmine/Maschi.


## Versione 5.0
- Eliminazione di una singola lezione dal calendario con compattazione automatica del modulo.
- Spostamento di una lezione a una data scelta.
- Slittamento della lezione selezionata e di tutte le successive per N occasioni utili, rispettando orario e chiusure.
- Eliminazione completa di un blocco/modulo dalla sezione Programmazione.


## Versione 5.0
- Conferma dettagliata prima di eliminare un intero blocco: sport, classe, numero lezioni e rimozione dal calendario.
- Classifiche ridisegnate in stile più semplice e sportivo, con emoji automatiche in base al test, podio compatto, media classe e miglior prestazione.


## v5.3
- Da Impostazioni: Elimina rimuove l'intero blocco di chiusura.
- Dal Calendario: toccando una chiusura si rende disponibile solo la singola giornata selezionata; gli altri giorni del blocco restano chiusi.


## v5.4
- Le chiusure dell'intera scuola colorano in rosso tutta la casella del calendario.
- Emoji automatica per Natale, Pasqua, Carnevale, Ognissanti, Immacolata, 1 maggio, 25 aprile, 2 giugno e altre ricorrenze; ❌ per motivi manuali non riconosciuti.
- Le gite/uscite di classe non colorano la giornata: vengono mostrate con 🚌, nome classe e motivo.


## v5.6
- Calendario mobile ridimensionato su 7 colonne visibili contemporaneamente.
- Eliminato lo scorrimento orizzontale del mese su iPhone.
- Celle, testi, eventi ed emoji adattivi per schermi piccoli.


## v5.7
- Calendario limitato ai mesi scolastici settembre-giugno.
- Luglio e agosto esclusi dalla navigazione.
- Giorno corrente evidenziato con bordo/glow blu-arancio coerente con AttivaMente.


## v5.8
- Corretto il bug che impediva il rendering del calendario nella v5.7.
- `todayIso` ora viene inizializzato correttamente prima del rendering.
- Il mese viene realmente limitato/clampato tra settembre e giugno.
