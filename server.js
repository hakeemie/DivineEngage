// server.js — for Divine Engage (React + Vite + Express)
// Works with ES Modules ("type": "module" in package.json)

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the dist folder (the built React app)
app.use(express.static(path.join(__dirname, "dist")));

// Fallback for React Router (send index.html for all routes)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// Start the server
app.listen(PORT, () => {
  console.log(`✅ Divine Engage server running on port ${PORT}`);
});
