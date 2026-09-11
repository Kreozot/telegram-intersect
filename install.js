module.exports = {
  run: [
    {
      when: "{{!exists('runtime')}}",
      method: "shell.run",
      params: {
        path: ".",
        message: "conda create -y -p runtime -c conda-forge nodejs=24",
      },
    },
    {
      method: "shell.run",
      params: {
        path: ".",
        conda: "runtime",
        message: ["npm --prefix app ci --include=dev", "npm --prefix app run build"],
      },
    },
  ],
};
