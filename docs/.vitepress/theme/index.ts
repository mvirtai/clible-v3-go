import DefaultTheme from "vitepress/theme";
import { onMounted, watch, nextTick } from "vue";
import { useRoute } from "vitepress";
import "./custom.css";

let mermaidInstance: any = null;

async function getMermaid() {
  if (typeof window === "undefined") return null;
  if (!mermaidInstance) {
    try {
      // @ts-ignore
      const module = await import("https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs");
      mermaidInstance = module.default;
    } catch (e) {
      console.warn("Failed to load Mermaid from CDN:", e);
      return null;
    }
  }
  return mermaidInstance;
}

async function renderMermaidDiagrams() {
  if (typeof window === "undefined") return;

  const mermaid = await getMermaid();
  if (!mermaid) return;

  const isDark = document.documentElement.classList.contains("dark");
  mermaid.initialize({
    startOnLoad: false,
    theme: isDark ? "dark" : "default",
    securityLevel: "loose",
    fontFamily: "var(--vp-font-family-base)",
    themeVariables: {
      fontSize: "15px",
      fontFamily: "var(--vp-font-family-base)",
      primaryColor: isDark ? "#2a2723" : "#fbf8f2",
      primaryTextColor: isDark ? "#f0ede6" : "#2c2825",
      primaryBorderColor: isDark ? "#d4af37" : "#b89628",
      lineColor: isDark ? "#e0dcd3" : "#4a453f",
      secondaryColor: isDark ? "#1e1c19" : "#f4efe6",
      tertiaryColor: isDark ? "#24221f" : "#eee8dc",
    },
    flowchart: {
      useMaxWidth: false,
      htmlLabels: true,
      curve: "basis",
      nodeSpacing: 45,
      rankSpacing: 45,
    },
    sequence: {
      useMaxWidth: false,
      showSequenceNumbers: true,
      actorFontSize: 15,
      actorFontFamily: "var(--vp-font-family-base)",
      messageFontSize: 14,
      messageFontFamily: "var(--vp-font-family-base)",
      wrap: true,
      mirrorActors: false,
    },
    er: {
      useMaxWidth: false,
      fontSize: 14,
    },
  });

  const mermaidBlocks = document.querySelectorAll(".language-mermaid:not(.mermaid-rendered)");

  mermaidBlocks.forEach(async (block, index) => {
    try {
      const codeElement = block.querySelector("code");
      const rawCode = codeElement ? codeElement.innerText : (block as HTMLElement).innerText;
      if (!rawCode || !rawCode.trim()) return;

      const id = `mermaid-svg-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`;
      const { svg } = await mermaid.render(id, rawCode.trim());

      const wrapper = document.createElement("div");
      wrapper.className = "mermaid-wrapper";
      wrapper.innerHTML = svg;

      // Remove existing wrappers if any
      const oldWrapper = block.querySelector(".mermaid-wrapper");
      if (oldWrapper) oldWrapper.remove();

      block.appendChild(wrapper);
      block.classList.add("mermaid-rendered");
    } catch (err) {
      console.error("Mermaid render error for block:", err);
    }
  });
}

export default {
  extends: DefaultTheme,
  setup() {
    const route = useRoute();

    onMounted(() => {
      renderMermaidDiagrams();

      // Theme toggle observer
      const observer = new MutationObserver(() => {
        document.querySelectorAll(".language-mermaid.mermaid-rendered").forEach((el) => {
          el.classList.remove("mermaid-rendered");
          const existingWrapper = el.querySelector(".mermaid-wrapper");
          if (existingWrapper) existingWrapper.remove();
        });
        renderMermaidDiagrams();
      });

      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });
    });

    watch(
      () => route.path,
      () => {
        nextTick(() => {
          renderMermaidDiagrams();
        });
      }
    );
  },
};
