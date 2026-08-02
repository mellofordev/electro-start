import { startApp } from "electro-start/runtime";

const app = await startApp({
	window: {
		title: "Electro Start",
		frame: {
			width: 900,
			height: 700,
		},
	},
	devServer: { port: 5173 },
});

console.log(`Electro Start running (${app.url})`);
