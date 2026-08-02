import type { ElectrobunConfig } from "electrobun";
import { electroStartBun } from "electro-start/bun-plugin";

export default {
	app: {
		name: "__APP_NAME__",
		identifier: "__APP_IDENTIFIER__",
		version: "0.0.1",
	},
	build: {
		bun: {
			plugins: [electroStartBun()],
		},
		copy: {
			"dist/index.html": "views/mainview/index.html",
			"dist/assets": "views/mainview/assets",
		},
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
