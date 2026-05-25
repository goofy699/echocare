import { createRoot } from "react-dom/client";
import App from "./pages/App.tsx";
import "./index.css";
import "./i18n";



createRoot(document.getElementById("root")!).render(<App />);
