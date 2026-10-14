import React from "react";
import ReactDOM from "react-dom/client";
import "@glideapps/glide-data-grid/dist/index.css";
import "./index.css";
import { App } from "./App";

const root = document.getElementById("root");
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
