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
        "font-size": 10,
        color: text,
        "text-valign": "bottom",
        "text-margin-y": 10,
        "text-outline-color": panel,
        "text-outline-width": 2,
        "text-max-width": "105px",
        "text-wrap": "wrap",
        width: 25,
        height: 25,
        "background-color": "#829dc6",
        "border-width": 3,
        "border-color": panel,
      },
    },
    {
      selector: 'node[kind = "group"]',
      style: {
        width: "mapData(count, 0, 20, 35, 75)",
        height: "mapData(count, 0, 20, 35, 75)",
        "background-color": "#52c8ab",
        "border-color": "#2b7569",
        "border-width": 4,
        "font-weight": 600,
        "font-size": 11,
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
    { selector: ".dimmed", style: { opacity: 0.15 } },
    {
      selector: ".highlighted",
      style: { opacity: 1, "border-color": "#f4ce82", "border-width": 4 },
    },
    {
      selector: "edge.highlighted",
      style: { "line-color": "#70d6bd", width: 2, opacity: 0.9 },
    },
  ];
}
