# 📨 Système d'Appeals Chell - Version Ultime

Système complet et professionnel de gestion des demandes d'unblacklist avec formulaires personnalisables, tracking avancé et interface gouvernementale.

## ✨ Fonctionnalités Principales

### 🔐 Sécurité & Tracking
- **Authentification Discord obligatoire** via OAuth2
- **Cryptage AES-256** des webhooks et paramètres
- **Limite de tentatives** par utilisateur (1 par défaut, personnalisable)
- **Détection d'abandon** de formulaire
- **Notifications automatiques** en cas de tentative bloquée
- **Historique complet** de toutes les demandes

### 🎨 Design Professionnel
- **Design GOV.UK** adapté avec branding Chell
- **Interface glassmorphism** moderne et responsive
- **Accessibilité** (focus visible, contrastes WCAG)
- **Modal CGU** intégré avec protocole ChellOS
- **Checkbox obligatoire** d'acceptation des conditions
- **Banner de confidentialité** informatif

### 📝 Créateur de Formulaires Interactif
- **Jusqu'à 10 questions** personnalisées par formulaire
- **5 types de champs** :
  - 📝 Texte court
  - 📄 Texte long (paragraphe)
  - ☑️ Choix multiple (cases à cocher)
  - 🔽 Sélection unique (liste déroulante)
  - 📎 Upload de fichiers
- **Personnalisation complète** :
  - Couleur principale (hex)
  - Couleur des boutons
  - Nombre max de fichiers (1-10)
  - Questions obligatoires/facultatives
- **Création pas-à-pas** guidée sur Discord
- **Sauvegarde automatique** dans `custom_forms.json`

### 📨 Gestion Avancée
- **Embeds professionnels** avec double affichage
- **Pings configurés** (@everyone / @here / aucun)
- **Pièces jointes** (images, PDF, texte)
- **Export CSV** de toutes les données
- **Notifications MP** automatiques des décisions
- **Auto-reset** configurable (tous les X jours)
- **Base de données JSON** locale avec backup

---

## 🚀 Installation Rapide

### 1️⃣ Activer GitHub Pages

1. Va dans **Settings** > **Pages**
2. Source : **GitHub Actions**
3. Attends 2-3 minutes
4. Site disponible : `https://joynix28.github.io/chell-unblacklist`

### 2️⃣ Configurer Discord OAuth2

1. [Discord Developer Portal](https://discord.com/developers/applications)
2. Sélectionne ton application
3. **OAuth2** > **Redirects**, ajoute :
   ```
   https://joynix28.github.io/chell-unblacklist/
   ```
4. Sauvegarde

### 3️⃣ Installer le Bot

```bash
cd bot
npm install
cp .env.example .env
```

**Fichier `.env` :**
```env
DISCORD_TOKEN=ton_token_bot
CLIENT_ID=1475575856993665134
SECRET_KEY=CHELL_SECURITY_KEY_2026_ULTRA_SECURE
SITE_URL=https://joynix28.github.io/chell-unblacklist
```

**Lancer le bot :**
```bash
node index.js
```

---

## 🛠️ Commandes Discord

### Commandes de Base

#### `/appel` - Générer un Lien
```
/appel salon:#appeals ping:everyone formulaire:candidature-staff
```
- `salon` : Où envoyer les réponses
- `ping` : @everyone / @here / aucun
- `formulaire` : Nom du formulaire personnalisé (optionnel)

#### `/autoriser` - Débloquer un Utilisateur
```
/autoriser utilisateur:@User tentatives:2
```
Ajoute des tentatives supplémentaires (1 par défaut)

#### `/statut-appel` - Voir les Stats
```
/statut-appel utilisateur:@User
```
**Sans utilisateur** : Stats globales du serveur

#### `/reset-appel` - Réinitialiser
```
/reset-appel utilisateur:@User
```
Réinitialise complètement le compteur

---

### Gestion Avancée

#### `/historique` - Voir l'Historique
```
/historique utilisateur:@User
```
Affiche toutes les demandes passées avec dates et décisions

#### `/exporter-appels` - Export CSV
```
/exporter-appels
```
Télécharge un fichier CSV avec tous les utilisateurs

#### `/notifier-decision` - Envoyer la Décision
```
/notifier-decision utilisateur:@User decision:approuvé message:Bienvenue !
```
Envoie un MP avec la décision (approuvé / refusé / en attente)

#### `/auto-reset` - Reset Automatique
```
/auto-reset jours:30
```
Réinitialise automatiquement tous les compteurs tous les X jours (0 = désactiver)

---

### 🎨 Créateur de Formulaires

#### `/creer-formulaire` - Lancer le Créateur

Lance l'assistant interactif pas-à-pas :

1. **Nom du formulaire** (Ex: "Candidature Modérateur")
2. **Ajout de questions** (jusqu'à 10) :
   - Choisir le type de champ
   - Texte de la question
   - Obligatoire ou facultatif
   - Options (pour choix/sélection)
3. **Personnalisation** :
   - Couleur principale (#hex)
   - Couleur des boutons (#hex)
4. **Validation**

**Types de champs disponibles :**

| Type | Description | Options |
|------|-------------|----------|
| 📝 Texte court | Une ligne | - |
| 📄 Texte long | Paragraphe | - |
| ☑️ Choix multiple | Cases à cocher | Oui (liste) |
| 🔽 Sélection | Liste déroulante | Oui (liste) |
| 📎 Fichiers | Upload | Max fichiers |

#### `/liste-formulaires` - Voir les Formulaires
```
/liste-formulaires
```
Affiche tous les formulaires créés avec leur configuration

#### `/supprimer-formulaire` - Supprimer
```
/supprimer-formulaire nom:candidature-mod
```
Supprime définitivement un formulaire personnalisé

---

## 📊 Statistiques & Suivi

### Base de Données Locale

Le bot utilise 4 fichiers JSON :

1. **`appeals_db.json`** - Compteurs utilisateurs
```json
{
  "USER_ID": {
    "attempts": 1,
    "maxAttempts": 2,
    "history": []
  }
}
```

2. **`custom_forms.json`** - Formulaires personnalisés
```json
{
  "candidature-staff": {
    "questions": [...],
    "theme": { "color": "#6366f1", "buttonColor": "#00703c" },
    "maxFiles": 3,
    "createdBy": "USER_ID",
    "createdAt": 1234567890
  }
}
```

3. **`appeals_history.json`** - Historique des décisions
```json
{
  "USER_ID": [
    { "decision": "Approuvée", "timestamp": 1234567890 },
    { "decision": "Refusée", "timestamp": 1234567891 }
  ]
}
```

4. **`config.json`** - Configuration globale
```json
{
  "autoReset": true,
  "days": 30
}
```

---

## 🔒 Sécurité & CGU

### Protocole de Confidentialité ChellOS

Le formulaire intègre le protocole complet :

- 📌 **Collecte minimale** : Uniquement les données nécessaires
- 🛡️ **Blacklist globale** : Système de protection multi-serveurs
- 🧠 **IA & Support** : Audité selon RGPD (30j max)
- 🇫🇷 **Infrastructure française** : Serveurs en France
- 📝 **Acceptation obligatoire** : Checkbox avant soumission

**Liens externes :**
- [chell.fr/conditions](https://chell.fr/conditions)
- [chell.fr/confidentialite](https://chell.fr/confidentialite)

### Protection Anti-Abus

- ✅ **1 tentative par défaut** par utilisateur
- ✅ **Tracking localStorage** + base de données serveur
- ✅ **Détection d'abandon** (fermeture de page = tentative)
- ✅ **Embed d'alerte** envoyé en cas de blocage
- ✅ **Déblocage manuel** via `/autoriser`

---

## 📝 Exemple d'Utilisation

### Scénario : Créer un Formulaire de Candidature Staff

1. **Créer le formulaire**
```
/creer-formulaire
```

2. **Configuration interactive**
   - Nom : "Candidature Staff"
   - Questions :
     1. Texte court : "Quel est votre pseudo Minecraft ?" (obligatoire)
     2. Texte long : "Pourquoi voulez-vous devenir staff ?" (obligatoire)
     3. Sélection : "Disponibilité hebdomadaire" (Options: 0-5h, 5-10h, 10-20h, 20h+)
     4. Choix multiple : "Expériences" (Options: Modération, Développement, Build)
     5. Fichiers : "Capture d'écran de vos builds" (max 3)
   - Couleurs :
     - Principal : `#a855f7`
     - Boutons : `#00703c`

3. **Générer le lien**
```
/appel salon:#candidatures ping:here formulaire:Candidature Staff
```

4. **Partager le lien**
Donnez le lien généré aux candidats

5. **Recevoir les réponses**
Tous les résultats arrivent dans `#candidatures` avec embeds personnalisés

6. **Notifier les candidats**
```
/notifier-decision utilisateur:@Candidat decision:approuvé message:Félicitations !
```

---

## 👥 Support

### En cas de Problème

**Le bot ne répond pas :**
- Vérifie qu'il est en ligne (`node index.js`)
- Vérifie le token dans `.env`
- Attends 2-3 minutes (commandes slash)

**Erreur "Lien invalide" :**
- Vérifie que `SECRET_KEY` est identique partout
- Génère un nouveau lien avec `/appel`

**Erreur OAuth2 :**
- Vérifie l'URL de redirection Discord
- Vérifie que `SITE_URL` dans `.env` est correct

**Utilisateur bloqué par erreur :**
```
/reset-appel utilisateur:@User
```

### Contact

- **Email** : contact@chell.fr
- **GitHub Issues** : [Ouvrir une issue](https://github.com/joynix28/chell-unblacklist/issues)

---

## 📜 Licence

MIT License - Libre d'utilisation et modification

---

## 🎉 Crédits

**Développé avec ❤️ pour la communauté ChillChell**

- Design inspiré de GOV.UK Design System
- Cryptographie : CryptoJS
- Framework : Discord.js v14
- Déploiement : GitHub Pages

---

## 📊 Statistiques du Projet

- **12 commandes** Discord
- **5 types de champs** personnalisables
- **10 questions max** par formulaire
- **3 fichiers** de base de données
- **100% sécurisé** (AES-256 + OAuth2)
- **Design professionnel** niveau gouvernemental

---

**Version 2.0 - Février 2026**