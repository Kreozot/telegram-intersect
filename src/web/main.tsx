import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./theme.css";
import { createTheme, MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
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
    <Notifications position="bottom-right" autoClose={4000} limit={3} />
    <App />
  </MantineProvider>,
);
