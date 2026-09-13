import { useCallback, useEffect, useRef, useState } from "react";

type FullscreenPhase = "idle" | "opening" | "open" | "closing";

interface FullscreenCanvas {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  className: string;
  expanded: boolean;
  toggle: () => void;
  viewportRevision: number;
}

const TRANSITION_DURATION_MS = 340;

/** Writes the source or destination rectangle used by the fullscreen FLIP transition. */
function setTransitionRectangle(element: HTMLElement, rectangle: DOMRect): void {
  element.style.setProperty("--canvas-top", `${rectangle.top}px`);
  element.style.setProperty("--canvas-left", `${rectangle.left}px`);
  element.style.setProperty("--canvas-width", `${rectangle.width}px`);
  element.style.setProperty("--canvas-height", `${rectangle.height}px`);
}

/**
 * Moves the explorer canvas between its layout slot and a viewport-fixed layer while preserving a
 * reversible animated path. The hook also owns Escape handling and document scroll locking.
 */
export function useFullscreenCanvas(
  slotRef: React.RefObject<HTMLDivElement | null>,
  styles: Readonly<Record<string, string>>,
): FullscreenCanvas {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<FullscreenPhase>("idle");
  const [viewportRevision, setViewportRevision] = useState(0);
  const expanded = phase !== "idle";

  /** Animates the fixed canvas back to the slot's current rectangle before restoring normal layout. */
  const collapse = useCallback((): void => {
    const slot = slotRef.current;
    const canvas = canvasRef.current;
    if (!slot || !canvas || !expanded || phase === "closing") return;
    setTransitionRectangle(canvas, slot.getBoundingClientRect());
    setPhase("closing");
  }, [expanded, phase, slotRef]);

  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
    /** Returns the canvas to its layout slot when the user presses Escape. */
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") collapse();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [collapse, expanded]);

  useEffect(() => {
    if (phase !== "opening") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getBoundingClientRect();
    const frame = requestAnimationFrame(() => setPhase("open"));
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  useEffect(() => {
    if (phase !== "open" && phase !== "closing") return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const delay = reducedMotion ? 0 : TRANSITION_DURATION_MS;
    const timer = window.setTimeout(() => {
      if (phase === "closing") setPhase("idle");
      setViewportRevision((revision) => revision + 1);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [phase]);

  /** Fixes the canvas at its current rectangle before animating it to the viewport edges. */
  function expand(): void {
    const slot = slotRef.current;
    const canvas = canvasRef.current;
    if (!slot || !canvas || expanded) return;
    setTransitionRectangle(canvas, slot.getBoundingClientRect());
    setPhase("opening");
  }

  /** Toggles the fullscreen canvas without exposing its transition phases to the view. */
  function toggle(): void {
    if (expanded) collapse();
    else expand();
  }

  const phaseClass =
    phase === "idle"
      ? ""
      : [
          styles.fullscreen ?? "",
          phase !== "opening" ? (styles.fullscreenTransition ?? "") : "",
          phase === "open" ? (styles.fullscreenOpen ?? "") : "",
        ].join(" ");
  return {
    canvasRef,
    className: `${styles.canvas ?? ""} ${phaseClass}`.trim(),
    expanded,
    toggle,
    viewportRevision,
  };
}
