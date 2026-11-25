# Five Levels Timer — come metterlo online

Il sito ha due parti:

- `index.html`: tutto il sito (grafica, timer, livelli, libreria).
- `netlify/functions/pinterest.js`: la piccola funzione che legge una board Pinterest pubblica e restituisce le immagini.

La funzione gira solo su **Netlify**. Il trascinamento della cartella su Netlify Drop non pubblica le funzioni, quindi usa uno dei due metodi qui sotto.

## Metodo A — GitHub + Netlify (consigliato, tutto dal browser)

1. Crea un account gratuito su github.com.
2. Crea un nuovo repository (es. `five-levels-timer`), pubblico o privato.
3. Nel repository: **Add file → Upload files** e trascina **il contenuto** di questa cartella (`index.html`, `netlify.toml`, la cartella `netlify`). Poi **Commit changes**.
4. Vai su app.netlify.com, accedi con GitHub, **Add new site → Import an existing project → GitHub** e scegli il repository.
5. Lascia le impostazioni come sono (le legge da `netlify.toml`) e premi **Deploy**.
6. Dopo un minuto il sito è online su un indirizzo tipo `nome.netlify.app`. Da **Domain settings** puoi cambiarlo o collegare un tuo dominio (es. `timer.lexdruos.it`).

Ogni volta che carichi un file aggiornato su GitHub, Netlify ripubblica da solo.

## Metodo B — Netlify CLI (se usi il terminale)

```
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

da dentro questa cartella.

## Come si usa l'import da Pinterest

1. Su Pinterest apri una **board pubblica** e copia il link dalla barra (es. `https://it.pinterest.com/tuonome/pose-dinamiche/`). Vanno bene anche i link corti `pin.it` dell'app.
2. Nel sito, in **Libreria reference**, scegli la destinazione (Inbox o livello 1–5).
3. Incolla il link nel campo e premi **Importa board**.
4. La board resta nella lista: il tasto ↻ la riaggiorna e aggiunge solo i pin nuovi.

Consiglio: fai una board Pinterest per livello (pose dritte, statiche, dinamiche, angoli, estremi) e importale ciascuna nella sua colonna.

## Limiti da sapere

- Funziona solo con board **pubbliche**. Le board segrete non hanno il feed.
- Il feed di Pinterest restituisce di solito **gli ultimi ~25 pin** di una board. Per averne di più, dividi le reference in più board (es. "Dinamiche 1", "Dinamiche 2") o usa le sezioni come board separate.
- Le immagini restano su Pinterest: il sito salva solo i link. Se un pin viene cancellato, sparisce anche dal timer.
- Pinterest può cambiare o togliere il feed RSS in futuro. Se l'import smette di funzionare, il caricamento di file e il copia-incolla continuano a funzionare.
- Progressi e reference sono salvati nel browser che usi, non sul server.
