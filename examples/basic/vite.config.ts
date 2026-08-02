import { resolve } from "node:path";
import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { electroStart } from "@electro-start/vite-plugin";

export default defineConfig({
	plugins: [
		electroStart({ root: "src/actions" }),
		tanstackRouter({
			target: "react",
			autoCodeSplitting: true,
			routesDirectory: "./app",
			generatedRouteTree: "./routeTree.gen.ts",
		}),
		react(),
	] as PluginOption[],
	root: "src",
	resolve: {
		alias: {
			"@": resolve(process.cwd(), "src"),
		},
	},
	build: {
		outDir: "../dist",
		emptyOutDir: true,
	},
	server: {
		port: 5173,
		strictPort: true,
	},
});
