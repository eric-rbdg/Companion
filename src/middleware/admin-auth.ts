import type { NextFunction, Request, Response } from "express";

export function adminAuth(apiKey: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.header("x-admin-key");
    if (!key || key !== apiKey) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    next();
  };
}

