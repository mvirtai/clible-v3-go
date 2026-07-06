# Suunnitelma: Automatisoitu monivaiheinen git-commit-työnkulku (git:commit-all)

Tämä dokumentti esittelee suunnitelman uuden `git:commit-all` -tehtävän (task) lisäämiseksi `Taskfile.yml` -tiedostoon. Tehtävän tarkoituksena on suorittaa useita loogisia git-committeja peräkkäin hyödyntäen väliaikaista komentotiedostoa `.git-commits.sh`.

---

## 1. Tausta ja ongelma
Kun teemme suuria muutoksia koodikantaan (kuten aiemmin toteutettu käyttäjäkohtainen käännösten eristäminen), muutokset koskettavat useita kerroksia:
* Tietokantamigraatiot
* Repository-koodi
* Palvelut ja rajapinnat
* Frontend-käyttöliittymä
* Yksikkötestit

Hyvien Git-käytäntöjen mukaisesti nämä muutokset tulisi pilkkoa erillisiin, loogisiin committeihin (esim. `migration: ...`, `refactor: ...`, `test: ...`) yhden suuren commitin sijaan. Manuaalisesti tämä on työlästä ja altistaa virheille (esim. väärät tiedostot päätyvät väärään committiin).

---

## 2. Ratkaisun suunnittelu

Luodaan mekanismi, jossa teemme väliaikaisen komentosarjatiedoston `.git-commits.sh`.
Tämä tiedosto sisältää tarkat komennot tiedostojen lisäämiseksi ja commitoimiseksi loogisina kokonaisuuksina.

### Esimerkki `.git-commits.sh` -tiedostosta:
```bash
#!/bin/bash
set -e # Lopeta suoritus heti, jos jokin komento epäonnistuu

echo "Starting logical commits..."

# Commit 1: Database Migration
git add backend/migrations/009_user_translations.sql
git commit -m "migration: add user_translations table"

# Commit 2: Backend Core (ctxkeys and translation repository)
git add backend/internal/ctxkeys/ctxkeys.go backend/internal/db/translation_repo.go backend/internal/middleware/auth_middleware.go
git commit -m "db: implement user translation repository and ctxkeys to break import cycle"

# Commit 3: Services and Handlers
git add backend/internal/services/verse_service.go backend/internal/api/translation_handler.go backend/main.go
git commit -m "feat: restrict translations to user session and check verse accessibility"

# Commit 4: Frontend UI presets
git add frontend/src/components/TranslationManager.tsx
git commit -m "feat: add Greek and Hebrew preset configurations to TranslationManager"

# Commit 5: Unit Tests
git add backend/internal/db/translation_repo_test.go backend/internal/api/translation_handler_test.go backend/internal/api/bible_handler_test.go backend/internal/api/analytics_handler_test.go backend/internal/services/verse_service_test.go
git commit -m "test: update backend unit tests to verify user translation mapping"

echo "All logical commits completed successfully!"
```

---

## 3. Taskfile-toteutus (`Taskfile.yml`)

Määritellään uusi task `git:commit-all` seuraavasti:

```yaml
  git:commit-all:
    desc: "Execute all staged commits defined in .git-commits.sh and clean up on success"
    preconditions:
      - sh: 'test -f .git-commits.sh'
        msg: "No .git-commits.sh file found. Please create one with git commands first."
    cmds:
      - bash .git-commits.sh && rm .git-commits.sh
```

### Miksi tämä on turvallinen ja toimiva?
1. **Precondition (Esiehto):** Task ei käynnisty ollenkaan, jos tiedostoa `.git-commits.sh` ei ole olemassa.
2. **`set -e` skriptissä:** Jos jokin commit tai tiedoston lisäys epäonnistuu, skripti pysähtyy heti, jolloin voit korjata tilanteen manuaalisesti.
3. **Automaattinen siivous (`&& rm .git-commits.sh`):** Skriptitiedosto poistetaan ainoastaan silloin, jos kaikki commitit onnistuvat. Näin se ei vahingossa päädy Git-historiaan. Jos suoritus epäonnistuu, tiedosto jää jäljelle korjauksia varten.

---

## 4. Mitä teemme seuraavaksi?
1. Päivitetään `Taskfile.yml` lisäämällä `git:commit-all` -tehtävä (ja korjaamalla käyttäjän aloittama pohja).
2. Kirjoitamme nykyisille tehdyille muutoksille valmiin `.git-commits.sh`-tiedoston.
3. Developer (sinä) suorittaa komennon `task git:commit-all` terminaalissa.
