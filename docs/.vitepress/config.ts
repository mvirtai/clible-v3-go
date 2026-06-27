declare const process: any;
import { defineConfig } from "vitepress";

export default defineConfig({
  title: "clible-v3",
  description:
    "Modern, high-performance, offline-first Bible study platform.",
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
          text: "Guide",
          items: [
            { text: "Getting started", link: "/guide/getting-started" },
            { text: "Import & seeding", link: "/guide/import-and-seeding" },
          ],
        },
      ],
      "/architecture/": [
        {
          text: "Architecture",
          items: [
            { text: "Overview & Layers", link: "/architecture/overview" },
            { text: "Database & FTS5", link: "/architecture/database" },
          ],
        },
      ],
      "/api/": [
        {
          text: "Web API",
          items: [{ text: "Reference", link: "/api/reference" }],
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
