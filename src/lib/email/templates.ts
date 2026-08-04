import type { Contact } from '@/types';

const VARIABLE_REGEX = /\{\{([^}]+)\}\}/g;

export interface TemplateVariables {
  prénom?: string;
  nom?: string;
  email?: string;
  entreprise?: string;
  unsubscribe_link?: string;
  [key: string]: string | undefined;
}

/**
 * Injecte les variables dans le contenu HTML/texte d'un email.
 * Supporte {{prénom}}, {{nom}}, {{email}}, {{entreprise}}, {{unsubscribe_link}}
 * + tout champ personnalisé du contact.
 */
export function injectVariables(content: string, variables: TemplateVariables): string {
  return content.replace(VARIABLE_REGEX, (_, key) => {
    const trimmedKey = key.trim();
    return variables[trimmedKey] ?? variables[trimmedKey.toLowerCase()] ?? `{{${trimmedKey}}}`;
  });
}

export function buildVariablesFromContact(
  contact: Contact,
  unsubscribeLink: string,
  trackingPixelUrl: string
): TemplateVariables {
  const vars: TemplateVariables = {
    prénom: contact.firstName || '',
    prenom: contact.firstName || '',
    nom: contact.lastName || '',
    email: contact.email,
    entreprise: contact.company || '',
    company: contact.company || '',
    unsubscribe_link: unsubscribeLink,
    // Champs personnalisés
    ...Object.fromEntries(
      Object.entries(contact.customFields || {}).map(([k, v]) => [k, v])
    ),
  };
  return vars;
}

/**
 * Prépare le HTML final pour l'envoi :
 * - Injecte les variables
 * - Ajoute le pixel de tracking
 * - Remplace les liens par des liens de tracking
 */
export function prepareEmailHtml(
  htmlTemplate: string,
  variables: TemplateVariables,
  trackingPixelUrl: string,
  appUrl: string,
  emailId: string
): string {
  // 1. Injecter les variables
  let html = injectVariables(htmlTemplate, variables);

  // 2. Remplacer les liens par des liens de tracking
  html = html.replace(
    /href="(https?:\/\/[^"]+)"/g,
    (_, url) => {
      // Ne pas tracker le lien de désinscription
      if (url.includes('/api/unsubscribe') || url.includes('/unsubscribe')) return `href="${url}"`;
      const trackUrl = `${appUrl}/api/track/click?id=${emailId}&url=${encodeURIComponent(url)}`;
      return `href="${trackUrl}"`;
    }
  );

  // 3. Ajouter le pixel de tracking avant </body>
  const pixel = `<img src="${trackingPixelUrl}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;" />`;
  
  if (html.includes('</body>')) {
    html = html.replace('</body>', `${pixel}</body>`);
  } else {
    html += pixel;
  }

  return html;
}

export function getAvailableVariables(contacts: Contact[]): string[] {
  const standard = ['prénom', 'nom', 'email', 'entreprise', 'unsubscribe_link'];
  const custom = new Set<string>();
  for (const c of contacts.slice(0, 50)) {
    for (const key of Object.keys(c.customFields || {})) {
      custom.add(key);
    }
  }
  return [...standard, ...Array.from(custom)];
}
