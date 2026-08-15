import { Router, type IRouter, Request, Response } from "express";
import { z } from "zod";
import { getFirestore } from "../lib/firebase";
import type { File, CreateFileData, UpdateFileData, Project } from "../types/firestore";
import { authMiddleware } from "../middlewares/auth";

const router: IRouter = Router();
const db = getFirestore();

const createFileSchema = z.object({
  path: z.string().min(1),
  content: z.string().default(""),
});

const updateFileSchema = z.object({
  path: z.string().min(1).optional(),
  content: z.string().optional(),
});

// Get all files for a project
router.get("/project/:projectId", authMiddleware, async (req: Request, res: Response) => {
  try {
    const uid = req.uid!;
    const projectId = req.params.projectId;

    // Check if project belongs to user
    const projectDoc = await db.collection('projects').doc(projectId).get();
    if (!projectDoc.exists) {
      return res.status(404).json({ error: "Project not found" });
    }

    const project = projectDoc.data() as Project;
    if (project.userId !== uid) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const snapshot = await db
      .collection('files')
      .where('projectId', '==', projectId)
      .orderBy('updatedAt', 'desc')
      .get();
    
    const files = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as File[];

    res.json(files);
  } catch (error) {
    console.error("Get files error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get a single file by ID
router.get("/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const uid = req.uid!;
    const fileId = req.params.id;

    const fileDoc = await db.collection('files').doc(fileId).get();
    if (!fileDoc.exists) {
      return res.status(404).json({ error: "File not found" });
    }

    const file = fileDoc.data() as File;

    // Check if project belongs to user
    const projectDoc = await db.collection('projects').doc(file.projectId).get();
    if (!projectDoc.exists) {
      return res.status(404).json({ error: "Project not found" });
    }

    const project = projectDoc.data() as Project;
    if (project.userId !== uid) {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.json({
      id: fileDoc.id,
      ...file,
    });
  } catch (error) {
    console.error("Get file error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create a new file in a project
router.post("/project/:projectId", authMiddleware, async (req: Request, res: Response) => {
  try {
    const uid = req.uid!;
    const projectId = req.params.projectId;
    const body = createFileSchema.parse(req.body);

    // Check if project belongs to user
    const projectDoc = await db.collection('projects').doc(projectId).get();
    if (!projectDoc.exists) {
      return res.status(404).json({ error: "Project not found" });
    }

    const project = projectDoc.data() as Project;
    if (project.userId !== uid) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Check if file with same path already exists
    const existingSnapshot = await db
      .collection('files')
      .where('projectId', '==', projectId)
      .where('path', '==', body.path)
      .get();
    
    if (!existingSnapshot.empty) {
      return res.status(409).json({ error: "File with this path already exists" });
    }

    const now = Date.now();
    const fileData: CreateFileData = {
      projectId,
      path: body.path,
      content: body.content,
    };

    const fileRef = await db.collection('files').add({
      ...fileData,
      updatedAt: now,
    });

    const fileDoc = await fileRef.get();
    const file = {
      id: fileDoc.id,
      ...fileDoc.data(),
    } as File;

    res.status(201).json(file);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    console.error("Create file error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update a file
router.put("/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const uid = req.uid!;
    const fileId = req.params.id;
    const body = updateFileSchema.parse(req.body);

    const fileDoc = await db.collection('files').doc(fileId).get();
    if (!fileDoc.exists) {
      return res.status(404).json({ error: "File not found" });
    }

    const file = fileDoc.data() as File;

    // Check if project belongs to user
    const projectDoc = await db.collection('projects').doc(file.projectId).get();
    if (!projectDoc.exists) {
      return res.status(404).json({ error: "Project not found" });
    }

    const project = projectDoc.data() as Project;
    if (project.userId !== uid) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const updateData: UpdateFileData = {
      ...body,
      updatedAt: Date.now(),
    };

    await db.collection('files').doc(fileId).update(updateData);

    const updatedDoc = await db.collection('files').doc(fileId).get();
    const updatedFile = {
      id: updatedDoc.id,
      ...updatedDoc.data(),
    } as File;

    res.json(updatedFile);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    console.error("Update file error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete a file
router.delete("/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const uid = req.uid!;
    const fileId = req.params.id;

    const fileDoc = await db.collection('files').doc(fileId).get();
    if (!fileDoc.exists) {
      return res.status(404).json({ error: "File not found" });
    }

    const file = fileDoc.data() as File;

    // Check if project belongs to user
    const projectDoc = await db.collection('projects').doc(file.projectId).get();
    if (!projectDoc.exists) {
      return res.status(404).json({ error: "Project not found" });
    }

    const project = projectDoc.data() as Project;
    if (project.userId !== uid) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await db.collection('files').doc(fileId).delete();

    res.json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("Delete file error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Bulk create/update files for a project
router.post("/project/:projectId/bulk", authMiddleware, async (req: Request, res: Response) => {
  try {
    const uid = req.uid!;
    const projectId = req.params.projectId;
    const body = z.object({
      files: z.array(createFileSchema),
    }).parse(req.body);

    // Check if project belongs to user
    const projectDoc = await db.collection('projects').doc(projectId).get();
    if (!projectDoc.exists) {
      return res.status(404).json({ error: "Project not found" });
    }

    const project = projectDoc.data() as Project;
    if (project.userId !== uid) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Delete existing files for this project
    const existingSnapshot = await db
      .collection('files')
      .where('projectId', '==', projectId)
      .get();
    
    const batch = db.batch();
    existingSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Insert new files
    const now = Date.now();
    body.files.forEach(fileData => {
      const fileRef = db.collection('files').doc();
      batch.set(fileRef, {
        projectId,
        path: fileData.path,
        content: fileData.content,
        updatedAt: now,
      });
    });

    await batch.commit();

    // Get all files for the project
    const snapshot = await db
      .collection('files')
      .where('projectId', '==', projectId)
      .get();
    
    const files = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as File[];

    res.status(201).json(files);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    console.error("Bulk create files error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
