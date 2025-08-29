# Madame Cookies — PMS (bundle GitHub Pages)

Ce dossier contient la version **séparée** (HTML/CSS/JS) et **minifiée** prête pour GitHub Pages.

## Fichiers
- `index.html` — page principale (référence `assets/app.min.css` et `assets/app.min.js`)
- `assets/app.css` — CSS lisible
- `assets/app.min.css` — CSS minifié
- `assets/app.js` — JS lisible
- `assets/app.min.js` — JS "minifié léger" (sûr pour la prod)

> La caméra et la sauvegarde localStorage exigent un **contexte sécurisé (HTTPS)**. GitHub Pages fournit automatiquement le HTTPS, parfait pour tester sur mobile.

---

## Déploiement — Option A (branche `gh-pages` recommandée)

1. Crée un dépôt vide sur GitHub (ex: `madame-cookies-pms`).
2. Sur ton ordi, place le contenu de ce dossier à la racine du repo.
3. Dans un terminal :

```bash
git init
git add .
git commit -m "PMS v2 — split assets + fixes mobile"
git branch -M main
git remote add origin https://github.com/TON-ORG/madame-cookies-pms.git
git push -u origin main

# créer la branche de prod GitHub Pages
git checkout --orphan gh-pages
git rm -rf .
git checkout main -- .
git commit -m "Deploy to gh-pages"
git push -u origin gh-pages
```

4. Sur GitHub : **Settings > Pages** → Source = `gh-pages` / `root`.
5. Attends ~30 secondes, puis ouvre l’URL fournie (HTTPS).

---

## Déploiement — Option B (depuis `main`)

1. Pousse seulement `main` (étapes 1–3 ci-dessus).
2. **Settings > Pages** → Source = `main` / `root`.
3. Ouvre l’URL (HTTPS).

---

## Conseils d’usage mobile

- iOS Safari : la vidéo utilise `playsinline` + `muted` pour un démarrage fluide.
- Permission caméra : la première demande s’affiche lors du clic “Photographier”.
- Si `getUserMedia` est indisponible, un **fallback** ouvre la caméra via un champ fichier avec `capture="environment"`.
- Les données sont dans `localStorage` (perso par appareil/navigateur).

Bon test !