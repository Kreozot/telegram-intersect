import type { Group } from "../../shared/contracts.js";
import type { StoredPerson } from "../storage/repository.js";
export interface GroupPage {
  groups: Group[];
  nextCursor: string | null;
}
export interface TelegramGateway {
  commonGroups(person: StoredPerson, cursor: string): Promise<GroupPage>;
}
/** Carries only a safe retry duration from the Telegram boundary to the scan scheduler. */
export class RateLimitError extends Error {
  /** Creates a bounded retry signal without copying protocol payloads. */
  constructor(public readonly seconds: number) {
    super("Telegram requested a pause.");
  }
}
