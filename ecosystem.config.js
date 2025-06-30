module.exports = {
  apps: [
    {
      name: "product-padi", // Production config
      script: "./dist/src/server.js",
      exec_mode: "cluster",
      instances: "max",
      watch: false,
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "product-padi-dev", // Development config
      script: "src/server.ts",
      exec_mode: "cluster", // Use cluster mode for multi-core
      instances: "max", // Utilize all CPU cores
      watch: ["src"],
      interpreter: "ts-node", // Use ts-node to run TypeScript files
      env: {
        NODE_ENV: "development",
      },
    },
  ],
};
