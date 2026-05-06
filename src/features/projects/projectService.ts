import { collection, deleteDoc, doc, getDoc, getDocs, query, orderBy, setDoc } from 'firebase/firestore/lite';
import { db } from '@/lib/firebase';
import { DockProject } from '@/types/dock';

export async function listProjects(userId: string): Promise<DockProject[]> {
  const projectsRef = collection(db, 'users', userId, 'projects');
  const projectsQuery = query(projectsRef, orderBy('updatedAt', 'desc'));
  const snapshot = await getDocs(projectsQuery);

  return snapshot.docs.map((docSnapshot) => docSnapshot.data() as DockProject);
}

export async function getProject(userId: string, projectId: string): Promise<DockProject | null> {
  const projectDoc = doc(db, 'users', userId, 'projects', projectId);
  const snapshot = await getDoc(projectDoc);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as DockProject;
}

export async function createProject(userId: string, project: DockProject): Promise<void> {
  const projectDoc = doc(db, 'users', userId, 'projects', project.id);
  await setDoc(projectDoc, project);
}

export async function saveProject(userId: string, project: DockProject): Promise<void> {
  const projectDoc = doc(db, 'users', userId, 'projects', project.id);
  await setDoc(projectDoc, project);
}

export async function removeProject(userId: string, projectId: string): Promise<void> {
  const projectDoc = doc(db, 'users', userId, 'projects', projectId);
  await deleteDoc(projectDoc);
}