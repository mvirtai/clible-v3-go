---
description: A workflow for lifecycle of PR's in the clible-v3-go/ workspace
---

# Git PR -työnkulku (Git PR Workflow)

Tämä workflow kuvaa vaiheet, joilla aloitamme uuden kehityshaaran ja lopulta suljemme/yhdistämme sen. Se hyödyntää `Taskfile.yml`-tiedoston automaatioita.

---

## Vaihe 1: Aloitus ja kehityshaara (Topic Branch)

Kehittäjä luo uuden aihealueen haaran kehitystä varten:

```bash
git switch -c feat/ominaisuuden-nimi
```

Tarvittaessa luomme suomenkielisen kehityssuunnitelman kansioon `.plans/` (esim. `.plans/08-uusi-ominaisuus.md`).

---

## Vaihe 2: Koodaus ja testit

Kehityksen aikana koodia ja laaduntarkistuksia testataan säännöllisesti komennolla:

```bash
task check
```

Tehdyt muutokset viedään etärepositorioon ajamalla:

```bash
task git:stage-commit-push MESSAGE="feat: add search normalization"
```

> [!NOTE]
> Kaikki koodi, kommentit ja commit-viestit kirjoitetaan englanniksi ammattimaista sanastoa noudattaen.

---

## Vaihe 3: PR-tarina (Pull Request Story)

Kun toteutus on valmis, tekoäly-agentti luo kattavan PR-selosteen (Pull Request Story) kansioon `pr_stories/` juoksevalla numeroinnilla englanniksi:

* Esim. `pr_stories/016-feat-uusi-ominaisuus.md`
* Sisältö kattaa muutosten taustat, tekniset ratkaisut ja testauksen.

---

## Vaihe 3.1: PR Storyn kirjoittamisen jälkeisten muutosten lisääminen PR Storyyn

Käyttäjä käy monta kertaa komennolla `task check` koodin läpi ennen kuin PR on edes luotu. Yleensä se tuottaa 0-10+ muutostarvetta, jotka tehtyäsi arvioit, tekevätkö ne joitain olennaisia muutoksia PR Storyn mihin tahansa osioihin, ja jos katsot selventäväksi ja konventionaalisesti järkeväksi ja perustelluksi, niin voit vapaasti muuttaa ja muokata PR Storya vastaamaan aina viimeisintä totuutta. Joka tapauksessa lisää ilmoitus tekemästäsi muutoksesta PR Storyyn lyhyesti (tosin, jos tilanne vaatii, niin kirjoita juuri niin pitkästi kuin on tarpeen selittää asia mahdollisimman ymmärrettävästi ja aikaisempien PR Storyjen asettamien konventioiden mukaisesti.

---

## Vaihe 3.5: Tietoturvakatselmointi (Security Review)

Jos koodimuutokset koskevat kriittisiä alueita (kuten autentikointia, tietokantakyselyitä tai syötteiden validointia), suorita tietoturvakatselmointi ohjeen [make-security-review.md](file:///home/vivaldev/code/clible-v3-go/.agents/workflows/make-security-review.md) mukaisesti:

1. Aja riippuvuustarkistus (`govulncheck ./...`) ja koodianalyysi.
2. Luo ja täytä raportti kansioon `.security_audits/` käyttäen pohjaa `.security_audits/templates/SECURITY_AUDIT_TEMPLATE.md` (esim. `.security_audits/security-audit-YYYY-MM-DD-<ominaisuus>.md`).
3. Korjaa mahdolliset 🔴 *Kriittiset* ja 🟠 *Korkeat* havainnot ennen PR:n avaamistä ja yhdistämistä.

---

## Vaihe 3.6: pr_storyn päivittäminen (Pull Request Story update)

Päivitä PR Story lisäämällä tieto asianmukaisista muutoksista koodikantaan. Mainitse, jos ne on tehty security auditoinnin pohjalta ja liitä tieto audit-kohdasta, jota muutos koskee. Lisää PR Storyyn erillinen osio raportoimaan vain jo selvitetyistä haavoittuvuuksista. ÄLÄ IKINÄ RAPORTOI haavoittuvuuksista, joita emme vielä ole paikanneet!

---

## Vaihe 4: Pull Requestin avaaminen GitHubiin

PR luodaan GitHubiin suorittamalla:

```bash
task git:pr FILE=016-feat-uusi-ominaisuus.md TITLE="feat: add search normalization"
```

Tämä komento suorittaa automaattisesti laaduntarkistukset, työntää haaran etäpalvelimelle ja luo PR:n käyttäen annettua tiedostoa kuvauksena.

## Vaihe 4.5: CI/CD-virheiden korjaaminen (CI/CD Fixes)

Jos GitHub Actions tai muu CI/CD-työnkulku ilmoittaa virheistä PR:n avaamisen jälkeen:

1. Selvitä virheen syy lokien perusteella ja korjaa koodi paikallisesti.
2. Aja laaduntarkistukset uudelleen: `task check`.
3. Vie korjaukset etärepositorioon (`task git:stage-commit-push MESSAGE="fix: resolve ci/cd test failure"`).
4. Päivitä tarvittaessa PR-tarinaa (Vaihe 3.1 & 3.6 mukaisesti), jos korjaukset muuttavat toiminnallisuutta.

---

## Vaihe 5: PR:n päättäminen ja siivous

Kun PR on hyväksytty ja valmis yhdistettäväksi:

1. Kehittäjä suorittaa Squash and Merge -yhdistämisen:

   ```bash
   task git:merge
   ```

2. Paikallisen ympäristön siivoamiseksi ajetaan kehityshaarassa ollessa:

   ```bash
   task git:post-merge-branch
   ```

   Tämä siirtyy `main`-haaraan, synkronoi sen etäpalvelimen (`origin/main`) kanssa ja poistaa vanhan kehityshaaran paikallisesti.

