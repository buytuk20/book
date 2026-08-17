import { Router, type IRouter, Request, Response } from "express";
import { z } from "zod";
import { getFirestore } from "../lib/firebase";
import type { Project, CreateProjectData, UpdateProjectData } from "../types/firestore";
import { authMiddleware } from "../middlewares/auth";

const router: IRouter = Router();
const db = getFirestore();

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  tree: z.string().default(""),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  tree: z.string().optional(),
});

// Get all projects for the authenticated user
router.get("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const uid = req.uid!;
    
    const snapshot = await db
      .collection('projects')
      .where('userId', '==', uid)
      .orderBy('updatedAt', 'desc')
      .get();
    
    const projects = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Project[];

    return res.json(projects);
  } catch (error) {
    console.error("Get projects error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Get a single project by ID
router.get("/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const uid = req.uid!;
    const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const projectDoc = await db.collection('projects').doc(projectId).get();
    
    if (!projectDoc.exists) {
      return res.status(404).json({ error: "Project not found" });
    }

    const project = projectDoc.data() as Project;
    
    // Check if project belongs to user
    if (project.userId !== uid) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Get files for this project
    const filesSnapshot = await db
      .collection('files')
      .where('projectId', '==', projectId)
      .get();
    
    const files = filesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json({
      ...project,
      id: projectDoc.id,
      files,
    });
  } catch (error) {
    console.error("Get project error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Create a new project
router.post("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const uid = req.uid!;
    const body = createProjectSchema.parse(req.body);
    
    const now = Date.now();
    
    const projectData: CreateProjectData = {
      userId: uid,
      name: body.name,
      tree: body.tree,
    };

    const projectRef = await db.collection('projects').add({
      ...projectData,
      createdAt: now,
      updatedAt: now,
    });

    const projectDoc = await projectRef.get();
    const project = {
      id: projectDoc.id,
      ...projectDoc.data(),
    } as Project;

    return res.status(201).json(project);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    console.error("Create project error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Update a project
router.put("/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const uid = req.uid!;
    const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const projectDoc = await db.collection('projects').doc(projectId).get();
    
    if (!projectDoc.exists) {
      return res.status(404).json({ error: "Project not found" });
    }

    const project = projectDoc.data() as Project;
    
    // Check if project belongs to user
    if (project.userId !== uid) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const body = updateProjectSchema.parse(req.body);
    
    const updateData: Record<string, any> = {
      ...body,
      updatedAt: Date.now(),
    };

    await db.collection('projects').doc(projectId).update(updateData);

    const updatedDoc = await db.collection('projects').doc(projectId).get();
    const updatedProject = {
      id: updatedDoc.id,
      ...updatedDoc.data(),
    } as Project;

    return res.json(updatedProject);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    console.error("Update project error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Delete a project
router.delete("/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const uid = req.uid!;
    const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const projectDoc = await db.collection('projects').doc(projectId).get();
    
    if (!projectDoc.exists) {
      return res.status(404).json({ error: "Project not found" });
    }

    const project = projectDoc.data() as Project;
    
    // Check if project belongs to user
    if (project.userId !== uid) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Delete all files for this project
    const filesSnapshot = await db
      .collection('files')
      .where('projectId', '==', projectId)
      .get();
    
    const batch = db.batch();
    filesSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Delete the project
    batch.delete(db.collection('projects').doc(projectId));
    
    await batch.commit();

    return res.json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("Delete project error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
