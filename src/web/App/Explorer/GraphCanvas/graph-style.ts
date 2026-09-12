import type { StylesheetJson } from "cytoscape";
/** Maps shared CSS theme tokens into the canvas renderer's required stylesheet API. */
export function graphStyles(element: HTMLElement): StylesheetJson {
  const tokens = getComputedStyle(element);
  const text = tokens.getPropertyValue("--text").trim();
  const panel = tokens.getPropertyValue("--panel").trim();
  return [
    {
      selector: "node",
      style: {
        label: "data(label)",
        "font-size": 18,
        color: text,
        "text-valign": "center",
        "text-margin-y": 0,
        "text-outline-color": panel,
        "text-outline-width": 0,
        "text-max-width": "155px",
        "text-wrap": "ellipsis",
        width: 175,
        height: 50,
        shape: "round-rectangle",
        "z-index": 10,
        "background-color": "#829dc6",
        "border-width": 3,
        "border-color": panel,
      },
    },
    {
      selector: 'node[kind = "person"]',
      style: {
        shape: "ellipse",
        width: 64,
        height: 64,
        color: text,
        "font-weight": 600,
        "text-valign": "bottom",
        "text-margin-y": 16,
        "text-wrap": "none",
        "text-background-color": panel,
        "text-background-opacity": 0.7,
        "text-background-shape": "roundrectangle",
        "text-background-padding": "6px",
        "background-color": "#829dc6",
        "background-fit": "cover",
        "background-clip": "node",
      },
    },
    {
      selector: 'node[kind = "person"][avatarUrl]',
      style: {
        "background-image": "data(avatarUrl)",
        "background-width": "64px",
        "background-height": "64px",
        "background-position-x": "50%",
        "background-position-y": "50%",
      },
    },
    {
      selector: 'node[kind = "group"]',
      style: {
        label: "data(count)",
        shape: "ellipse",
        width: "data(nodeSize)",
        height: "data(nodeSize)",
        "z-index": 1,
        color: "#ffffff",
        "text-outline-color": "#102d28",
        "text-outline-width": 1,
        "background-color": "#2b7569",
        "background-fit": "cover",
        "background-clip": "node",
        "border-color": "data(temperatureColor)",
        "border-width": 4,
        "font-weight": 600,
        "font-size": 11,
      },
    },
    {
      selector: 'node[kind = "group"][avatarUrl]',
      style: {
        "background-image": "data(avatarUrl)",
        "background-position-x": "50%",
        "background-position-y": "50%",
      },
    },
    {
      selector: "edge",
      style: {
        width: 1.2,
        "line-color": "#547081",
        opacity: 0.35,
        "curve-style": "bezier",
      },
    },
    { selector: ".dimmed", style: { opacity: 0.08 } },
    {
      selector: ".highlighted",
      style: { opacity: 1, "border-width": 4 },
    },
    {
      selector: 'node[kind = "person"].highlighted',
      style: { "border-color": "#f4ce82" },
    },
    {
      selector: 'node[kind = "group"].highlighted',
      style: { "border-width": 6 },
    },
    {
      selector: "edge.highlighted",
      style: { "line-color": "#70d6bd", width: 2, opacity: 0.9 },
    },
    {
      selector: 'node[kind = "group"].hovered, node[kind = "group"].focused',
      style: {
        width: "data(hoverSize)",
        height: "data(hoverSize)",
        label: "data(label)",
        color: text,
        "text-outline-width": 0,
        "text-valign": "bottom",
        "text-margin-y": 12,
        "text-wrap": "wrap",
        "text-max-width": "240px",
        "text-background-color": panel,
        "text-background-opacity": 1,
        "text-background-padding": "6px",
        "font-size": 20,
        "z-index": 20,
        opacity: 1,
      },
    },
  ];
}
