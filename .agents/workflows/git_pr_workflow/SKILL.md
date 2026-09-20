---
name: Git PR Workflow
description: Työnkulku uuden kehityshaaran ja pull requestin (PR) aloittamiseen, hallintaan ja viimeistelyyn käyttäen Taskfile-työkaluja.
---

# Git PR -työnkulku (Git PR Workflow)

Tämä ohje kuvaa tavan, jolla aloitamme, kehitämme, julkaisemme ja suljemme Pull Requesteja (PR) tässä työtilassa. Se käyttää `Taskfile.yml`-tiedostoon määriteltyjä automaatioita ja noudattaa `AGENTS.md`-sääntöjä.

---

## Työnkulun vaiheet

### 1. Aloitus ja uusi kehityshaara (Topic Branch)

Kehittäjä aloittaa uuden ominaisuuden tai korjauksen luomalla uuden aihehaaran (topic branch).

Käytetään moderneja Git-komentoja:

```bash
git switch -c feat/ominaisuuden-nimi
```

Tarvittaessa tekoäly-agentti laatii suomenkielisen toteutussuunnitelman kansioon `.plans/` (esimerkiksi `.plans/08-uusi-ominaisuus.md`).

### 2. Koodaus ja laaduntarkistus

Kehitysvaiheen aikana koodia testataan säännöllisesti. Kaikki testit ja tyylitarkistukset (linterit) ajetaan yhdellä komennolla:

```bash
task check
```

Tehdyt muutokset voidaan lisätä ja työntää etärepositorioon kehityksen aikana käyttämällä valmista komentoa:

```bash
task git:stage-commit-push MESSAGE="feat: add search normalization feature"
```

> [!NOTE]
> Kaikki commit-viestit kirjoitetaan englanniksi ammattimaista ohjelmistokehityssanastoa noudattaen.

### 3. PR-tarinan kirjoittaminen (Pull Request Story)

Kun kehityshaara on valmis ja testit menevät läpi, tekoäly-agentti laatii kattavan PR-tarinan (Pull Request Story) kansioon `pr_stories/` käyttäen juoksevaa numerointia:

* Tiedostopolku: `pr_stories/016-feat-uusi-ominaisuus.md`
* Kieli: Englanti
* Sisältö: Liiketoimintakonteksti (business context), arkkitehtoniset muutokset ja testaussuunnitelma.

### 4. PR:n luominen GitHubiin

Kun tarina on valmis, PR luodaan GitHubiin suorittamalla komento:

```bash
task git:pr FILE=016-feat-uusi-ominaisuus.md TITLE="feat: add search normalization"
```

Tämä komento:

1. Ajaa laaduntarkistukset (`task check`).
2. Puskee paikallisen haaran GitHubiin.
3. Luo pull requestin käyttäen PR-tarinan sisältöä kuvauksena (`gh pr create`).

### 5. Yhdistäminen (Merge) ja siivous

Kun PR on hyväksytty ja valmis yhdistettäväksi:

1. Kehittäjä yhdistää PR:n joko GitHubin käyttöliittymästä tai ajamalla komentoriviltä:

   ```bash
   task git:merge
   ```

2. Paikallisen ympäristön siivoaminen ja palauttaminen `main`-haaraan tehdään siirtymällä ensin kyseisen aihehaaran päälle ja ajamalla:

   ```bash
   task git:post-merge-branch
   ```

   Tämä komento:
   * Siirtyy `main`-haaraan.
   * Hakee uusimmat muutokset palvelimelta (`git fetch --all`).
   * Synkronoi paikallisen `main`-haaran täysin (`git reset --hard origin/main`).
   * Poistaa paikallisen aihehaaran turvallisesti.
