# Aslema Admin

Interface d'administration simple pour populer la base de données Aslema.

## Fonctionnalités

### 1. Ajouter un item
- **Champs requis :**
  - Mot/phrase en tunisien
  - Traduction française
- **Champs optionnels :**
  - Type (mot, phrase, expression, dialogue, verbe)
  - Difficulté (1-5)
  - Fichier audio (nom du fichier avec extension)
  - Leçon (sélection ou création d'une nouvelle leçon)
- Possibilité de créer une nouvelle leçon directement depuis le formulaire

### 2. Ajouter un audio
- Charge un item aléatoire sans audio
- Permet de saisir le nom du fichier audio
- Met à jour l'item avec le fichier audio
- Possibilité de passer à l'item suivant

## Démarrage

```bash
# Depuis la racine du projet
pnpm dev

# Ou depuis apps/admin
pnpm dev
```

L'application sera disponible sur [http://localhost:5174](http://localhost:5174)

## Configuration

Le fichier `.env` contient l'URL de l'API :

```
VITE_API_URL=http://localhost:3000
```

## Stack technique

- Vue 3 avec Composition API
- TypeScript
- Vue Router
- Reka UI (composants shadcn/vue)
- Tailwind CSS 4
- Vite (Rolldown)
