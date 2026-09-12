import type { GraphNode } from "../../../../shared/contracts.js";

interface RenderGraphNode extends GraphNode {
  hoverSize: number;
  nodeSize: number;
  temperatureColor: string;
}

const minimumGroupSize = 24;
const maximumGroupSize = 46;
const maximumScaledCount = 10;
const hoverScale = 1.12;

/** Derives a bounded community marker size and its proportional hover enlargement. */
function getGroupSizes(count: number): Pick<RenderGraphNode, "hoverSize" | "nodeSize"> {
  const boundedCount = Math.min(Math.max(count, 1), maximumScaledCount);
  const ratio = (boundedCount - 1) / (maximumScaledCount - 1);
  const nodeSize = minimumGroupSize + ratio * (maximumGroupSize - minimumGroupSize);
  return { nodeSize, hoverSize: nodeSize * hoverScale };
}

/**
 * Maps an observed community count onto a cool-to-warm spectrum.
 * The selected-person count is the natural ceiling because a community cannot connect more
 * selected people than are present on the map.
 */
export function getGroupTemperatureColor(count: number, selectedPeople: number): string {
  const maximum = Math.max(selectedPeople, 1);
  const ratio = maximum === 1 ? 0 : (Math.min(Math.max(count, 1), maximum) - 1) / (maximum - 1);
  const hue = Math.round(220 * (1 - ratio));
  return `hsl(${hue}, 72%, 58%)`;
}

/** Adds renderer-only temperature colors without expanding the shared graph contract. */
export function addGroupTemperatureColors(nodes: readonly GraphNode[]): RenderGraphNode[] {
  const selectedPeople = nodes.filter((node) => node.kind === "person").length;
  return nodes.map((node) => {
    const sizes =
      node.kind === "group" ? getGroupSizes(node.count) : { nodeSize: 64, hoverSize: 64 };
    return {
      ...node,
      ...sizes,
      temperatureColor:
        node.kind === "group"
          ? getGroupTemperatureColor(node.count, selectedPeople)
          : "hsl(217, 36%, 64%)",
    };
  });
}
