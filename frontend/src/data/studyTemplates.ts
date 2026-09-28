import type { StudyMethodTemplate } from '../types/studyMethods';

/**
 * Pre-configured study method templates for Clible notebooks.
 * Popular methods (v1): SOAP, Inductive (OIA), Swedish Method.
 * Future methods (v2): Lectio Divina, HEAR, Word & Topical.
 */
export const STUDY_TEMPLATES: StudyMethodTemplate[] = [
  {
    id: 'soap',
    nameKey: 'studyTemplateSoapTitle',
    descKey: 'studyTemplateSoapDesc',
    badgeKey: 'studyTemplateSoapBadge',
    iconName: 'BookOpen',
    isPopular: true,
    cells: [
      {
        titleKey: 'studySoapScripture',
        placeholderKey: 'studySoapScripturePlaceholder',
        defaultContent: `## 📖 Scripture (Raamatunkohta)\n\n> Kirjoita tai tuo tutkittava raamatunkohta tähän. Voit käyttää myös suoritettavaa ISLA-komentoa:\n\n! @(Joh 3:16-17).use(fin-1992)\n`,
        colSpan: 12,
        rowSpan: 6,
      },
      {
        titleKey: 'studySoapObservation',
        placeholderKey: 'studySoapObservationPlaceholder',
        defaultContent: `## 🔍 Observation (Havainnointi)\n\n* Mitä tekstissä tapahtuu tai sanotaan?\n* Ketkä ovat läsnä? Mitä avainsanoja toistuu?\n* Mikä lause tai sana nousee esiin?\n\n**Havainnot:**\n\n`,
        colSpan: 12,
        rowSpan: 6,
      },
      {
        titleKey: 'studySoapApplication',
        placeholderKey: 'studySoapApplicationPlaceholder',
        defaultContent: `## 🎯 Application (Soveltaminen)\n\n* Mitä tämä jae merkitsee minulle henkilökohtaisesti tänään?\n* Miten voin elää tämän todeksi arjessani, ihmissuhteissani tai valinnoissani?\n\n**Sovellus:**\n\n`,
        colSpan: 12,
        rowSpan: 6,
      },
      {
        titleKey: 'studySoapPrayer',
        placeholderKey: 'studySoapPrayerPlaceholder',
        defaultContent: `## 🙏 Prayer (Rukous)\n\n> Kirjoita henkilökohtainen rukous Sanan pohjalta:\n\n**Rukous:**\n\n`,
        colSpan: 12,
        rowSpan: 5,
      },
    ],
  },
  {
    id: 'inductive',
    nameKey: 'studyTemplateInductiveTitle',
    descKey: 'studyTemplateInductiveDesc',
    badgeKey: 'studyTemplateInductiveBadge',
    iconName: 'Search',
    isPopular: true,
    cells: [
      {
        titleKey: 'studyInductiveObs',
        placeholderKey: 'studyInductiveObsPlaceholder',
        defaultContent: `## 1. Havainnointi (Mitä teksti sanoo?)\n\n* **5W+H:** Kuka, Mitä, Milloin, Missä, Miksi, Miten?\n* **Avainsanat ja toistot:**\n* **Lauseiden syy-seuraussuhteet:**\n\n**Havainnot:**\n\n`,
        colSpan: 12,
        rowSpan: 7,
      },
      {
        titleKey: 'studyInductiveInterp',
        placeholderKey: 'studyInductiveInterpPlaceholder',
        defaultContent: `## 2. Tulkinta (Mitä teksti tarkoittaa?)\n\n* **Kirjoittajan alkuperäinen tarkoitus kuulijoilleen:**\n* **Historiallinen ja kulttuurinen konteksti:**\n* **Rinnakkaiskohdat ja Raamatun kokonaisilmoitus:**\n\n**Tulkinta:**\n\n`,
        colSpan: 12,
        rowSpan: 7,
      },
      {
        titleKey: 'studyInductiveApp',
        placeholderKey: 'studyInductiveAppPlaceholder',
        defaultContent: `## 3. Soveltaminen (Mitä tämä merkitsee tänään?)\n\n* **Ajaton totuus Jumalasta ja ihmisestä:**\n* **Konkreettinen muutos mielessä tai teoissa:**\n\n**Sovellus:**\n\n`,
        colSpan: 12,
        rowSpan: 6,
      },
    ],
  },
  {
    id: 'swedish',
    nameKey: 'studyTemplateSwedishTitle',
    descKey: 'studyTemplateSwedishDesc',
    badgeKey: 'studyTemplateSwedishBadge',
    iconName: 'Lightbulb',
    isPopular: true,
    cells: [
      {
        titleKey: 'studySwedishLamp',
        placeholderKey: 'studySwedishLampPlaceholder',
        defaultContent: `## 💡 Lamppu (Oivallukset ja valo)\n\n* Mikä ajatus tai jae sytytti valon tai puhutteli erityisesti?\n* Mikä loisti uutena asiana tekstistä?\n\n**Valoni tekstistä:**\n\n`,
        colSpan: 8,
        rowSpan: 6,
      },
      {
        titleKey: 'studySwedishQuestion',
        placeholderKey: 'studySwedishQuestionPlaceholder',
        defaultContent: `## ❓ Kysymysmerkki (Mietityttävät asiat)\n\n* Mikä jäi epäselväksi tai vaikeaksi ymmärtää?\n* Mitä taustatietoa tai selitystä haluan tutkia tarkemmin?\n\n**Kysymykseni:**\n\n`,
        colSpan: 8,
        rowSpan: 6,
      },
      {
        titleKey: 'studySwedishArrow',
        placeholderKey: 'studySwedishArrowPlaceholder',
        defaultContent: `## ➔ Nuoli (Sovellus elämään)\n\n* Miten suuntaan tämän suoraan omaan elämääni?\n* Mikä on konkreettinen seuraava askel?\n\n**Nuoleni (askel arkeen):**\n\n`,
        colSpan: 8,
        rowSpan: 6,
      },
    ],
  },
  {
    id: 'lectio',
    nameKey: 'studyTemplateLectioTitle',
    descKey: 'studyTemplateLectioDesc',
    badgeKey: 'studyTemplateLectioBadge',
    iconName: 'Heart',
    isPopular: false,
    cells: [
      {
        titleKey: 'studyLectioContent',
        placeholderKey: 'studyLectioPlaceholder',
        defaultContent: `## 🕊️ Lectio Divina (Pyhä lukeminen)\n\n1. **Lectio (Lukeminen):** Lue rauhassa ja kuuntele.\n2. **Meditatio (Mietiskely):** Pureskele sydämessäsi sanaa tai lausetta.\n3. **Oratio (Rukous):** Vastaa Jumalalle siitä, mitä teksti herätti.\n4. **Contemplatio (Lepääminen):** Lepää Jumalan läsnäolossa Sanan äärellä.\n\n**Muistiinpanot ja hedelmät:**\n\n`,
        colSpan: 12,
        rowSpan: 8,
      },
    ],
  },
  {
    id: 'hear',
    nameKey: 'studyTemplateHearTitle',
    descKey: 'studyTemplateHearDesc',
    badgeKey: 'studyTemplateHearBadge',
    iconName: 'Flame',
    isPopular: false,
    cells: [
      {
        titleKey: 'studyHearContent',
        placeholderKey: 'studyHearPlaceholder',
        defaultContent: `## 🔥 H.E.A.R. -menetelmä\n\n* **H (Highlight):** Korosta jae tai katkelma.\n* **E (Explain):** Selitä omin sanoin, mitä jae merkitsee.\n* **A (Apply):** Sovella konkreettisesti arkeen.\n* **R (Respond):** Vastaa rukouksella ja toiminnalla.\n\n**Muistiinpanot:**\n\n`,
        colSpan: 12,
        rowSpan: 8,
      },
    ],
  },
  {
    id: 'word_topical',
    nameKey: 'studyTemplateWordTopicalTitle',
    descKey: 'studyTemplateWordTopicalDesc',
    badgeKey: 'studyTemplateWordTopicalBadge',
    iconName: 'Layers',
    isPopular: false,
    cells: [
      {
        titleKey: 'studyWordTopicalContent',
        placeholderKey: 'studyWordTopicalPlaceholder',
        defaultContent: `## 🔬 Sana- ja teematutkimus\n\n* **Tutkittava sana / teema:** \n* **Esiintymät Raamatussa:**\n* **Alkukielen merkitys (heprea/kreikka):**\n* **Teologiset johtopäätökset:**\n\n**Tutkimustulokset:**\n\n`,
        colSpan: 12,
        rowSpan: 8,
      },
    ],
  },
];
