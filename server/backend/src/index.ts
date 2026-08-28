import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { initDb, db } from "./db";
import authRoutes from "./routes/auth";
import projectRoutes from "./routes/projects";
import taskRoutes from "./routes/tasks";
import milestoneRoutes from "./routes/milestones";
import userRoutes from "./routes/users";
import followRoutes from "./routes/follows";
import notificationRoutes from "./routes/notifications";
import resourceRoutes from "./routes/resources";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/milestones", milestoneRoutes);
app.use("/api/users", userRoutes);
app.use("/api/follows", followRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/resources", resourceRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", db: db.dialect });
});

// V produkci servírujeme zabuildovaný frontend přímo z backendu,
// takže celá aplikace běží jako jediná služba.
const frontendDist = path.join(__dirname, "..", "..", "frontend", "dist");
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

async function start() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`Project Pilot API běží na portu ${PORT} (databáze: ${db.dialect})`);
  });
}

start().catch((err) => {
  console.error("Nepodařilo se spustit server:", err);
  process.exit(1);
});
