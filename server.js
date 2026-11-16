const express = require("express");
const path = require("path");

const app = express();
const port = Number(process.env.PORT) || 4173;
const publicDir = path.join(__dirname, "public");

app.use(express.static(publicDir, { extensions: ["html"] }));

app.get("/api/product", (_req, res) => {
  res.sendFile(path.join(publicDir, "data", "product.json"));
});

app.listen(port, "0.0.0.0", () => {
  console.log(`AMedia site running at http://localhost:${port}`);
});
