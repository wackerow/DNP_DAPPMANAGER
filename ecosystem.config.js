module.exports = {
  apps: [
    {
      name: "dappmanager",
      cwd: "./packages/dappmanager",
      kill_timeout: 3000,
      restart_delay: 3000,
      script: "yarn",
      args: "run dev",
    },
    {
      name: "adminUi",
      cwd: "./packages/admin-ui",
      kill_timeout: 3000,
      restart_delay: 3000,
      script: "yarn",
      args: "run dev",
    },
  ],
};
