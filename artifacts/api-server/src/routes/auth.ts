import { Router, type IRouter } from "express";
import { z } from "zod";
import { registerUser, getUser } from "../lib/auth";
import { getAuth } from "../lib/firebase";

const router: IRouter = Router();
const auth = getAuth();

const registerSchema = z.object({
  idToken: z.string(),
  username: z.string().min(3).max(50),
});

router.post("/register", async (req, res) => {
  try {
    const body = registerSchema.parse(req.body);
    
    // Verify the ID token from Firebase
    const decodedToken = await auth.verifyIdToken(body.idToken);
    const uid = decodedToken.uid;
    const email = decodedToken.email || '';
    
    // Check if user already exists in Firestore
    const existingUser = await getUser(uid);
    if (existingUser) {
      return res.status(409).json({ error: "User already exists" });
    }
    
    // Create user in Firestore
    const user = await registerUser(uid, email, body.username);
    
    return res.status(201).json({
      id: user.id,
      email: user.email,
      username: user.username,
      createdAt: user.createdAt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    console.error("Register error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { idToken } = req.body;
    
    if (!idToken) {
      return res.status(400).json({ error: "ID token is required" });
    }
    
    // Verify the ID token from Firebase
    const decodedToken = await auth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const email = decodedToken.email || '';
    
    // Check if user exists in Firestore
    let user = await getUser(uid);
    
    // If user doesn't exist, create them
    if (!user) {
      const username = email.split('@')[0] || 'user';
      user = await registerUser(uid, email, username);
    }
    
    return res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
});

router.get("/me", async (req, res) => {
  try {
    const { getUserFromRequest } = await import("../lib/auth");
    const authResult = await getUserFromRequest(req);
    
    if (!authResult) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    return res.json({
      id: authResult.user.id,
      email: authResult.user.email,
      username: authResult.user.username,
      createdAt: authResult.user.createdAt,
    });
  } catch (error) {
    console.error("Get user error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
