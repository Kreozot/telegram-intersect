import { toDataURL } from "qrcode";
import { Api } from "teleproto";
import { FloodWaitError } from "teleproto/errors/index.js";
import type { LoginStage, TelegramStatus } from "../../shared/contracts.js";
import type { Config } from "../config.js";
import type { Repository } from "../storage/repository.js";
import { PrivacyClient } from "./privacy-client.js";

/** Manages only Telegram authorization and challenge lifecycle for one owner. */
export class TelegramService {
  private client: PrivacyClient | null = null;
  private status: TelegramStatus;
  private task: Promise<void> | null = null;
  private challenge: {
    resolve: (value: string) => void;
    reject: (error: Error) => void;
  } | null = null;
  private abort = new AbortController();
  private cooldown = 0;
  /** Initializes a disconnected adapter; startup never contacts Telegram without saved authorization. */
  constructor(
    private readonly config: Config,
    private readonly repo: Repository,
  ) {
    this.status = {
      stage: "idle",
      qr: null,
      error: null,
      configured: Boolean(config.apiId && config.apiHash),
    };
  }
  /** Returns a copy of the public login state, excluding session and challenge answers. */
  state(): TelegramStatus {
    return { ...this.status };
  }
  /** Restores an encrypted authorization session and checks only the current user's identity. */
  async restore(): Promise<void> {
    if (!this.status.configured || this.task) return;
    this.abort = new AbortController();
    this.task = this.restoreSession().finally(() => {
      this.task = null;
    });
    await this.task;
  }
  /** Contains saved-session failures and prevents cancelled restoration from authorizing the UI. */
  private async restoreSession(): Promise<void> {
    try {
      const saved = this.repo.session();
      if (!saved) return;
      this.status.stage = "connecting";
      this.client = this.makeClient(saved);
      await this.client.connect();
      await this.client.invoke(new Api.users.GetUsers({ id: [new Api.InputUserSelf()] }));
      if (this.abort.signal.aborted) throw new Error("AUTH_USER_CANCEL");
      this.status.stage = "authorized";
    } catch {
      this.status.stage = "error";
      this.status.error =
        "Saved session could not be restored. Check the connection or sign in again.";
      await this.client?.destroy();
      this.client = null;
    }
  }
  /** Starts an asynchronous challenge flow so HTTP requests never wait for user input. */
  start(mode: "phone" | "qr"): void {
    if (!this.status.configured) throw new Error("Configure Telegram API credentials first.");
    if (this.task || !["idle", "error"].includes(this.status.stage))
      throw new Error("A session or login is already active.");
    if (Date.now() < this.cooldown)
      throw new Error("Telegram requested a login pause. Retry later.");
    this.abort = new AbortController();
    this.status = {
      ...this.status,
      stage: "connecting",
      error: null,
      qr: null,
    };
    this.task = this.login(mode)
      .catch((error: unknown) => {
        this.recordLoginError(error);
        this.status = {
          ...this.status,
          stage: this.abort.signal.aborted ? "idle" : "error",
          qr: null,
          error: this.abort.signal.aborted
            ? null
            : (this.status.error ??
              "Sign-in failed. Check your code, connection, or try QR login."),
        };
      })
      .finally(() => {
        this.task = null;
      });
  }
  /** Delivers one in-memory challenge answer and immediately releases its pending reference. */
  answer(value: string): void {
    if (!this.challenge) throw new Error("No input is expected right now.");
    const challenge = this.challenge;
    this.challenge = null;
    this.status.stage = "connecting";
    challenge.resolve(value);
  }
  /** Cancels login input and destroys the unauthenticated connection. */
  async cancelLogin(): Promise<void> {
    this.abort.abort();
    this.challenge?.reject(new Error("AUTH_USER_CANCEL"));
    this.challenge = null;
    if (this.status.stage !== "authorized") await this.client?.destroy();
    await this.task;
    if (this.status.stage !== "authorized")
      this.status = { ...this.status, stage: "idle", qr: null, error: null };
  }
  /** Revokes this application's Telegram session before deleting its local account data. */
  async logout(): Promise<void> {
    if (this.status.stage === "authorized")
      await this.requireClient().invoke(new Api.auth.LogOut());
    await this.cancelLogin();
    await this.client?.destroy();
    this.client = null;
    this.repo.clearAll();
    this.status = { ...this.status, stage: "idle", qr: null, error: null };
  }
  /** Stops network resources at process shutdown without revoking the saved session. */
  async close(): Promise<void> {
    await this.cancelLogin();
    await this.client?.destroy();
  }
  /** Creates a privacy-constrained SDK instance used exclusively inside this adapter. */
  private makeClient(session: string): PrivacyClient {
    return new PrivacyClient(session, this.config.apiId, this.config.apiHash);
  }
  /** Rejects metadata operations unless a regular user session is authorized. */
  requireClient(): PrivacyClient {
    if (!this.client || this.status.stage !== "authorized")
      throw new Error("Sign in to Telegram first.");
    return this.client;
  }
  /** Awaits one challenge with a five-minute expiry and no persistent sensitive values. */
  private async ask(stage: LoginStage): Promise<string> {
    if (this.abort.signal.aborted) throw new Error("AUTH_USER_CANCEL");
    this.status.stage = stage;
    this.status.qr = null;
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.challenge = null;
        reject(new Error("AUTH_USER_CANCEL"));
      }, 300_000);
      this.challenge = {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      };
    });
  }
  /** Orchestrates existing-account sign-in and saves only the resulting authorization string. */
  private async login(mode: "phone" | "qr"): Promise<void> {
    await this.client?.destroy();
    const client = this.makeClient("");
    this.client = client;
    await client.connect();
    const credentials = {
      apiId: this.config.apiId,
      apiHash: this.config.apiHash,
    };
    if (mode === "phone") {
      await client.signInUser(credentials, {
        phoneNumber: () => this.ask("phone"),
        phoneCode: () => this.ask("code"),
        password: () => this.ask("password"),
        onError: async (error) => {
          this.recordLoginError(error);
          return true;
        },
      });
    } else await this.loginQr(client);
    if (this.abort.signal.aborted) throw new Error("AUTH_USER_CANCEL");
    this.repo.clearAll();
    this.repo.saveSession(String(client.session.save()));
    this.status = {
      ...this.status,
      stage: "authorized",
      qr: null,
      error: null,
    };
  }
  /** Polls login tokens without enabling the SDK's message update subscription. */
  private async loginQr(client: PrivacyClient): Promise<void> {
    const deadline = Date.now() + 300_000;
    while (!this.abort.signal.aborted && Date.now() < deadline) {
      try {
        let result = await client.invoke(
          new Api.auth.ExportLoginToken({
            apiId: this.config.apiId,
            apiHash: this.config.apiHash,
            exceptIds: [],
          }),
        );
        if (result instanceof Api.auth.LoginTokenMigrateTo) {
          await client._switchDC(result.dcId);
          result = await client.invoke(new Api.auth.ImportLoginToken({ token: result.token }));
        }
        if (result instanceof Api.auth.LoginTokenSuccess) return;
        if (!(result instanceof Api.auth.LoginToken)) throw new Error("Unsupported login token.");
        this.status.stage = "qr";
        this.status.qr = await toDataURL(`tg://login?token=${result.token.toString("base64url")}`, {
          margin: 2,
          width: 280,
        });
        await new Promise<void>((resolve) => {
          const timer = setTimeout(finish, 2000);
          const signal = this.abort.signal;
          /** Releases the QR poll timer on cancellation or normal expiry. */
          function finish(): void {
            clearTimeout(timer);
            signal.removeEventListener("abort", finish);
            resolve();
          }
          signal.addEventListener("abort", finish, { once: true });
        });
      } catch (error) {
        if (
          error instanceof Error &&
          "errorMessage" in error &&
          error.errorMessage === "SESSION_PASSWORD_NEEDED"
        ) {
          await client.signInWithPassword(
            { apiId: this.config.apiId, apiHash: this.config.apiHash },
            {
              password: () => this.ask("password"),
              onError: async (error) => {
                this.recordLoginError(error);
                return true;
              },
            },
          );
          return;
        }
        throw error;
      }
    }
    throw new Error("AUTH_USER_CANCEL");
  }
  /** Sanitizes Telegram auth failures and preserves server-directed login cooldowns. */
  private recordLoginError(error: unknown): void {
    if (error instanceof FloodWaitError) {
      this.cooldown = Date.now() + error.seconds * 1000;
      this.status.error = `Telegram requested a ${error.seconds}-second pause before another login.`;
    } else if (!this.status.error) {
      this.status.error =
        "Sign-in failed or this challenge is unsupported. Check your code or try QR login.";
    }
  }
}
