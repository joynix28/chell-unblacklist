# 🛠️ Guide d'Installation Complet

## 📑 Prérequis

- Un compte GitHub ✅
- Un bot Discord créé sur [Discord Developer Portal](https://discord.com/developers)
- [Node.js](https://nodejs.org/) version 18+
- 5 minutes de ton temps

## 🚀 Étape 1 : Activer le Site Web

### GitHub Pages (Automatique)

1. Va sur les paramètres de ton repo
2. Clique sur **Pages** dans le menu gauche
3. Sous **"Source"**, sélectionne **"GitHub Actions"**
4. Clique sur **"Save"**
5. Attends 2-3 minutes
6. Ton site sera en ligne à : **https://joynix28.github.io/chell-unblacklist**

## 🤖 Étape 2 : Installer le Bot

### Sur ton PC (Windows/Mac/Linux)

1. **Installe Node.js** :
   - Télécharge depuis [nodejs.org](https://nodejs.org/)
   - Lance l'installateur
   - Vérifie l'installation : `node --version`

2. **Télécharge le projet** :
   ```bash
   git clone https://github.com/joynix28/chell-unblacklist.git
   cd chell-unblacklist/bot
   ```

3. **Configure le bot** :
   - Copie `.env.example` en `.env`
   - Remplis avec TES informations

4. **Lance le bot** :
   ```bash
   npm install
   node index.js
   ```

### Sur un hébergeur gratuit

#### Option A : Render.com

1. Crée un compte sur [Render.com](https://render.com)
2. New > Web Service
3. Connecte GitHub et choisis `chell-unblacklist`
4. Paramètres :
   - **Root Directory** : `bot`
   - **Build Command** : `npm install`
   - **Start Command** : `node index.js`
5. Ajoute les variables d'environnement
6. Déploie

#### Option B : Railway.app

1. Connecte-toi sur [Railway.app](https://railway.app)
2. New Project > Deploy from GitHub
3. Sélectionne le repo
4. Ajoute les variables d'environnement
5. Déploie

## 🔗 Étape 3 : Configurer Discord OAuth2

1. Va sur [Discord Developer Portal](https://discord.com/developers/applications)
2. Sélectionne ton application
3. Va dans **OAuth2** > **General**
4. Sous **Redirects**, clique **Add Redirect**
5. Ajoute : `https://joynix28.github.io/chell-unblacklist/`
6. **Save Changes**

## ✅ Étape 4 : Test

1. Sur ton serveur Discord, tape : `/appel salon:#general`
2. Copie le lien généré
3. Ouvre-le dans un navigateur
4. Connecte-toi avec Discord
5. Remplis le formulaire de test
6. Vérifie que le message arrive dans le salon

## 💚 Terminé !

Ton système d'unblacklist est maintenant opérationnel.

### En cas de problème

- **Le bot ne répond pas** : Vérifie qu'il est en ligne
- **Erreur de lien** : Vérifie la SECRET_KEY
- **Erreur OAuth** : Vérifie l'URL de redirection

### Besoin d'aide ?

Ouvre une issue sur GitHub.