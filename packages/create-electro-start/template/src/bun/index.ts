import { startApp } from "electro-start/runtime";

const app = await startApp({
	window: {
		title: "__APP_NAME__",
		frame: {
			width: 900,
			height: 700,
			x: 200,
			y: 200,
		},
	},
	devServer: { port: 5173 },
});

console.log(`__APP_NAME__ running (${app.url})`);
