# MailFlow ✉️🌊

> Application Web d'automatisation d'emails intelligents et de gestion de campagnes B2B.

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-cyan)](https://tailwindcss.com)
[![Firebase](https://img.shields.io/badge/Firebase-Admin-orange)](https://firebase.google.com)
[![AWS SES](https://img.shields.io/badge/AWS-SES-yellow)](https://aws.amazon.com/ses/)

---

## ✨ Fonctionnalités

| Module | Description |
|---|---|
| 📝 **Éditeur Riche** | Éditeur Tiptap intégré pour la rédaction des templates (formatting, liens, variables) |
| 🚀 **Envoi Multi-Canal** | Routage intelligent via AWS SES et relais SMTP classique (Nodemailer) |
| 🤖 **Réponses & Génération IA** | Intégration native de OpenAI, Anthropic (Claude) et Google Gemini |
| 📊 **Dashboard & Tracking** | Suivi temps réel des ouvertures/clics via Recharts |
| 🔐 **Authentification** | Système d'authentification robuste et gestion de sessions via Firebase |
| 🌍 **Internationalisation** | Support multilingue natif (next-intl) |
| ⚙️ **Gestion des Contacts** | Import/Export CSV (PapaParse) avec détection automatique des colonnes |

---

## 🚀 Déploiement sur Vercel (Production)

### Étape 1 — Prérequis
1. **Compte Vercel** : [vercel.com](https://vercel.com) (gratuit)
2. **Projet Firebase** : [console.firebase.google.com](https://console.firebase.google.com)
3. **AWS IAM & SES** : Identifiants AWS avec accès à Simple Email Service
4. **Clés API IA** : OpenAI, Anthropic ou Google AI Studio

### Étape 2 — Configuration Firebase
1. Dans Firebase, activez **Firestore Database**.
2. Allez dans **Paramètres du projet** → **Comptes de service** → **Générer une nouvelle clé privée**.
3. Notez les valeurs suivantes du fichier JSON :
   - `project_id`
   - `client_email`
   - `private_key`

**Règles Firestore recommandées :**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Étape 3 — Déploiement Vercel
1. Allez sur **Vercel** → **Add New Project** → Importez votre dépôt `MailFlow`.
2. Vercel détectera automatiquement **Next.js**.
3. Dans la section **Environment Variables**, ajoutez les clés ci-dessous.

#### Variables d'environnement requises :
```env
# Configuration Next.js / Auth
NEXT_PUBLIC_APP_URL=https://votre-app-vercel.app

# Firebase Admin SDK
FIREBASE_PROJECT_ID=votre-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@votre-projet.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n"
NEXT_PUBLIC_FIREBASE_API_KEY=xxx

# AWS SES
AWS_REGION=eu-west-3
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# APIs Intelligence Artificielle (Selon vos besoins)
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx
GEMINI_API_KEY=AIzaSyxxx
```
*Note : Assurez-vous d'entourer la clé privée Firebase de guillemets et de préserver les `\n`.*

---

## 💻 Développement Local

```bash
# 1. Cloner le dépôt
git clone https://github.com/AmdouBah/MailFlow.git
cd MailFlow

# 2. Installer les dépendances
npm install

# 3. Configurer les variables (Copiez les variables de l'étape 3 dans ce fichier)
touch .env.local

# 4. Démarrer le serveur de développement
npm run dev
```
L'application sera accessible sur `http://localhost:3000`.

---

## 📁 Structure du Projet

```
MailFlow/
├── src/
│   ├── app/                # Routes App Router Next.js (Pages & API Routes)
│   ├── components/         # Composants UI réutilisables (Radix UI / Tailwind)
│   ├── hooks/              # Custom React hooks
│   ├── lib/
│   │   ├── aws/            # Configuration Client AWS SES
│   │   ├── firebase/       # Init Firebase Admin & Client
│   │   ├── ai/             # Wrappers pour OpenAI, Anthropic, Gemini
│   │   └── utils/          # Fonctions utilitaires, helpers
│   ├── types/              # Définitions TypeScript strictes
│   ├── i18n.ts             # Configuration next-intl
│   └── middleware.ts       # Middleware Next.js (Auth & Routing)
├── package.json
└── tailwind.config.ts
```

---

## 🛡️ Sécurité & Architecture

| Composant | Implémentation technique |
|---|---|
| **App Router & Server Actions** | Protection CSRF native par Next.js, code côté serveur isolé. |
| **Envoi d'Emails** | AWS SES est géré exclusivement côté serveur (`src/app/api/...`) pour protéger les clés AWS. |
| **Gestion des Mots de Passe** | `crypto-js` pour le chiffrement des données sensibles des campagnes. |
| **Validation des Données** | Utilisation de `Zod` pour valider toutes les entrées utilisateurs et API. |

---

## 📞 Support & Maintenance
Développé et maintenu par **AmdouBah**. Pour toute question technique, n'hésitez pas à ouvrir une issue.
