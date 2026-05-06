import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { assertConfig, config } from "./config.js";
import { startNotificationWorker } from "./notificationWorker.js";
import routes from "./routes.js";

assertConfig();

const app = express();
app.use(helmet());
app.use(cors({ origin: config.frontendOrigin }));
app.use(express.json());
app.use(morgan("dev"));

app.use("/api", routes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

app.listen(config.port, () => {
  console.log(`API running on http://localhost:${config.port}`);
});

const stopWorker = startNotificationWorker({ intervalMs: 5000 });

process.on("SIGINT", () => {
  stopWorker();
  process.exit(0);
});
