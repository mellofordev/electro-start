import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
	RouterProvider,
	createHashHistory,
	createRouter,
} from "@tanstack/react-router";
import { initElectroStart } from "electro-start/client";
import { routeTree } from "./routeTree.gen";
import "./index.css";

initElectroStart();

const router = createRouter({
	routeTree,
	history: createHashHistory(),
	defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<RouterProvider router={router} />
	</StrictMode>,
);
