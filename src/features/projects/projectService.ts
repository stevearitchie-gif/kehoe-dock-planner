import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DockProject } from '@/types/dock';

function removeUndefinedValues<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => removeUndefinedValues(item)) as T;
  }

  if (value && typeof value === 'object') {
    const cleanedEntries = Object.entries(value)
      .filter(([, entryValue]) => entryValue !== undefined)
      .map(([entryKey, entryValue]) => [entryKey, removeUndefinedValues(entryValue)]);

    return Object.fromEntries(cleanedEntries) as T;
  }

  return value;
}

function prepareProjectForFirestore(project: DockProject): DockProject {
  return removeUndefinedValues(project);
}

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
  await setDoc(projectDoc, prepareProjectForFirestore(project));
}

export async function saveProject(userId: string, project: DockProject): Promise<void> {
  const projectDoc = doc(db, 'users', userId, 'projects', project.id);
  await setDoc(projectDoc, prepareProjectForFirestore(project));
}

export async function removeProject(userId: string, projectId: string): Promise<void> {
  const projectDoc = doc(db, 'users', userId, 'projects', projectId);
  await deleteDoc(projectDoc);
}
