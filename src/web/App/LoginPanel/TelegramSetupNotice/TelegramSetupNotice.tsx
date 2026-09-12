import { Alert } from "@mantine/core";

/** Explains the server configuration required before Telegram authentication can begin. */
export function TelegramSetupNotice() {
  return (
    <Alert title="Configure your Telegram app" color="teal">
      Add TELEGRAM_API_ID and TELEGRAM_API_HASH to .env, then restart. See the README for setup.
    </Alert>
  );
}
