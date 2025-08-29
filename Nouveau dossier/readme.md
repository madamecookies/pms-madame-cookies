# 🍪 PMS MADAME COOKIES v2.0

Système de management de la sécurité alimentaire pour Madame Cookies.

## 📋 Fonctionnalités

### ✅ **Fonctionnalités Opérationnelles**
- 🌡️ **Contrôle des températures** - Surveillance équipements frigorifiques
- 🏭 **Gestion de production** - Traçabilité des lots de cookies
- 📊 **Tableau de bord** - Vue d'ensemble en temps réel
- 📷 **Caméra intégrée** - Prise de photos pour documentation
- 📄 **Export PDF** - Génération de rapports formatés
- 💾 **Sauvegarde locale** - Données persistantes hors-ligne
- 📱 **Interface responsive** - Optimisée mobile/tablette

### 🔧 **En Développement**
- 🧽 Gestion du nettoyage
- 📦 Réception des marchandises
- 📈 Analyses statistiques avancées

## 🚀 Installation sur GitHub

### Étape 1: Créer le repository
1. Allez sur [GitHub](https://github.com) et connectez-vous
2. Cliquez sur "New repository"
3. Nommez-le `pms-madame-cookies`
4. Cochez "Public" et "Add README"
5. Cliquez "Create repository"

### Étape 2: Ajouter les fichiers
Dans votre nouveau repository, créez les fichiers suivants :

#### 📁 Structure des fichiers
```
pms-madame-cookies/
├── index.html          (Structure HTML principale)
├── styles.css          (Feuille de styles CSS)
├── app.js             (JavaScript principal)
├── README.md          (Ce fichier)
└── manifest.json      (Configuration PWA - optionnel)
```

### Étape 3: Copier-coller les fichiers

1. **index.html** - Copiez le contenu du premier artifact
2. **styles.css** - Copiez le contenu du deuxième artifact  
3. **app.js** - Copiez le contenu du troisième artifact
4. **README.md** - Copiez ce contenu

### Étape 4: Activer GitHub Pages
1. Dans votre repository, allez dans "Settings"
2. Scrollez jusqu'à "Pages" dans le menu latéral
3. Dans "Source", sélectionnez "Deploy from a branch"
4. Choisissez "main" branch et "/ (root)"
5. Cliquez "Save"

### Étape 5: Accéder à l'application
Votre app sera disponible à l'adresse :
```
https://[votre-username].github.io/pms-madame-cookies/
```

## 💻 Utilisation

### Navigation
- **Tableau** - Vue d'ensemble et actions du jour
- **Températures** - Contrôle des équipements frigorifiques
- **Production** - Enregistrement des lots de cookies
- **Historique** - Consultation des données passées
- **Exports** - Génération de rapports PDF/Excel

### Contrôle des Températures
1. Sélectionnez la date/heure
2. Renseignez le responsable
3. Saisissez les températures (alertes automatiques)
4. Prenez des photos si nécessaire
5. Ajoutez des actions correctives
6. Sauvegardez

### Production
1. Le numéro de lot est généré automatiquement
2. Choisissez la variété de cookie
3. Indiquez la quantité et les horaires
4. Précisez la température de cuisson
5. Documentez avec des photos
6. Enregistrez la production

### Exports
- **PDF** : Rapports formatés avec logo et signatures
- **Excel/CSV** : Données brutes pour analyses
- **Sauvegarde** : Backup complet des données

## 🔧 Configuration

### Paramètres de température
```javascript
// Dans app.js, section verifierTemperature()
Unité froide: 4.2°C ± 1°C
Unité négative: -13°C ± 2°C
Surgélateurs: -18°C ± 2°C
Ambiance max: 25°C
```

### Utilisateurs autorisés
```javascript
// Dans index.html, section select responsable
- Wendy JEAN MARIE
- Équipe Production  
- Nylaime MAMODALY BANDJEE
```

## 📱 Compatibilité

### Navigateurs supportés
- ✅ Chrome/Edge (recommandé)
- ✅ Firefox
- ✅ Safari iOS/macOS
- ✅ Chrome Mobile Android

### Fonctionnalités par plateforme
| Fonctionnalité | Desktop | Mobile | Tablette |
|---------------|---------|---------|----------|
| Interface | ✅ | ✅ | ✅ |
| Caméra | ✅* | ✅ | ✅ |
| Export PDF | ✅ | ✅ | ✅ |
| Sauvegarde | ✅ | ✅ | ✅ |
| Hors-ligne | ✅ | ✅ | ✅ |

*\*Nécessite une webcam*

## 🔒 Sécurité & Données

### Stockage des données
- **Local** : localStorage du navigateur
- **Backup** : Export manuel des données
- **Photos** : Stockées en base64 localement

### Recommandations
1. Effectuez des sauvegardes régulières
2. Testez les exports PDF périodiquement
3. Vérifiez la fonctionnalité caméra
4. Gardez une copie des données importantes

## 🆘 Dépannage

### Problèmes courants

**Caméra ne fonctionne pas**
- Vérifiez les permissions du navigateur
- Testez sur HTTPS uniquement
- Rechargez la page

**Export PDF échoue**
- Vérifiez la connexion internet (CDN jsPDF)
- Essayez un autre navigateur
- Réduisez la quantité de données

**Données perdues**
- Vérifiez localStorage dans DevTools
- Restaurez depuis un backup .json
- Ressaisissez les données critiques

### Support technique
Pour signaler un bug ou demander une amélioration :
1. Créez une "Issue" sur GitHub
2. Décrivez le problème avec captures d'écran
3. Précisez navigateur/OS utilisé

## 📝 Changelog

### v2.0 (Actuelle)
- ✅ Interface modernisée avec animations
- ✅ Caméra fonctionnelle 
- ✅ Navigation par onglets opérationnelle
- ✅ Export PDF formaté
- ✅ Système de notifications
- ✅ Statistiques en temps réel
- ✅ Sauvegarde/restauration des données

### v1.0 (Précédente)
- Interface basique
- Fonctionnalités limitées

## 📄 Licence

Projet développé pour Madame Cookies - Usage interne uniquement.

---

**🍪 Bon usage du PMS Madame Cookies !**

Pour toute question : [Créer une issue](https://github.com/[username]/pms-madame-cookies/issues)