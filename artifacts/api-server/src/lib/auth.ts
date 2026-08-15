import { getAuth } from './firebase';
import { getFirestore } from './firebase';
import type { Request } from 'express';
import type { User } from '../types/firestore';

const auth = getAuth();
const db = getFirestore();

export async function verifyIdToken(idToken: string): Promise<string> {
  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    return decodedToken.uid;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

export async function getUserFromRequest(req: Request): Promise<{ uid: string; user: User } | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;

  const idToken = authHeader.substring(7);
  
  try {
    const uid = await verifyIdToken(idToken);
    
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) return null;
    
    const user = userDoc.data() as User;
    return { uid, user };
  } catch {
    return null;
  }
}

export async function registerUser(uid: string, email: string, username: string): Promise<User> {
  const userRef = db.collection('users').doc(uid);
  const now = Date.now();
  
  const userData: User = {
    id: uid,
    email,
    username,
    createdAt: now,
    updatedAt: now,
  };
  
  await userRef.set(userData);
  return userData;
}

export async function getUser(uid: string): Promise<User | null> {
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists) return null;
  return userDoc.data() as User;
}
