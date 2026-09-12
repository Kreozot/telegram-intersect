import { Button, Progress } from "@mantine/core";
import type { GraphData, Scan } from "../../../shared/contracts.js";
import { LogoMark } from "../LogoMark/LogoMark.js";
import styles from "./Explorer.module.css";
import { GraphCanvas } from "./GraphCanvas/GraphCanvas.js";
import { GraphFilter } from "./GraphFilter/GraphFilter.js";

interface Props {
  graph: GraphData;
  visibleGraph: GraphData;
  intersectionsOnly: boolean;
  onIntersectionsChange: (enabled: boolean) => void;
  focus: string | null;
  onFocus: (id: string | null) => void;
  demo: boolean;
  scan: Scan | null;
}
/** Frames the graph with coverage metrics and scan progress rather than claiming complete membership knowledge. */
export function Explorer({
  graph,
  visibleGraph,
  intersectionsOnly,
  onIntersectionsChange,
  focus,
  onFocus,
  demo,
  scan,
}: Props) {
  const people = graph.nodes.filter((node) => node.kind === "person").length;
  const groups = graph.nodes.length - people;
  const selectedResults = graph.nodes
    .filter((node) => node.kind === "person")
    .map((node) => scan?.people.find((person) => person.personId === node.id));
  const unscanned = selectedResults.filter((result) => !result).length;
  const selectionComplete =
    people > 0 && selectedResults.every((result) => result?.status === "completed");
  const completed = selectedResults.filter((person) => person?.status === "completed").length;
  const waiting = selectedResults.find((person) => person?.status === "waiting");
  return (
    <section className={styles.explorer}>
      <div className={styles.heading}>
        <div>
          <h1 className={styles.headingTitle}>Your shared communities</h1>
        </div>
        <span className={styles.badge}>{demo ? "SAMPLE MAP" : "PERSON ↔ GROUP"}</span>
      </div>
      <div className={styles.metrics}>
        <div className={styles.metric}>
          <strong className={styles.metricValue}>{people}</strong>
          <span className={styles.metricLabel}>People on map</span>
        </div>
        <div className={styles.metric}>
          <strong className={styles.metricValue}>
            {groups || selectionComplete ? groups : "—"}
          </strong>
          <span className={styles.metricLabel}>Shared communities</span>
        </div>
        <div className={styles.metric}>
          <strong className={styles.metricValue}>
            {graph.edges.length || selectionComplete ? graph.edges.length : "—"}
          </strong>
          <span className={styles.metricLabel}>Observed connections</span>
        </div>
      </div>
      {unscanned > 0 && (
        <p className={styles.scanHint} role="status">
          {unscanned} selected {unscanned === 1 ? "person has" : "people have"} not been scanned.
          {scan?.running
            ? " The background queue will include the new selection."
            : " The background scan is being queued."}
        </p>
      )}
      {scan && (
        <div className={styles.progress}>
          <span className={styles.progressSummary}>
            {scan.running
              ? waiting
                ? `Telegram pause · resumes after ${new Date(waiting.retryAt ?? 0).toLocaleTimeString()}`
                : "Discovering shared groups…"
              : completed < people
                ? "Partial map · some people are unfinished"
                : "Scan complete"}
            <b className={styles.progressValue}>
              {completed} / {people}
            </b>
          </span>
          <Progress size={3} color="teal" value={people ? (completed / people) * 100 : 0} />
        </div>
      )}
      <GraphFilter
        enabled={intersectionsOnly}
        disabled={people < 2}
        visible={visibleGraph.nodes.length - people}
        total={groups}
        onChange={onIntersectionsChange}
      />
      {groups > 0 && visibleGraph.nodes.length === people && (
        <p className={styles.scanHint}>
          No observed groups connect two selected people. Turn off Only intersections to see all
          groups.
        </p>
      )}
      <div className={styles.canvas}>
        <GraphCanvas graph={visibleGraph} focus={focus} onFocus={onFocus} />
        <div className={styles.legend}>
          <span className={styles.personDot} />
          People
          <span className={styles.temperatureScale} />
          Communities · cool = fewer, warm = more · number = selected people
        </div>
        {!people && (
          <div className={styles.empty}>
            <LogoMark className={styles.emptyIcon} />
            <h2 className={styles.emptyTitle}>Every connection has a context.</h2>
            <p className={styles.emptyText}>
              Select people to discover shared groups in the background.
              <br />
              Your map will grow here, one connection at a time.
            </p>
          </div>
        )}
      </div>
      <div className={styles.caption}>
        <span>Hover for names · Select for connections · Scroll to zoom</span>
        {focus && (
          <Button size="compact-xs" variant="subtle" onClick={() => onFocus(null)}>
            Clear focus
          </Button>
        )}
      </div>
    </section>
  );
}
