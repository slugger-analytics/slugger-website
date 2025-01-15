
module.exports = {
    apps: [
      {
        name: "alpb-analytics",
        script: "server.js",
      },
    ],
    deploy: {
      production: {
        user: "bsantan3",
        host: "remote-server-ip",
        path: "project-path-in-remote-server",
        repo: "git@github.com:T410/pm2-deploy",
        ref: "origin/main",
        key: "ssh-key-path-in-local-machine",
        "post-deploy": "npm i; pm2 reload ecosystem.config.js --env production",
      },
    },
  };