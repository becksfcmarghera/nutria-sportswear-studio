# Nutria Creator: attivazione controllata di Cloudflare Access

## Stato di questa correzione

Questa modifica prepara il codice; **non crea applicazioni Access e non attiva Access**.
Il login esistente continua a funzionare finché `AUTH_MODE` non è `access`.
Nessuna migrazione, cancellazione di dati o modifica ai binding D1/R2.
Non impostare le variabili Access prima di completare le verifiche sotto.

## Prima di qualsiasi pubblicazione

Dal pannello Cloudflare verificare il Worker `nutria-creator`, il suo URL effettivo,
i domini, tutte le applicazioni Access che si sovrappongono e la configurazione Builds.
Conservare la versione pubblicata per il rollback. Verificare se il sito pubblico usa
lo stesso Worker o `nutria-sportswear-studio`. Non sostituire Worker o database.

`wrangler.creator.json` punta a `nutria-creator` e lascia `workers_dev: false`.
`wrangler.json` e `cloudflare/wrangler.json` puntano a `nutria-sportswear-studio`.
**Non usare il deploy predefinito per pubblicare Creator.** Controllare nel pannello
che Builds usi il file corretto prima di pubblicare. Non riattivare workers.dev
finché non sono stati verificati i percorsi e l'impatto sul sito pubblico.

Binding attesi (da confrontare con lo stato remoto, senza ricrearli):
- D1 `DB`: `nutria-sportswear`, ID `bc652a02-922a-4179-9026-68acd7ea8332`.
- R2 `BUCKET`: `nutria-sportswear-files`.

## Percorsi e impatto

| Percorso | Uso | Protezione Access |
| --- | --- | --- |
| `/`, `/index.html`, `/studio`, `/studio.html`, asset e modello GLB | Configuratore esistente | Pubblico |
| `/progetti`, `/api/photos` GET, `/api/files/projects/*` | Portfolio pubblico | Pubblico |
| `/api/bozze` POST | Invio clienti, PNG e GLB | Pubblico; validazione e controllo origine nel Worker |
| `/admin`, `/admin/*` | Dashboard e gestione foto | Stessa applicazione Access amministrativa |
| `/api/admin`, `/api/admin/*` | Sessione, richieste, file privati, gestione foto, diagnostica | Stessa applicazione Access amministrativa |
| `/bozze`, `/bozze/`, `/manage.html`, `/configura-admin.html` | Vecchi ingressi | In modalità Access rimandano a `/admin`; nessun contenuto privato |
| `/api/bozze` GET/PATCH e vecchie API di modifica | Compatibilità | Il Worker esige un'autenticazione valida; non proteggere l'intero percorso con Access perché POST è pubblico |

Non attivare "Protect all Workers" o "All traffic" sul Worker pubblico:
richiederebbe il login anche ai clienti. Non aggiungere una policy Bypass generale.

## Configurazione da eseguire dopo l'accesso all'account

1. Verificare che Zero Trust e l'identità One-time PIN siano già configurati.
   Se OTP manca, aggiungerlo senza cambiare gli altri provider.
2. Creare o correggere una sola applicazione self-hosted amministrativa con gli
   hostname reali e i percorsi `/admin`, `/admin/*`, `/api/admin`, `/api/admin/*`.
   Se il dominio workers.dev disponibile non consente questi percorsi, fermarsi e
   verificare una soluzione con dominio dedicato prima di modificare la sicurezza.
3. Impostare la policy Allow con **Include → Emails → becksfcmarghera@gmail.com**.
   Selezionare One-time PIN come provider dell'applicazione e richiederlo nella
   policy. Nessuna regola Include Everyone o dominio `gmail.com`, nessun Bypass.
   Controllare che non esistano altre policy Allow più ampie.
4. Copiare il team domain e l'AUD reali della stessa applicazione. Configurare sul
   Worker le variabili `ACCESS_TEAM_DOMAIN=https://<team>.cloudflareaccess.com`,
   `ACCESS_AUD=<AUD reale>` e confermare `ADMIN_EMAIL=becksfcmarghera@gmail.com`.
   Confrontarle con eventuali variabili in Wrangler/Builds per evitare sovrascritture.
5. Pubblicare prima il codice preparato nella modalità di login esistente e
   verificarlo. Solo dopo la conferma dell'impatto e la predisposizione delle
   policy, impostare `AUTH_MODE=access`. Da quel momento i cookie del vecchio
   login e le password non autorizzano più gli amministratori.
6. Verificare da una sessione anonima il caricamento del configuratore e degli
   asset, il portfolio e l'invio cliente; un invio reale crea dati, quindi usare
   una richiesta di prova identificata e concordata. Non cancellare dati esistenti.
7. Accedere a `/admin` con il codice ricevuto dall'unica email autorizzata.
   Verificare le richieste e i download PNG/GLB esistenti. Accertare il rifiuto
   per utenti anonimi e altra email. I test locali verificano già token falsi,
   scaduti, audience/issuer errati e tentativi con header email falsificato.
8. Da amministratore aprire `/api/admin/health`: `{d1:true,r2:true}` verifica la
   lettura delle tabelle `drafts`/`photos` e l'accesso all'elenco R2, senza scrivere
   dati né esporne il contenuto. Non prova da solo la possibilità di scrivere o
   l'esistenza di ogni allegato: controllare separatamente i download esistenti.
9. Su smartphone verificare a 360/390 px e in orizzontale: scorrimento verticale,
   pulsante "Attiva rotazione 3D", rotazione/zoom, colori, upload logo, anteprima
   quattro viste e invio. I controlli touch esistenti non sono stati sostituiti.

## Rollback

Se la sola area admin ha problemi, ripristinare prima le variabili e la versione
precedenti del Worker, mantenendo le policy Access amministrative. Non allargare
policy, non disattivare le protezioni sull'intero sito e non ricreare D1/R2.
La scelta di ripristinare il login precedente va valutata rispetto alla policy
Access effettiva. Non eseguire migrazioni né importazioni per risolvere il login.

## Verifica locale

```
npm --prefix cloudflare ci
npm --prefix cloudflare run build
node --test cloudflare/tests/*.test.mjs
```

Riferimenti ufficiali:
- https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/
- https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/
- https://developers.cloudflare.com/cloudflare-one/access-controls/policies/common-policies/
