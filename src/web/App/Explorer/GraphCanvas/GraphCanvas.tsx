import { Button, useMantineColorScheme } from "@mantine/core";
import cytoscape, { type Core, type Layouts } from "cytoscape";
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
  const layout = useRef<Layouts | null>(null);
  const layoutFrame = useRef<number | null>(null);
  const { colorScheme } = useMantineColorScheme();
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const cy = cytoscape({
      container: element,
      elements: [],
      style: graphStyles(element),
      layout: { name: "preset" },
      minZoom: 0.03,
      maxZoom: 3,
    });
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
      if (layoutFrame.current !== null) cancelAnimationFrame(layoutFrame.current);
      layout.current?.stop();
      cy.destroy();
      instance.current = null;
    };
  }, [onFocus]);
  useEffect(() => {
    const cy = instance.current;
    if (!cy) return;
    if (layoutFrame.current !== null) cancelAnimationFrame(layoutFrame.current);
    layout.current?.stop();
    const coloredNodes = addGroupTemperatureColors(graph.nodes);
    const nextIds = new Set([
      ...coloredNodes.map((node) => node.id),
      ...graph.edges.map((edge) => edge.id),
    ]);
    cy.batch(() => {
      cy.elements()
        .filter((element) => !nextIds.has(element.id()))
        .remove();
      for (const node of coloredNodes) {
        const existing = cy.getElementById(node.id);
        if (existing.length) existing.data(node);
        else cy.add({ group: "nodes", data: node });
      }
      for (const edge of graph.edges) {
        const existing = cy.getElementById(edge.id);
        if (existing.length) existing.data(edge);
        else cy.add({ group: "edges", data: edge });
      }
    });
    layoutFrame.current = requestAnimationFrame(() => {
      layoutFrame.current = null;
      if (cy.destroyed()) return;
      const nextLayout = cy.layout({
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
      });
      layout.current = nextLayout;
      nextLayout.run();
      if (layout.current !== nextLayout || cy.destroyed()) return;
      separateNodes(cy);
      cy.fit(undefined, 45);
      layout.current = null;
    });
    return () => {
      if (layoutFrame.current !== null) {
        cancelAnimationFrame(layoutFrame.current);
        layoutFrame.current = null;
      }
      layout.current?.stop();
      layout.current = null;
    };
  }, [graph]);
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
  }, [focus, graph]);
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
