export type PersonSource = "contacts" | "dialogs";
export type MapMode = "people" | "communities";
export interface Person {
  id: string;
  name: string;
  username: string | null;
  sources: PersonSource[];
  dialogOrder?: number;
  avatarUrl?: string;
}
export interface Group {
  id: string;
  title: string;
  avatarUrl?: string;
}
export type ScanStatus = "queued" | "scanning" | "waiting" | "completed" | "failed" | "cancelled";
export interface PersonScan {
  personId: string;
  status: ScanStatus;
  groups: Group[];
  cursor: string;
  error: string | null;
  retryAt: number | null;
  observedAt: string | null;
}
export interface Scan {
  id: string;
  createdAt: string;
  running: boolean;
  people: PersonScan[];
}
export interface Snapshot {
  people: Person[];
  scan: Scan | null;
  avatarLoading: boolean;
}
export type WorkspaceEvent =
  | { type: "resync" }
  | { type: "scan-person"; scanId: string; createdAt: string; person: PersonScan }
  | { type: "scan-state"; scanId: string; createdAt: string; running: boolean }
  | { type: "avatar"; entityId: string; avatarUrl: string }
  | { type: "avatar-state"; running: boolean };
export type LoginStage =
  | "idle"
  | "connecting"
  | "phone"
  | "code"
  | "password"
  | "qr"
  | "authorized"
  | "error";
export interface TelegramStatus {
  stage: LoginStage;
  qr: string | null;
  error: string | null;
  configured: boolean;
}
export interface AppStatus {
  authenticated: boolean;
  accessMode: "local" | "key";
  maxSelectedPeople: number;
}
export interface GraphNode {
  id: string;
  label: string;
  kind: "person" | "group";
  count: number;
  avatarUrl?: string;
}
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
}
export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
