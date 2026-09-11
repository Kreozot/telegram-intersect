module.exports = {
  version: "7.0",
  title: "Telegram Intersect",
  description:
    "Explore the Telegram communities shared by your people. Local-first, metadata-only.",
  icon: "icon.svg",
  /** Selects the appropriate installation, terminal, or ready UI action for Pinokio. */
  menu: async (_kernel, info) => {
    for (const [script, text] of [
      ["install.js", "Installing"],
      ["update.js", "Updating"],
      ["reset.js", "Resetting dependencies"],
    ]) {
      if (info.running(script))
        return [{ default: true, icon: "fa-solid fa-terminal", text, href: script }];
    }
    if (info.running("start.js")) {
      const local = info.local("start.js");
      return local?.url
        ? [
            {
              default: true,
              icon: "fa-solid fa-diagram-project",
              text: "Open Web UI",
              href: local.url,
            },
            {
              icon: "fa-solid fa-terminal",
              text: "Terminal",
              href: "start.js",
            },
          ]
        : [
            {
              default: true,
              icon: "fa-solid fa-terminal",
              text: "Starting",
              href: "start.js",
            },
          ];
    }
    if (
      !info.exists("runtime") ||
      !info.exists("app/node_modules") ||
      !info.exists("app/dist/server/server/main.js")
    )
      return [
        {
          default: true,
          icon: "fa-solid fa-download",
          text: "Install",
          href: "install.js",
        },
      ];
    return [
      {
        default: true,
        icon: "fa-solid fa-play",
        text: "Start",
        href: "start.js",
      },
      { icon: "fa-solid fa-arrows-rotate", text: "Update", href: "update.js" },
      { icon: "fa-solid fa-download", text: "Reinstall", href: "install.js" },
      {
        icon: "fa-solid fa-broom",
        text: "Reset dependencies (keeps data)",
        href: "reset.js",
      },
    ];
  },
};
