import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Served by the Daynize static site at /kecho/ (repo-root kecho/ folder).
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "VITE_");
    const apiBase = env.VITE_KECHO_API_BASE?.trim();
    if (mode === "production" && apiBase) {
        const url = new URL(apiBase);
        if (url.protocol !== "https:" || ["localhost", "127.0.0.1", "[::1]", "daynize.com", "www.daynize.com"].includes(url.hostname)) {
            throw new Error("Production API must use a public HTTPS origin, not localhost or the incorrect daynize.com domain.");
        }
        if (url.pathname !== "/" || url.search || url.hash || url.username || url.password) {
            throw new Error("VITE_KECHO_API_BASE must be an origin without a path, credentials or query.");
        }
    }
    return {
        base: "/kecho/",
        plugins: [react(), {
            name: "portal-verification",
            transformIndexHtml() {
                return [
                    ["google-site-verification", env.VITE_GOOGLE_SITE_VERIFICATION],
                    ["naver-site-verification", env.VITE_NAVER_SITE_VERIFICATION],
                ].filter(([, content]) => content?.trim()).map(([name, content]) => ({
                    tag: "meta",
                    attrs: { name, content: content.trim() },
                    injectTo: "head" as const,
                }));
            },
        }],
        build: {
            outDir: "../../kecho",
            emptyOutDir: true,
        },
        server: {
            port: 5173,
            proxy: { "/api": "http://127.0.0.1:8000" },
        },
    };
});
