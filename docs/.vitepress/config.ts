declare const process: any;
import { defineConfig } from "vitepress";
import { islaLanguage } from "./isla-grammar";

export default defineConfig({
  title: "clible-v3",
  description:
    "Web-native Bible study and textual research platform: ISLA v2 query language, 2D canvas research notebooks, full-text analytics, comparative translation matrices, and Google Gemini AI integration.",
  lang: "en-US",
  cleanUrls: true,
  lastUpdated: true,

  base: process.env.DOCS_BASE ?? "/clible-v3-go/",

  head: [
    ["link", { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" }],
    ["meta", { name: "theme-color", content: "#d4af37" }],
  ],

  markdown: {
    lineNumbers: true,
    languages: [islaLanguage as any],
    languageAlias: {
      env: "bash",
      ebnf: "markdown",
    },
  },

  locales: {
    root: {
      label: "English",
      lang: "en-US",
      description:
        "Web-native Bible study and textual research platform: ISLA v2 query language, 2D canvas research notebooks, full-text analytics, comparative translation matrices, and Google Gemini AI integration.",
      themeConfig: {
        siteTitle: "clible-v3 docs",
        nav: [
          { text: "Guide", link: "/guide/getting-started" },
          { text: "Architecture", link: "/architecture/overview" },
          { text: "API", link: "/api/reference" },
          {
            text: "Links",
            items: [
              { text: "GitHub", link: "https://github.com/mvirtai/clible-v3-go" },
            ],
          },
        ],
        sidebar: {
          "/guide/": [
            {
              text: "Platform & Exploration",
              items: [
                { text: "Overview & Quick Start", link: "/guide/getting-started" },
                { text: "Scripture Reader", link: "/guide/reader" },
                { text: "Liturgical Calendar", link: "/guide/liturgical-calendar" },
                { text: "Comparison & Diffing", link: "/guide/compare-and-diff" },
                { text: "Search & Text Analytics", link: "/guide/search-and-analytics" },
                { text: "Original Languages & Morphology", link: "/guide/original-languages" },
                { text: "Theological AI Tools", link: "/guide/ai-study-tools" },
              ],
            },
            {
              text: "Workspaces & Study Notebooks",
              items: [
                { text: "Workspaces & Scopes", link: "/guide/workspaces" },
                { text: "Notebooks & 2D Canvas", link: "/guide/notebooks" },
                { text: "ISLA Language Guide", link: "/guide/isla-guide" },
                { text: "Translations & Ingestion", link: "/guide/import-and-seeding" },
                { text: "Self-Hosting & Setup", link: "/guide/self-hosting" },
                { text: "Terms & Privacy", link: "/guide/terms-and-privacy" },
              ],
            },
          ],
          "/architecture/": [
            {
              text: "Architecture & Core Engines",
              items: [
                { text: "Overview & Layers", link: "/architecture/overview" },
                { text: "Database & Dual FTS", link: "/architecture/database" },
                { text: "ISLA Language Specification", link: "/architecture/isla-specification" },
              ],
            },
          ],
          "/api/": [
            {
              text: "Web REST API",
              items: [{ text: "API Reference", link: "/api/reference" }],
            },
          ],
        },
        editLink: {
          pattern: "https://github.com/mvirtai/clible-v3-go/edit/main/docs/:path",
          text: "Edit this page on GitHub",
        },
        footer: {
          message: "See NOTICE.md for data sources and acknowledgements.",
          copyright: "© 2026–present Valtteri",
        },
      },
    },
    fi: {
      label: "Suomi",
      lang: "fi-FI",
      link: "/fi/",
      description:
        "Web-natiivi Raamatuntutkimuksen ja tekstianalytiikan alusta: ISLA v2 -kyselykieli, 2D canvas -tutkimusvihkot, tekstianalytiikka, rinnakkaiskäännökset ja Google Gemini AI -integraatio.",
      themeConfig: {
        siteTitle: "clible-v3 dokumentaatio",
        nav: [
          { text: "Opas", link: "/fi/guide/getting-started" },
          { text: "Arkkitehtuuri", link: "/fi/architecture/overview" },
          { text: "API", link: "/api/reference" },
          {
            text: "Linkit",
            items: [
              { text: "GitHub", link: "https://github.com/mvirtai/clible-v3-go" },
            ],
          },
        ],
        sidebar: {
          "/fi/guide/": [
            {
              text: "Alusta ja tutkimustyökalut",
              items: [
                { text: "Yleiskatsaus ja pikaopas", link: "/fi/guide/getting-started" },
                { text: "Raamatun lukunäkymä", link: "/fi/guide/reader" },
                { text: "Kirkkovuosikalenteri", link: "/fi/guide/liturgical-calendar" },
                { text: "Käännösvertailu ja diff", link: "/fi/guide/compare-and-diff" },
                { text: "Haku ja tekstianalytiikka", link: "/fi/guide/search-and-analytics" },
                { text: "Alkukielet ja morfologia", link: "/fi/guide/original-languages" },
                { text: "Teologiset AI-työkalut", link: "/fi/guide/ai-study-tools" },
              ],
            },
            {
              text: "Työtilat ja tutkimusvihkot",
              items: [
                { text: "Työtilat ja skoopit", link: "/fi/guide/workspaces" },
                { text: "2D Canvas -tutkimusvihkot", link: "/fi/guide/notebooks" },
                { text: "ISLA-kieliopas", link: "/fi/guide/isla-guide" },
                { text: "Käännökset ja tuonti", link: "/fi/guide/import-and-seeding" },
                { text: "Itseisännöinti ja asennus", link: "/fi/guide/self-hosting" },
                { text: "Käyttöehdot ja tietosuoja", link: "/fi/guide/terms-and-privacy" },
              ],
            },
          ],
          "/fi/architecture/": [
            {
              text: "Arkkitehtuuri ja ydinmoottorit",
              items: [
                { text: "Yleiskatsaus ja kerrokset", link: "/fi/architecture/overview" },
                { text: "Tietokanta ja kaksois-FTS", link: "/fi/architecture/database" },
                { text: "ISLA-kielioppimäärittely", link: "/fi/architecture/isla-specification" },
              ],
            },
          ],
        },
        editLink: {
          pattern: "https://github.com/mvirtai/clible-v3-go/edit/main/docs/:path",
          text: "Muokkaa tätä sivua GitHubissa",
        },
        footer: {
          message: "Katso NOTICE.md datalähteitä ja tekijänoikeuksia varten.",
          copyright: "© 2026–nykyaika Valtteri",
        },
      },
    },
  },

  themeConfig: {
    socialLinks: [{ icon: "github", link: "https://github.com/mvirtai/clible-v3-go" }],

    search: {
      provider: "local",
      options: {
        locales: {
          fi: {
            translations: {
              button: {
                buttonText: "Hae dokumentaatiosta",
                buttonAriaLabel: "Hae dokumentaatiosta",
              },
              modal: {
                noResultsText: "Ei hakutuloksia haulle",
                resetButtonTitle: "Tyhjennä haku",
                footer: {
                  selectText: "valitse",
                  navigateText: "siirry",
                  closeText: "sulje",
                },
              },
            },
          },
        },
      },
    },
  },
});
