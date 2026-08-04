import Papa from 'papaparse';
import type { CsvRow } from '@/types';

// Mapping des noms de colonnes fréquents → clés standard
const FIELD_ALIASES: Record<string, keyof CsvRow> = {
  // email
  email: 'email',
  'e-mail': 'email',
  mail: 'email',
  courriel: 'email',
  // firstName
  prenom: 'firstName',
  prénom: 'firstName',
  firstname: 'firstName',
  'first name': 'firstName',
  'first_name': 'firstName',
  // lastName
  nom: 'lastName',
  lastname: 'lastName',
  'last name': 'lastName',
  'last_name': 'lastName',
  // phone
  telephone: 'phone',
  téléphone: 'phone',
  phone: 'phone',
  'phone number': 'phone',
  tel: 'phone',
  mobile: 'phone',
  // company
  entreprise: 'company',
  societe: 'company',
  société: 'company',
  company: 'company',
  organisation: 'company',
  organization: 'company',
};

function normalizeKey(key: string): string {
  return key.toLowerCase().trim().replace(/\s+/g, ' ');
}

export function parseCSV(file: File): Promise<CsvRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (results) => {
        try {
          const rows: CsvRow[] = results.data.map((raw: any) => {
            const row: CsvRow = { email: '' };
            
            for (const [key, value] of Object.entries(raw)) {
              const normalizedKey = normalizeKey(key);
              const standardKey = FIELD_ALIASES[normalizedKey];
              
              if (standardKey) {
                row[standardKey] = String(value || '').trim();
              } else {
                // Champ personnalisé
                row[key] = String(value || '').trim();
              }
            }
            
            return row;
          });
          
          // Filtrer les lignes sans email
          const valid = rows.filter((r) => r.email && r.email.includes('@'));
          resolve(valid);
        } catch (err) {
          reject(err);
        }
      },
      error: (err) => reject(err),
    });
  });
}

export function detectCustomFields(rows: CsvRow[]): string[] {
  if (!rows.length) return [];
  const standardKeys = new Set(['email', 'firstName', 'lastName', 'phone', 'company']);
  const allKeys = new Set<string>();
  
  for (const row of rows.slice(0, 10)) {
    for (const key of Object.keys(row)) {
      if (!standardKeys.has(key)) allKeys.add(key);
    }
  }
  
  return Array.from(allKeys);
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
