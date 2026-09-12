import "@mantine/core/styles.css";
import "./theme.css";
import { createTheme, MantineProvider } from "@mantine/core";
import { createRoot } from "react-dom/client";
import { App } from "./App/App.js";

const theme = createTheme({
  primaryColor: "teal",
  defaultRadius: "md",
  fontFamily: 'Inter, "Segoe UI", sans-serif',
  headings: { fontFamily: 'Inter, "Segoe UI", sans-serif' },
});
const root = document.getElementById("root");
if (!root) throw new Error("Missing application root.");
createRoot(root).render(
  <MantineProvider theme={theme} defaultColorScheme="dark">
    <App />
  </MantineProvider>,
);
