import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DockProject } from '@/types/dock';

const shouldUseMock = true;
const LOCAL_STORAGE_KEY = 'kehoe-dock-planner-projects';

function readLocalProjects(): DockProject[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as DockProject[];
  } catch {
    return [];
  }
}

function writeLocalProjects(projects: DockProject[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(projects));
}

export async function listProjects(userId: string): Promise<DockProject[]> {
  if (shouldUseMock) {
    return Promise.resolve(readLocalProjects());
  }

  const projectsRef = collection(db, 'users', userId, 'projects');
  const snapshot = await getDocs(projectsRef);
  return snapshot.docs.map((docSnapshot) => docSnapshot.data() as DockProject);
}

export async function getProject(userId: string, projectId: string): Promise<DockProject | null> {
  if (shouldUseMock) {
    const projects = readLocalProjects();
    return Promise.resolve(projects.find((project) => project.id === projectId) ?? null);
  }

  const projectDoc = doc(db, 'users', userId, 'projects', projectId);
  const snapshot = await getDoc(projectDoc);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as DockProject;
}

export async function createProject(userId: string, project: DockProject): Promise<void> {
  if (shouldUseMock) {
    const projects = readLocalProjects();
    writeLocalProjects([project, ...projects]);
    return Promise.resolve();
  }

  const projectDoc = doc(db, 'users', userId, 'projects', project.id);
  await setDoc(projectDoc, project);
}

export async function saveProject(userId: string, project: DockProject): Promise<void> {
  if (shouldUseMock) {
    const projects = readLocalProjects();
    const existingIndex = projects.findIndex((existingProject) => existingProject.id === project.id);

    if (existingIndex >= 0) {
      const nextProjects = [...projects];
      nextProjects[existingIndex] = project;
      writeLocalProjects(nextProjects);
    } else {
      writeLocalProjects([project, ...projects]);
    }

    return Promise.resolve();
  }

  const projectDoc = doc(db, 'users', userId, 'projects', project.id);
  await setDoc(projectDoc, project);
}

export async function removeProject(userId: string, projectId: string): Promise<void> {
  if (shouldUseMock) {
    const projects = readLocalProjects();
    writeLocalProjects(projects.filter((project) => project.id !== projectId));
    return Promise.resolve();
  }

  const projectDoc = doc(db, 'users', userId, 'projects', projectId);
  await deleteDoc(projectDoc);
}