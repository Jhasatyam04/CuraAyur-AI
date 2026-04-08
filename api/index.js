const serverless = require("serverless-http");
const { createApp } = require("../backend/src/app");
const { initStore } = require("../backend/src/store");

const app = createApp();
let storeReadyPromise;

const ensureStoreReady = () => {
  if (!storeReadyPromise) {
    storeReadyPromise = initStore();
  }

  return storeReadyPromise;
};

const handler = serverless(app);

module.exports = async (req, res) => {
  await ensureStoreReady();
  return handler(req, res);
};
