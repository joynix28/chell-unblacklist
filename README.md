# 📨 Système d'Unblacklist pour Chell Bot

Système complet de gestion des demandes d'unblacklist avec formulaire web sécurisé et authentification Discord obligatoire.

## ✨ Fonctionnalités

- 🔐 **Authentification Discord obligatoire** via OAuth2
- 🔒 **Liens sécurisés** avec cryptage AES-256
- 🎨 **Design moderne** glassmorphism responsive
- 📨 **Envoi automatisé** vers un salon Discord spécifique
- ⚙️ **Déploiement automatique** via GitHub Actions
- 🚫 **Anti-spam** intégré

## 🚀 Installation Rapide

### 1️⃣ Activer GitHub Pages

1. Va dans **Settings** > **Pages**
2. Source : Sélectionne **GitHub Actions**
3. Attends 2-3 minutes que le déploiement se termine
4. Ton site sera accessible à : `https://joynix28.github.io/chell-unblacklist`

### 2️⃣ Configurer le Bot Discord

#### A. Prérequis
- [Node.js](https://nodejs.org/) version 18 ou supérieure
- Ton token Discord du bot

#### B. Installation

```bash
# Clone le projet
git clone https://github.com/joynix28/chell-unblacklist.git
cd chell-unblacklist/bot

# Installe les dépendances
npm install

# Copie le fichier de configuration
cp .env.example .env
```

#### C. Configuration du fichier `.env`

Crée un fichier `.env` dans le dossier `bot/` avec tes informations :

```env
DISCORD_TOKEN=ton_token_discord_ici
CLIENT_ID=1475575856993665134
SECRET_KEY=CHELL_SECURITY_KEY_2026_ULTRA_SECURE
SITE_URL=https://joynix28.github.io/chell-unblacklist
```

> ⚠️ **Important** : Ne partage JAMAIS ton token Discord publiquement

#### D. Lancer le Bot

```bash
node index.js
```

Tu devrais voir :
```
🔄 Mise à jour des commandes slash...
✅ Commandes enregistrées avec succès !
🚀 Bot connecté en tant que Chell#1234
```

### 3️⃣ Configurer Discord OAuth2

1. Va sur [Discord Developer Portal](https://discord.com/developers/applications)
2. Sélectionne ton application
3. Dans **OAuth2** > **Redirects**, ajoute :
   ```
   https://joynix28.github.io/chell-unblacklist/
   ```
4. Sauvegarde

## 📚 Utilisation

### Commande Discord

```
/appel salon:#appeals
```

Le bot génère un lien sécurisé unique pour le salon choisi.

### Processus de demande

1. 👤 L'utilisateur clique sur le lien
2. 🔐 Connexion Discord obligatoire
3. 📝 Remplissage du formulaire complet
4. ✉️ Envoi automatisé au salon choisi
5. 👥 L'équipe modération examine

## 🛡️ Sécurité

- ✅ **Cryptage AES-256** des webhooks
- ✅ **Authentification Discord** obligatoire
- ✅ **Anti-spam** : Un envoi par code
- ✅ **Validation** : Tous les champs obligatoires
- ⚠️ **Important** : Ne partage jamais ton fichier `.env`

## 📝 Structure du Formulaire

1. 🧩 Informations d'identification
2. 📚 Connaissance de la raison du blacklist
3. 🧠 Accord ou désaccord avec la sanction
4. ✔️ Reconnaissance ou contestation des faits
5. 🔧 Analyse personnelle et prise de recul
6. ✨ Motivation pour l'unblacklist
7. 💬 Informations complémentaires (facultatif)

## 🔧 Développement

### Technologies

- **Frontend** : HTML5, CSS3 (Glassmorphism), Vanilla JavaScript
- **Backend** : Discord.js v14, Node.js
- **Cryptographie** : CryptoJS (AES-256)
- **Déploiement** : GitHub Pages, GitHub Actions

### Structure du Projet

```
chell-unblacklist/
├── .github/
│   └── workflows/
│       └── deploy.yml       # Déploiement automatique
├── bot/
│   ├── index.js             # Bot Discord
│   ├── package.json         # Dépendances
│   ├── .env.example         # Template config
│   └── .gitignore           # Fichiers ignorés
├── public/
│   ├── index.html           # Formulaire
│   ├── style.css            # Design
│   └── script.js            # Logique OAuth/Envoi
└── README.md                # Documentation
```

## ❓ FAQ

### Le bot ne répond pas à /appel
- Vérifie que le bot est bien en ligne (`node index.js`)
- Vérifie que tu as les permissions **Administrateur**
- Attends quelques minutes (les commandes slash peuvent prendre du temps)

### Le lien ne fonctionne pas
- Vérifie que GitHub Pages est activé
- Vérifie que l'URL de redirection OAuth2 est correcte
- Vérifie que `SITE_URL` dans `.env` correspond à ton site

### "Erreur : Le lien est invalide"
- La clé `SECRET_KEY` doit être **identique** dans `bot/.env` et `public/script.js`
- Génère un nouveau lien avec `/appel`

## 📜 Licence

MIT License - Libre d'utilisation

## 👥 Support

Pour toute question, contacte **Joynix** sur Discord ou ouvre une issue sur GitHub.

---

**🎉 Fait avec amour pour la communauté ChillChell**