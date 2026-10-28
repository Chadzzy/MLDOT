import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";
import "./reference.css";
import "./polish.css";
import "./native.css";
import { NATIVE_MODE } from "./native-simulation.js";
if (NATIVE_MODE) {
  document.documentElement.classList.add("native-host");
  const resize = () => {
    const scale = window.innerWidth / 375;
    document.documentElement.style.setProperty("--native-scale", scale);
    document.documentElement.style.setProperty(
      "--native-height",
      `${window.innerHeight / scale}px`,
    );
  };
  resize();
  window.addEventListener("resize", resize);
}
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
