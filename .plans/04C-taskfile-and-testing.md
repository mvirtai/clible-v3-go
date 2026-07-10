# Ohjeet ja konteksti: Taskfile-automatisointi ja testaus (Vaihe 3)

Tämä tiedosto sisältää ohjeet `Taskfile.yml`-tiedoston päivittämiseksi uusilla Docker-komennoilla sekä ohjeet sovelluksen manuaaliseen ja automaattiseen testaamiseen Docker-kontilla ennen Pull Requestin (PR) sulkemista.

---

## Vaihe 3.1: Taskfile.yml-päivitys

Lisäämme `Taskfile.yml`-tiedostoon kaksi uutta tehtävää (taskia):
1. `docker:build` — Kääntää sovelluksen (sekä frontendin että backendin) yhdeksi optimoiduksi Docker-kuvaksi nimellä `clible-v3` käyttäen BuildKit-välimuistia.
2. `docker:run` — Käynnistää luodun Docker-kontin paikallisesti portissa 8080.

### Muutokset tiedostoon [Taskfile.yml](file:///home/vivaldev/code/clible-v3-go/Taskfile.yml)

Etsi tiedostosta osio `# --- Global Development --- #` (noin rivi 116) ja lisää sen yläpuolelle (esimerkiksi React-tehtävien jälkeen) seuraava lohko:

```yaml
  # --- Docker Tasks --- #
  docker:build:
    desc: Build the unified production Docker image using BuildKit
    cmds:
      - docker build -t clible-v3 .

  docker:run:
    desc: Run the unified production Docker image locally
    cmds:
      - echo "Starting Clible-v3 container on http://localhost:8080"
      - docker run -p 8080:8080 --name clible-v3-app --rm clible-v3
```

---

## Vaihe 3.2: Paikallinen testaus ja laadunvarmistus

Ennen kuin PR viedään loppuun, meidän tulee varmistaa, että kontti ja sen sisällä oleva sovellus toimivat täysin odotetusti.

### Testausprosessi vaiheittain:

1. **Laatutestit paikallisesti:**
   Varmista ensin, että koodi kääntyy ja kaikki testit menevät läpi ilman virheitä:
   ```bash
   task check
   ```

2. **Docker-kuvan rakentaminen:**
   Rakenna konttikuva uudella taskillamme:
   ```bash
   task docker:build
   ```
   *Huomioi kääntämisen aikana, kuinka BuildKit hyödyntää aiemmin ladattuja Go-moduuleja ja pnpm-tiedostoja välimuistista. Ensimmäinen kerta voi kestää hetken, mutta toinen kerta on huomattavasti nopeampi.*

3. **Kontin ajaminen paikallisesti:**
   Käynnistä sovellus kontissa:
   ```bash
   task docker:run
   ```

4. **Käyttöliittymän ja API:n testaus selaimella:**
   - Avaa selain osoitteessa `http://localhost:8080`.
   - Varmista, että React-sivusto aukeaa ja tyylit (Tailwind v4) latautuvat oikein.
   - Suorita hakuja (kuten `John 3:16` tai tekstihaku) ja tarkista, että tulokset palautuvat.
   - Kokeillaan myös rate limiteriä: paina hakunäppäintä nopeasti monta kertaa peräkkäin. Jos ylität 10 pyynnön purskeen (burst limit), palvelimen tulisi palauttaa virhe `Too Many Requests - quota exceeded` (HTTP 429).
   - Tarkista kontin lokitulosteet (terminalissa) ja varmista, että JSON-muotoinen lokitus (`log/slog`) toimii ja tulostaa pyynnöt oikein.

5. **Kontin sammuttaminen:**
   - Sammuta kontti painamalla `Ctrl+C` terminalissa. Koska käytimme `--rm` -lipuketta, kontti siivotaan automaattisesti pois sammutuksen yhteydessä.
