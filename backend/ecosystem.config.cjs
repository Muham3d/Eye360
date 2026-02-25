module.exports = {
  apps: [{
    name: "patrolmanager-api",
    script: "./dist/server.js",
    instances: "max",
    exec_mode: "cluster",
    env_production: {
      NODE_ENV: "production",
      PORT: 3000
    }
  }]
}
