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

### 2. Kaavioiden ja visualisointien arviointi (Diagram Audit)
- Tarkastele Mermaid-kaavioita kriittisesti: tuoko kaavio aitoa selventävää arvoa?
- Onko käytetty oikeaa kaaviotyyppiä (`sequenceDiagram`, `flowchart`, `stateDiagram-v2`, `erDiagram`)?
- Varmista, ettei toisiinsa liittymättömiä aiheita ole väkisin yhdistetty samaan kuvaajaan.
- Varmista, että kaikki erikoismerkit (`@`, `=>`, `?`, `:`) on lainattu asianmukaisesti GitHubin Mermaid-renderöintiä varten.

### 3. Ammatillinen kieli ja terminologia (Tone & Rigor)
- Poista liioitteleva tai keinotekoinen hehkutus.
- Varmista, että teksti kuvaa ammattimaisesti ohjelmistoarkkitehtuuria, valintoja ja rajapintoja.

### 4. Testitulokset ja manuaalinen varmistus (Verification Audit)
- Varmista, että `Testing Strategy` sisältää todelliset testiajon tulosteet ja kattavuusluvut.
- Varmista, että `Manual Verification Checklist` sisältää vain asioita, jotka on oikeasti voitu varmentaa selaimessa tai ajonaikaisesti tällä nimenomaisella branchilla.

### 5. Synkronointi GitHubiin (Sync)
- Päivitä tarvittaessa suoraan avoinna oleva GitHub PR komennolla:
  `gh api -X PATCH repos/:owner/:repo/pulls/:number -F body=@pr_stories/...`
