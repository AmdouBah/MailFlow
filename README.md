# MailFlow — Guide d'installation complet

## Présentation
MailFlow est une application d'automatisation d'emails white-label. Chaque client dispose de sa propre instance indépendante (GitHub + Vercel + Firebase).

---

## Prérequis
- Node.js 18+
- Compte Firebase (gratuit)
- Compte Vercel (gratuit)
- Compte GitHub

---

## Étape 1 — Créer le projet Firebase

1. Accédez à [console.firebase.google.com](https://console.firebase.google.com)
2. Cliquez sur **Ajouter un projet**
3. Nom du projet : `mailflow-[nom-client]`
4. Désactivez Google Analytics (optionnel)
5. **Activer l'authentification** :
   - Menu > Authentication > Commencer
   - Onglet "Sign-in method" > Email/Mot de passe > Activer
   - Créez le compte admin : Authentication > Utilisateurs > Ajouter un utilisateur
6. **Activer Firestore** :
   - Menu > Firestore Database > Créer une base de données
   - Choisissez le mode **Production**
   - Région recommandée : `europe-west1`
7. **Règles de sécurité Firestore** (Menu > Firestore > Onglet Règles) :

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

8. **Récupérer les clés** :
   - Paramètres du projet (roue dentée) > Général
   - Section "Vos applications" > Ajouter une application Web
   - Copiez les valeurs `firebaseConfig`

9. **Clé Admin SDK** :
   - Paramètres > Comptes de service > Générer une nouvelle clé privée
   - Téléchargez le fichier JSON

---

## Étape 2 — Configurer le projet localement

```bash
# Cloner le dépôt
git clone https://github.com/[votre-org]/mailflow-[client].git
cd mailflow-[client]

# Installer les dépendances
npm install

# Copier le fichier d'environnement
cp .env.local.example .env.local
```

Ouvrez `.env.local` et remplissez les valeurs :

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=mailflow-client.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=mailflow-client
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=mailflow-client.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123:web:abc123

FIREBASE_ADMIN_PROJECT_ID=mailflow-client
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxx@mailflow-client.iam.gserviceaccount.com
# Encodez la clé privée en base64 :
# node -e "const k=require('./serviceAccount.json'); console.log(Buffer.from(k.private_key).toString('base64'))"
FIREBASE_ADMIN_PRIVATE_KEY_BASE64=LS0tLS1...

ENCRYPTION_KEY=votre-cle-32-caracteres-aleatoires
NEXTAUTH_SECRET=$(openssl rand -hex 32)
NEXT_PUBLIC_APP_URL=https://mailflow-client.vercel.app
```

---

## Étape 3 — Lancer en local

```bash
npm run dev
# → http://localhost:3000
```

---

## Étape 4 — Déployer sur Vercel

1. Allez sur [vercel.com](https://vercel.com) > New Project
2. Importez votre dépôt GitHub
3. Framework : **Next.js** (détecté automatiquement)
4. **Variables d'environnement** : Ajoutez toutes les variables de `.env.local`
5. Cliquez **Deploy**

---

## Étape 5 — Configurer l'envoi d'emails

Connectez-vous à MailFlow > **Paramètres** > **Configuration email**

### Recommandé : Amazon SES (0,10$ / 1000 emails)
1. Créez un compte AWS
2. Activez SES dans une région (ex: `eu-west-1`)
3. Vérifiez votre domaine expéditeur
4. Créez une clé IAM avec permission `ses:SendEmail`
5. Renseignez Access Key + Secret + Region dans les paramètres

### Alternative gratuite : Gmail SMTP
- Host : `smtp.gmail.com`, Port : `587`
- Activez l'authentification à 2 facteurs sur votre compte Google
- Créez un **Mot de passe d'application** (non votre mot de passe habituel)
- Limite : 500 emails/jour

---

## Étape 6 — Configurer l'IA (optionnel)

Paramètres > **Configuration IA**

### Gratuit : Google Gemini Flash
1. [aistudio.google.com](https://aistudio.google.com) > Get API Key
2. Collez la clé dans les paramètres IA
3. Limite gratuite : 15 requêtes/minute

---

## Structure Firestore

Les index composites suivants sont recommandés pour les performances :

| Collection | Champs | Ordre |
|---|---|---|
| contacts | status, createdAt | ASC, DESC |
| emails | campaignId, status | ASC, ASC |
| emails | campaignId, sentAt | ASC, DESC |
| aiReplies | status, sentAt | ASC, DESC |

---

## Support

Pour toute question, consultez la documentation ou ouvrez une issue GitHub.
