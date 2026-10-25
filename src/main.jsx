import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    // Resolve relative to the page URL so it works both in dev ("/") and on
    // GitHub Pages ("https://<user>.github.io/<repo>/").
    const swUrl = new URL("sw.js", document.baseURI);
    navigator.serviceWorker.register(swUrl).catch((error) => {
      console.warn("Service worker registration failed:", error);
    });
  });
}
