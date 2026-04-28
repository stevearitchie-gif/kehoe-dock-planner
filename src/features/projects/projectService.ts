import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DockProject } from '@/types/dock';
import { mockProjects } from './mockProjects';

const shouldUseMock = true;

export async function listProjects(userId: string): Promise<DockProject[]> {
  if (shouldUseMock) {
    return Promise.resolve(mockProjects);
  }

  const projectsRef = collection(db, 'users', userId, 'projects');
  const snapshot = await getDocs(projectsRef);
  return snapshot.docs.map((docSnapshot) => docSnapshot.data() as DockProject);
}

export async function createProject(userId: string, project: DockProject): Promise<void> {
  if (shouldUseMock) {
    return Promise.resolve();
  }

  const projectDoc = doc(db, 'users', userId, 'projects', project.id);
  await setDoc(projectDoc, project);
}

export async function removeProject(userId: string, projectId: string): Promise<void> {
  if (shouldUseMock) {
    return Promise.resolve();
  }

  const projectDoc = doc(db, 'users', userId, 'projects', projectId);
  await deleteDoc(projectDoc);
}
