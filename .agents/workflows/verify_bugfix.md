---
description: Verify Bugfix Workflow
---

# Virheenkorjaus- ja laaduntarkistustyönkulku (Verify Bugfix Workflow)

Tämä workflow ohjaa kehitysvirheiden, linter-virheiden ja kääntymisongelmien ratkaisemisessa sekä koodin laadun varmistamisessa.

---

## Työnkulun vaiheet

### 1. Virheen analysointi

Kun kehittäjä ilmoittaa virheestä tai antaa virhelokin:

* Etsi virheeseen liittyvät tiedostot ja koodirivit projektista.
* Varmista, että ymmärrät ongelman syyn ennen muutosten tekemistä.

### 2. Korjauksen toteutus

* Tee korjaukset kohdistetusti vain kyseiseen ongelmaan.
* Älä lisää uusia piirteitä tai tee laajoja refaktorointeja tässä vaiheessa.
* Noudata tarkasti `AGENTS.md`-sääntöjen mukaisia koodauskäytäntöjä (esim. dual-driver-yhteensopivuus, virheiden nollatoleranssi).

### 3. Laaduntarkistukset (Quality Gates)

Kun korjaus on tehty, aja testit ja tarkistukset paikallisesti:

1. **Backend-laadunvarmistus:**

   ```bash
   task backend:check
   ```

   Tämä varmistaa, että Go-moduulit ovat kunnossa (`go mod tidy`), koodi noudattaa linter-sääntöjä ja yksikkötestit menevät läpi kattavuusraportin kera.

2. **Frontend-laadunvarmistus:**

   ```bash
   task frontend:check
   ```

   Tämä ajaa frontendin tyyppitarkistukset, linterin ja yksikkötestit.

3. **Yhteinen tarkistus:**

   ```bash
   task check
   ```

   Varmista, että koko projekti läpäisee laatuportit virheettömästi.

### 4. Varmistuksen raportointi

* Raportoi kehittäjälle, mitkä testit ajettiin ja että ne menivät läpi.
* Kerro lyhyesti virheen juurisyy ja miten se korjattiin.
* Kirjaa tehdyt muutokset ja korjaukset haaraan liittyvään (mahdollisesti vielä keskeneräiseen) PR-tarinaan (`pr_stories/`-kansiossa).
