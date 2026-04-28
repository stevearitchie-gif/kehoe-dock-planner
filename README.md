# Kehoe Dock Planner (App Shell)

First working scaffold for an internal production-style dock planning web app.

## Tech Stack

- React + Vite + TypeScript
- Tailwind CSS
- Firebase Auth
- Firestore
- Firebase Storage
- React Router

## Features in this ticket

- Project scaffold and maintainable folder structure
- Firebase initialization with placeholder config values
- Login page (email/password)
- Projects page with mock project list and action placeholders
- Editor shell page with top bar, left tools, center canvas placeholder, and right properties panel
- Routing across login/projects/editor pages
- Firebase auth flow structure (context + protected routes)

## Firestore structure

- `users/{userId}`
- `users/{userId}/projects/{projectId}`

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure Firebase in `src/lib/firebase.ts`.
3. Run development server:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   ```

## Folder structure

```text
.
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── src
    ├── app
    │   └── App.tsx
    ├── components
    │   ├── auth
    │   │   ├── AuthContext.tsx
    │   │   ├── LoginForm.tsx
    │   │   ├── ProtectedRoute.tsx
    │   │   └── useAuth.ts
    │   ├── layout
    │   │   └── AppShell.tsx
    │   └── projects
    │       └── ProjectsTable.tsx
    ├── features
    │   ├── editor
    │   │   └── toolDefinitions.ts
    │   └── projects
    │       ├── mockProjects.ts
    │       └── projectService.ts
    ├── lib
    │   └── firebase.ts
    ├── main.tsx
    ├── pages
    │   ├── EditorPage.tsx
    │   ├── LoginPage.tsx
    │   └── ProjectsPage.tsx
    ├── styles
    │   └── index.css
    └── types
        └── dock.ts
```
