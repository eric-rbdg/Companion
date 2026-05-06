import { Router } from "express";
import type { Logger } from "../utils/logger.js";
import { readAppVersion } from "../utils/version.js";

export function createHealthRouter(logger: Logger): Router {
  const router = Router();

  router.get("/health", (_req, res) => {
    try {
      const version = readAppVersion();
      res.json({
        status: "ok",
        uptime: Math.floor(process.uptime()),
        version,
      });
    } catch (err) {
      logger.error({ err }, "Health version read failed");
      res.json({
        status: "ok",
        uptime: Math.floor(process.uptime()),
        version: "unknown",
      });
    }
  });

  return router;
}
