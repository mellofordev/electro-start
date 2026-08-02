import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { initElectroStart } from "electro-start/client";
import "./index.css";
import App from "./App";

initElectroStart();

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
