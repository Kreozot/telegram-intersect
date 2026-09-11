module.exports = {
  daemon: true,
  run: [
    {
      method: "shell.run",
      params: {
        path: ".",
        conda: "runtime",
        env: { HOST: "127.0.0.1", PORT: "{{port}}" },
        message: ["npm --prefix app start"],
        on: [{ event: "/(http:\\/\\/[0-9.:]+)/", done: true }],
      },
    },
    { method: "local.set", params: { url: "{{input.event[1]}}" } },
  ],
};
