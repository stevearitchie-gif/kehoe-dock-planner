import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore/lite';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyBY-xxqiLjFUbyXbyK1NemYlZeENc_DD3E',
  authDomain: 'kehoe-dock-planner.firebaseapp.com',
  projectId: 'kehoe-dock-planner',
  storageBucket: 'kehoe-dock-planner.firebasestorage.app',
  messagingSenderId: '719636145592',
  appId: '1:719636145592:web:12b63cb76abbd13b9a5b4d',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);