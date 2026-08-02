import type { ElectrobunConfig } from "electrobun";
import { electroStartBun } from "../../packages/electro-start/src/bun-plugin.ts";

export default {
	app: {
		name: "electro-start-example",
		identifier: "example.electrostart.dev",
		version: "0.0.1",
	},
	build: {
		bun: {
			plugins: [electroStartBun()],
		},
		// Vite builds to dist/, we copy from there
		copy: {
			"dist/index.html": "views/mainview/index.html",
			"dist/assets": "views/mainview/assets",
		},
		// Ignore Vite output in watch mode — HMR handles view rebuilds separately
		watchIgnore: ["dist/**"],
		mac: {
			bundleCEF: false,
		},
		linux: {
			bundleCEF: false,
		},
		win: {
			bundleCEF: false,
		},
	},
} satisfies ElectrobunConfig;
