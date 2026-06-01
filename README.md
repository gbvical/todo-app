# Todo App

iOS-style To-Do App mit React + Vite. Daten werden im `localStorage` des Browsers gespeichert.

## Lokal starten

```bash
npm install
npm run dev
```

App läuft dann auf http://localhost:5173

## Deployment: GitHub + Vercel

### Schritt 1 — GitHub Repo anlegen

1. Gehe zu [github.com/new](https://github.com/new)
2. Repository-Name: `todo-app`
3. Visibility: Public oder Private (beides funktioniert mit Vercel Free)
4. Klicke **"Create repository"**

### Schritt 2 — Code pushen

```bash
cd todo-app
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/DEIN-USERNAME/todo-app.git
git push -u origin main
```

### Schritt 3 — Vercel verbinden

1. Gehe zu [vercel.com](https://vercel.com) → **"Add New Project"**
2. GitHub-Repo `todo-app` auswählen → **"Import"**
3. Einstellungen so lassen (Vercel erkennt Vite automatisch)
4. Klicke **"Deploy"**

Nach ~30 Sekunden ist die App live unter:
```
https://todo-app-XXXX.vercel.app
```

### Schritt 4 — Updates deployen

Ab jetzt reicht ein git push:

```bash
git add .
git commit -m "Änderung"
git push
```

Vercel deployed automatisch innerhalb von Sekunden.

## Hinweis localStorage

Daten werden im Browser gespeichert — sie sind also gerätespezifisch.
Für geräteübergreifende Synchronisation wäre im nächsten Schritt ein Backend (z.B. mit MySQL) notwendig.
