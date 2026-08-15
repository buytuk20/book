import { Request, Response, NextFunction } from "express";
import { getUserFromRequest } from "../lib/auth";

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const authResult = await getUserFromRequest(req);
    
    if (!authResult) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    req.uid = authResult.uid;
    req.user = authResult.user;
    
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({ error: "Unauthorized" });
  }
}

declare global {
  namespace Express {
    interface Request {
      uid?: string;
      user?: any;
    }
  }
}
