import { startApp } from "electro-start/runtime";

const app = await startApp({
	window: {
		title: "Electro Start",
		// Linear/Notion-style chrome: content draws under a transparent titlebar
		// with inset traffic lights (no solid system title bar).
		titleBarStyle: "hiddenInset",
		// Align traffic lights to the left edge of the sidebar (Linear-style)
		trafficLightOffset: { x: 0, y: 14 },
		frame: {
			width: 1100,
			height: 720,
		},
	},
	devServer: { port: 5173 },
});

console.log(`Electro Start running (${app.url})`);
