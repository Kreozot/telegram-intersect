import { Button, useMantineColorScheme } from "@mantine/core";
import cytoscape, { type Core } from "cytoscape";
import { useEffect, useRef } from "react";
import type { GraphData } from "../../../../shared/contracts.js";
import styles from "./GraphCanvas.module.css";
import { graphStyles } from "./graph-style.js";

interface Props {
  graph: GraphData;
  focus: string | null;
  onFocus: (id: string | null) => void;
}
/** Owns the Cytoscape lifecycle, resize handling, and focus bridge; data derivation remains pure and separate. */
export function GraphCanvas({ graph, focus, onFocus }: Props) {
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
        ...data.nodes.map((node) => ({ data: node })),
        ...data.edges.map((edge) => ({ data: edge })),
      ],
      style: graphStyles(element),
      layout: {
        name: "cose",
        animate: false,
        randomize: false,
        padding: 60,
        nodeRepulsion: () => 9000,
        idealEdgeLength: () => 95,
      },
      minZoom: 0.2,
      maxZoom: 3,
    });
    instance.current = cy;
    cy.on("tap", "node", (event) => onFocus(String(event.target.id())));
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
    cy.elements().removeClass("dimmed highlighted");
    if (focus && cy.getElementById(focus).length) {
      const active = cy.getElementById(focus).closedNeighborhood();
      cy.elements().not(active).addClass("dimmed");
      active.addClass("highlighted");
    }
  }, [focus, serialized]);
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
