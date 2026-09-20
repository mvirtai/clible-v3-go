---
description: Plan Feature Workflow
---

# Uuden ominaisuuden suunnittelutyönkulku (Plan Feature Workflow)

Tämä workflow ohjaa uuden ominaisuuden arkkitehtonisessa suunnittelussa ja toteutussuunnitelman laatimisessa ennen koodin kirjoittamista.

---

## Työnkulun vaiheet

### 1. Esitutkimus (Research)

Ennen koodiin koskemista, agentin on analysoitava nykyistä koodipohjaa liittyen ominaisuuteen:

* Etsi vastaavia rajapintoja ja arkkitehtuurimalleja backendistä.
* Selvitä tarvittavat tietokantamuutokset ja nykyiset migraatiot kansiosta `backend/migrations/`.
* Varmista, miten frontend-puoli integroituu (esim. API-kutsut, tyypitykset).

### 2. Suunnitelman laatiminen (.plans/)

Luo uusi suomenkielinen toteutussuunnitelma kansioon `.plans/` käyttäen mallipohjaa `.plans/templates/PLAN_TEMPLATE.md` ja seuraavaa vapaata juoksevaa numerointia (esim. `.plans/08-uusi-ominaisuus.md`).

> [!IMPORTANT]
> Ellei kehittäjä erikseen toisin pyydä, suunnitelman ensisijainen tarkoitus on toimia **opetuksellisena, yksityiskohtaisena step-by-step-oppaana kehittäjälle**, joka kirjoittaa koodin itse. Agentin rooli on opastaa kehittäjää, selittää valitut suunnittelumallit ja tarjota valmiit koodimallit/mallitoteutukset suunnitelmatiedostossa.

Suunnitelman on sisällettävä vähintään seuraavat osat:

1. **Tavoite:** Lyhyt kuvaus siitä, mitä ollaan tekemässä ja miksi.
2. **Tietokantamigraatiot:**
   * SQL-lisäykset, jotka ovat yhteensopivia sekä PostgreSQL:n että SQLite-testitietokannan kanssa (ON CONFLICT, indeksit).
3. **Backend-muutokset (Go 1.22+):**
   * Reitityksen määritys `http.ServeMux` standardireitittimellä (esim. `POST /api/something`).
   * Repository-kerroksen metodit, jotka käyttävät `$1, $2` parametreja ja `context.Context` peruutusta.
   * Service-kerroksen logiikka (tarvittaessa puskuroitu käsittely 500 kappaleen erissä ja virheiden käsittely).
4. **Frontend-muutokset (React 19.2 + Compiler + TypeScript):**
   * **Pakollinen React 19.2 & Compiler Pre-Flight Audit:**
     * Zero `useEffect` for state sync (selaimen ja URL:n tilaan käytettävä `useSyncExternalStore`).
     * Asynkronisiin toimiin `useActionState` ja `<form action={...}>` (ei turhia `loading`/`error`/`saving` `useState`-lippuja).
     * Ei `useEffect`-ketjutuksia prop-muutoksiin tai välilehtiin.
     * Puhdas johdettu tila (render-aikainen laskenta).
   * API-tyyppien määrittely camelCase-muodossa vastaamaan backendin JSON-rakennetta.
   * UI-komponentit ja niiden sijoittelu TailwindCSS v4 -luokilla.
   * Kaksikielisyys (`frontend/src/i18n.ts`) suomeksi ja englanniksi.
5. **Varmistussuunnitelma:**
   * Miten muutokset testataan (yksikkötestit ja manuaalinen testaus).

### 3. Hyväksyntä

Esittele suunnitelma kehittäjälle. Älä tee koodimuutoksia tai aja komentoja ennen kuin kehittäjä on antanut suullisen tai kirjallisen hyväksynnän suunnitelmalle.

### 4. Tehtävälista (task.md)

Kun suunnitelma on hyväksytty, luo tekoälyn istuntokohtainen `task.md` (TODO-lista) ja ala seurata edistymistä sen avulla.
