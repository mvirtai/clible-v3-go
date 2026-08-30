declare const process: any;
import { defineConfig } from "vitepress";

export default defineConfig({
  title: "clible-v3",
  description:
    "Modern, web-native Bible study, text analytics, and 2D canvas research platform.",
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
  },

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

    socialLinks: [{ icon: "github", link: "https://github.com/mvirtai/clible-v3-go" }],

    editLink: {
      pattern: "https://github.com/mvirtai/clible-v3-go/edit/main/docs/:path",
      text: "Edit this page on GitHub",
    },

    footer: {
      message: "See NOTICE.md for data sources and acknowledgements.",
      copyright: "© 2026–present Valtteri",
    },

    search: {
      provider: "local",
    },
  },
});
