---
description: Työnkulku Pull Request -tarinan (PR Story) kriittiseen 'uusin silmin' -katselmointiin ja laadunvarmistukseen
---

# Workflow: PR Story Review & Fresh-Eyes Audit

Tämä työnkulku suoritetaan aina, kun PR-tarina (`pr_stories/*.md`) on luotu tai sitä on muokattu merkittävästi.

---

## Vaiheet

### 1. Faktantarkistus ja koodierot (Diff Check)
- Aja `git status` ja tarkista muuttuneet tiedostot.
- Varmista, että jokainen muuttunut tiedosto on mainittu PR-tarinan **Files Changed** -taulukossa.
- Varmista, ettei PR-tarina väitä valmiiksi asioita, jotka on jätetty tuleviin PR-vaiheisiin.

### 2. Kaavioiden ja visualisointien arviointi (Diagram Audit & Quantity Discipline)
- **Tarpeellisuustesti**: Tuoko kaavio aitoa arvoa? Jos muutos on pieni korjaus tai konfiguraatiomuutos, 0 kaaviota on suositeltu ratkaisu.
- **Määräkuri (~0–3 kaaviota)**:
  - `0 kaaviota`: Yksittäiset bugikorjaukset, lean-muutokset, refaktoroinnit, i18n-viilaukset.
  - `1 kaavio`: Tyypillinen uusi ominaisuus (esim. yksittäinen rajapintasekvenssi tai tilakone).
  - `2 kaaviota`: Monikerroksinen kokonaisuus (esim. sekvenssikaavio + tietovirtaputki/AST).
  - `3 kaaviota (katto)`: Suuret arkkitehtuurijulkaisut (max 3, eri näkökulmista). Yli 3 kaaviota on ehdottomasti kielletty.
- **Kaaviotyypin valinta**: `sequenceDiagram` (rajapinnat/kerrokset), `stateDiagram-v2` (tilat), `flowchart` (logiikka), `erDiagram` (tietokantataulut).
- **Erikoismerkkien lainaus**: Kaikki erikoismerkit (`@`, `=>`, `?`, `:`, `()`, `{}`) on lainattava lainausmerkeillä (`["..."]` tai `|"...|"`).

### 3. Rinnakkaisten agenttien ja haarojen koordinointi (Concurrency & Sequencing Audit)
- **Aktiivisen haaran varmistus**: Tarkista `git branch --show-current`. Varmista, ettei työtilassa ole toiselle agentille tai haaralle kuuluvia komitoimattomia muutoksia.
- **PR Story -sekvenssinumeron tarkistus**: Tarkista `ls -1 pr_stories/` ja `git log --all --oneline -- pr_stories/`. Varmista, ettei numero (esim. 088) törmää toisen rinnakkaisen haaran PR-tarinan kanssa. Jos törmää, siirrä omaksi numerokseen (`089-...`).
- **Julkaisujärjestys (Sequencing)**:
  1. Ytimen ja tietokannan korjaukset / jaetut tyypit mergetään ensin.
  2. Riippumattomat aihehaarat voivat edetä rinnakkain.
  3. Neuvo kehittäjää rebeissaamaan muut avoimet haarat `main`-haaran mergeamisen jälkeen.

### 4. Ammatillinen kieli, luovuus ja ilmaisun elävyys (Tone, Rigor & Engaging Narrative)
- **Kertomuksellinen kaari (Narrative Arc)**: Varmista, ettei PR-tarina ole vain steriili mekaaninen muutoslista tai robottimainen 'changelog dump'. Avaa arkkitehtoninen matka: mikä oli perimmäinen kitka tai ongelma, miksi juuri tämä ratkaisutapa valittiin ja mitä kompromisseja punnittiin.
- **Elävä tekninen ilmaisu vs. robottimainen toisto**: Käytä täsmällistä, rikasta ohjelmistoarkkitehtuurin kieltä ja osuvia metaforia. Vältä identtistä kaavamaista toistoa eri PR-tarinoiden välillä.
- **Käsityötaidon ja ergonomian juhlistaminen (Craftsmanship)**: Nosta esiin koodin elegantit mikro-yksityiskohdat, algoritmiset oivallukset, suorituskykyviilaukset ja käyttöliittymän sujuvuus.
- **Onttojen myyntisanojen karsinta**: Erota elävä tekninen kerronta ontosta markkinointihypestä (*"revolutionary"*, *"game-changing"*, *"mind-blowing"*). Säilytä syvä tekninen rehellisyys ja senior-tason tarkkuus.

### 5. Testitulokset ja manuaalinen varmistus (Verification Audit)
- Varmista, että `Testing Strategy` sisältää todelliset testiajon tulosteet ja kattavuusluvut (`task check`, `go test`, Vitest).
- Varmista, että `Manual Verification Checklist` sisältää vain asioita, jotka on oikeasti voitu varmentaa selaimessa tai ajonaikaisesti tällä nimenomaisella branchilla.

### 6. Synkronointi GitHubiin (Sync)
- Päivitä tarvittaessa suoraan avoinna oleva GitHub PR komennolla:
  `task git:pr-edit PR=<number> FILE=pr_stories/...`
  tai:
  `gh api -X PATCH repos/:owner/:repo/pulls/:number -F body=@pr_stories/...`
