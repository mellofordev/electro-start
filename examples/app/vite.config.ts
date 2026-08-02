import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { electroStart } from "@electro-start/vite-plugin";

export default defineConfig({
	plugins: [electroStart(), react()],
	root: "src/mainview",
	build: {
		outDir: "../../dist",
		emptyOutDir: true,
	},
	server: {
		port: 5173,
		strictPort: true,
	},
});
