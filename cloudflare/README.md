# Nutria · Cloudflare indipendente da ChatGPT

Codice della versione con 40 colori, 40 fantasie e 32 caratteri. Le richieste, i PNG e le credenziali non sono inclusi in questo repository pubblico.

## Workers Builds (repository root)
- Build: `npm --prefix cloudflare ci && npm --prefix cloudflare run build`
- Deploy: `npm --prefix cloudflare run deploy:built`
- Project: `nutria-sportswear-studio`

Prima della prima pubblicazione crea un database D1 `nutria-sportswear-db` e un bucket R2 `nutria-sportswear-files`. Inserisci l’ID reale del database in wrangler.json. Importa lo schema migrations/0001_initial.sql dal pannello D1. Configura ADMIN_PASSWORD_HASH e SESSION_SECRET come segreti: la gestione resta bloccata finché mancano. Non usare password in chiaro nel repository.

L’applicazione conserva frontend statico, API Worker, database D1, file R2 e login autonomo. Nessun abbonamento ChatGPT è richiesto. Le quote e le condizioni Cloudflare restano applicabili.

I dati esistenti vanno importati privatamente dai backup prima del passaggio definitivo. La cartella migration-data resta esclusa da Git e dagli asset pubblici.


## Cloudflare Builds dalla radice del repository

Build: `npm run build`
Deploy: `npm run deploy`
Preview: `npm run preview`

Prima del deploy creare D1 `nutria-sportswear-db` e R2 `nutria-sportswear-files`, aggiornare il database_id nel wrangler.json alla radice e applicare cloudflare/migrations/0001_initial.sql. Configurare ADMIN_PASSWORD_HASH e SESSION_SECRET come secrets. Non caricare credenziali o dati privati nel repository. Il file configura-admin.html genera i valori localmente nel browser.
