import { Button, useMantineColorScheme } from "@mantine/core";
import cytoscape, { type Core } from "cytoscape";
import { useEffect, useRef } from "react";
import type { GraphData } from "../../../../shared/contracts.js";
import styles from "./GraphCanvas.module.css";
import { graphStyles } from "./graph-style.js";
import { addGroupTemperatureColors } from "./group-temperature.js";
import { separateNodes } from "./separate-nodes.js";

interface Props {
  graph: GraphData;
  focus: string | null;
  onFocus: (id: string | null) => void;
  viewportRevision?: number;
}
/** Owns the Cytoscape lifecycle, resize handling, and focus bridge; data derivation remains pure and separate. */
export function GraphCanvas({ graph, focus, onFocus, viewportRevision = 0 }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const instance = useRef<Core | null>(null);
  const { colorScheme } = useMantineColorScheme();
  const serialized = JSON.stringify(graph);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const data = JSON.parse(serialized) as GraphData;
    const cy = cytoscape({
      container: element,
      elements: [
        ...addGroupTemperatureColors(data.nodes).map((node) => ({ data: node })),
        ...data.edges.map((edge) => ({ data: edge })),
      ],
      style: graphStyles(element),
      layout: {
        name: "cose",
        animate: false,
        randomize: false,
        padding: 45,
        nodeDimensionsIncludeLabels: true,
        nodeRepulsion: (node) => (node.data("kind") === "person" ? 1200000 : 18000),
        nodeOverlap: 40,
        idealEdgeLength: () => 100,
        gravity: 0.8,
        numIter: 1500,
      },
      minZoom: 0.03,
      maxZoom: 3,
    });
    separateNodes(cy);
    cy.fit(undefined, 45);
    instance.current = cy;
    cy.on("tap", "node", (event) => onFocus(String(event.target.id())));
    cy.on("mouseover", "node", (event) => event.target.addClass("hovered"));
    cy.on("mouseout", "node", (event) => event.target.removeClass("hovered"));
    cy.on("tap", (event) => {
      if (event.target === cy) onFocus(null);
    });
    const observer = new ResizeObserver(() => cy.resize());
    observer.observe(element);
    return () => {
      observer.disconnect();
      cy.destroy();
      instance.current = null;
    };
  }, [serialized, onFocus]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Theme changes update CSS tokens consumed imperatively by Cytoscape.
  useEffect(() => {
    const element = container.current;
    if (element) instance.current?.style(graphStyles(element));
  }, [colorScheme]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Reapply focus whenever the effect above replaces the Cytoscape instance.
  useEffect(() => {
    const cy = instance.current;
    if (!cy) return;
    cy.elements().removeClass("dimmed highlighted focused");
    if (focus && cy.getElementById(focus).length) {
      const active = cy.getElementById(focus).closedNeighborhood();
      cy.elements().not(active).addClass("dimmed");
      active.addClass("highlighted");
      cy.getElementById(focus).addClass("focused");
    }
  }, [focus, serialized]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: The revision explicitly signals a completed container transition.
  useEffect(() => {
    const cy = instance.current;
    if (!cy) return;
    cy.resize();
    cy.fit(undefined, 60);
  }, [viewportRevision]);
  /** Fits the current network within the viewport after user pan or zoom. */
  function fit(): void {
    instance.current?.fit(undefined, 60);
  }
  return (
    <>
      <div
        className={styles.graph}
        ref={container}
        role="img"
        aria-label={`Community graph with ${graph.nodes.length} nodes. Use the communities panel to inspect connections with a keyboard.`}
      />
      <div className={styles.controls}>
        <Button
          size="compact-xs"
          variant="default"
          onClick={() => instance.current?.zoom((instance.current?.zoom() ?? 1) * 1.2)}
          aria-label="Zoom in"
        >
          +
        </Button>
        <Button
          size="compact-xs"
          variant="default"
          onClick={() => instance.current?.zoom((instance.current?.zoom() ?? 1) / 1.2)}
          aria-label="Zoom out"
        >
          −
        </Button>
        <Button size="compact-xs" variant="default" onClick={fit}>
          Fit map
        </Button>
      </div>
    </>
  );
}
