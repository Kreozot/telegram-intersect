import styles from "./DetailsInsight.module.css";

/** Explains the limited meaning of observed Telegram community connections. */
export function DetailsInsight() {
  return (
    <div className={styles.insight}>
      <span className={styles.icon}>↗</span>
      <strong className={styles.title}>Shared spaces, not assumptions.</strong>
      <p className={styles.text}>
        A connection means a shared group. It does not mean two people know each other. Counts cover
        selected people, not total group membership.
      </p>
    </div>
  );
}
