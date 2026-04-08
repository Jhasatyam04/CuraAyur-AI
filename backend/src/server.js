const { port } = require("./config");
const { initStore } = require("./store");
const { createApp } = require("./app");

const app = createApp();

const startServer = async () => {
  await initStore();

  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`CuraAyur backend listening on port ${port}`);
  });
};

startServer().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start CuraAyur backend:", error.message || error);
  process.exit(1);
});
