'use client';

import { useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, AlertCircle, Home } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

function UnsubscribeContent() {
  const params = useSearchParams();
  const status = params.get('status');

  const config = {
    success: {
      icon: CheckCircle,
      iconColor: 'text-emerald-500',
      bg: 'bg-emerald-50',
      title: 'Désinscription confirmée',
      message: 'Vous avez été désinscrit avec succès. Vous ne recevrez plus d\'emails de notre part.',
    },
    already: {
      icon: AlertCircle,
      iconColor: 'text-yellow-500',
      bg: 'bg-yellow-50',
      title: 'Déjà désinscrit',
      message: 'Vous étiez déjà désinscrit de notre liste.',
    },
    error: {
      icon: XCircle,
      iconColor: 'text-red-500',
      bg: 'bg-red-50',
      title: 'Erreur',
      message: 'Un problème est survenu lors de votre désinscription. Veuillez réessayer.',
    },
    not_found: {
      icon: XCircle,
      iconColor: 'text-red-500',
      bg: 'bg-red-50',
      title: 'Lien invalide',
      message: 'Ce lien de désinscription est invalide ou a déjà été utilisé.',
    },
  };

  const c = config[status as keyof typeof config] || config.error;
  const Icon = c.icon;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className={`w-20 h-20 ${c.bg} rounded-full flex items-center justify-center mx-auto`}>
          <Icon className={`w-10 h-10 ${c.iconColor}`} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{c.title}</h1>
          <p className="text-muted-foreground">{c.message}</p>
        </div>
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
          <Home size={14} /> Retour à l'accueil
        </Link>
        <p className="text-xs text-muted-foreground">
          Powered by {process.env.NEXT_PUBLIC_APP_NAME || 'MailFlow'}
        </p>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <span className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    }>
      <UnsubscribeContent />
    </Suspense>
  );
}
