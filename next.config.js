const path = require("node:path");
module.exports = {
  outputFileTracingRoot: path.join(__dirname),
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node"],
};
