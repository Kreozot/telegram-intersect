import bigInt from "big-integer";
import { Api, TelegramClient } from "teleproto";
import { UpdateManager } from "teleproto/client/updates/manager.js";
import { Logger, LogLevel } from "teleproto/extensions/Logger.js";
import { StringSession } from "teleproto/sessions/index.js";

/** Prevents the SDK session cache from copying raw entities or message-derived data. */
class AuthorizationSession extends StringSession {
  /** Ignores entity caching because the application persists a narrower field allowlist. */
  override processEntities(): void {}
}

/** Disables SDK background message synchronization while preserving transport keepalive. */
class MetadataUpdates extends UpdateManager {
  /** Keeps unsolicited updates out of the manager's queues. */
  override start(): void {}
  /** Prevents initialization of an update subscription on connect. */
  override async ensureState(): Promise<void> {}
  /** Prevents automatic difference/history recovery after idle or reconnect. */
  override async catchUp(): Promise<void> {}
  /** Prevents the keepalive loop from fetching missed updates. */
  override async recoverIfStale(): Promise<void> {}
  /** Drops any incidental pushed updates immediately, without dispatch or storage. */
  override onUpdates(): void {}
}

const allowed = new Set([
  "auth.SendCode",
  "auth.ResendCode",
  "auth.SignIn",
  "auth.CheckPassword",
  "auth.ExportLoginToken",
  "auth.ImportLoginToken",
  "auth.LogOut",
  "account.GetPassword",
  "users.GetUsers",
  "contacts.GetContacts",
  "messages.GetDialogs",
  "messages.GetCommonChats",
  "help.GetConfig",
  "auth.ExportAuthorization",
  "auth.ImportAuthorization",
]);

/** Rejects requests outside the minimal metadata/auth API surface before they reach Telegram. */
export function assertAllowedRequest(request: Api.AnyRequest): void {
  if (!allowed.has(request.className))
    throw new Error("This Telegram operation is disabled by the metadata-only policy.");
}

/** Encapsulates the SDK with a request allowlist, no update recovery, and no entity persistence. */
export class PrivacyClient extends TelegramClient {
  /** Downloads one bounded small profile thumbnail without opening generic media access. */
  downloadProfileThumbnail(
    userId: string,
    accessHash: string,
    photoId: string,
    dcId: number,
    limit: number,
  ): Promise<Api.upload.TypeFile> {
    const request = new Api.upload.GetFile({
      location: new Api.InputPeerPhotoFileLocation({
        peer: new Api.InputPeerUser({
          userId: bigInt(userId),
          accessHash: bigInt(accessHash),
        }),
        photoId: bigInt(photoId),
        big: false,
      }),
      offset: bigInt.zero,
      limit,
    });
    return super.invoke(
      new Api.InvokeWithoutUpdates({ query: request }),
      dcId,
    ) as Promise<Api.upload.TypeFile>;
  }
  /** Checks authorization without the SDK's default update-state subscription, including during DC migration. */
  override async isUserAuthorized(): Promise<boolean> {
    try {
      await this.invoke(new Api.users.GetUsers({ id: [new Api.InputUserSelf()] }));
      return true;
    } catch {
      return false;
    }
  }
  /** Constructs the pinned SDK using only authorization storage and silent protocol logging. */
  constructor(session: string, apiId: number, apiHash: string) {
    super(new AuthorizationSession(session), apiId, apiHash, {
      baseLogger: new Logger(LogLevel.NONE),
      entityCache: false,
      connectionRetries: 2,
      requestRetries: 2,
      reconnectRetries: 2,
      timeout: 15,
      floodSleepThreshold: 0,
      deviceModel: "Telegram Intersect",
      appVersion: "0.1.0",
    });
    this.updateManager = new MetadataUpdates(this);
  }
  /** Wraps every application/SDK RPC in invokeWithoutUpdates after checking the allowlist. */
  override invoke<R extends Api.AnyRequest>(request: R, dcId?: number): Promise<R["__response"]> {
    assertAllowedRequest(request);
    return super.invoke(new Api.InvokeWithoutUpdates({ query: request }), dcId) as Promise<
      R["__response"]
    >;
  }
}
