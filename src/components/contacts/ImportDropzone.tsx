'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X } from 'lucide-react';
import { parseCSV } from '@/lib/utils/csv';
import type { CsvRow } from '@/types';

interface ImportDropzoneProps {
  onParsed: (rows: CsvRow[]) => void;
}

export function ImportDropzone({ onParsed }: ImportDropzoneProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');

  const onDrop = useCallback(async (accepted: File[]) => {
    const f = accepted[0];
    if (!f) return;
    setFile(f);
    setParsing(true);
    setError('');
    try {
      const rows = await parseCSV(f);
      onParsed(rows);
    } catch {
      setError('Impossible de lire ce fichier. Vérifiez le format CSV.');
    } finally {
      setParsing(false);
    }
  }, [onParsed]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'text/plain': ['.csv', '.txt'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  function clearFile() {
    setFile(null);
    onParsed([]);
  }

  if (file && !parsing) {
    return (
      <div className="flex items-center gap-4 p-5 rounded-xl border border-emerald-200 bg-emerald-50">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
          <FileText className="w-5 h-5 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-emerald-800 truncate">{file.name}</p>
          <p className="text-xs text-emerald-600">{(file.size / 1024).toFixed(1)} KB</p>
        </div>
        <button onClick={clearFile} className="p-1 hover:bg-emerald-100 rounded-lg transition-colors">
          <X className="w-4 h-4 text-emerald-600" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        {...getRootProps()}
        className={`
          flex flex-col items-center justify-center gap-4 p-12 rounded-xl border-2 border-dashed
          cursor-pointer transition-all duration-200
          ${isDragActive
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-border hover:border-primary/50 hover:bg-secondary/50'
          }
        `}
      >
        <input {...getInputProps()} />
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
          isDragActive ? 'bg-primary/10' : 'bg-secondary'
        }`}>
          {parsing ? (
            <span className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          ) : (
            <Upload className={`w-7 h-7 ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
          )}
        </div>
        <div className="text-center">
          {parsing ? (
            <p className="text-sm font-medium text-foreground">Lecture du fichier...</p>
          ) : isDragActive ? (
            <p className="text-sm font-medium text-primary">Déposez le fichier ici</p>
          ) : (
            <>
              <p className="text-sm font-medium text-foreground">
                Glissez-déposez votre fichier CSV ici
              </p>
              <p className="text-xs text-muted-foreground mt-1">ou cliquez pour parcourir</p>
            </>
          )}
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Format attendu : <strong>email</strong>, prénom, nom, téléphone, entreprise + champs personnalisés
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Taille max : 10MB</p>
        </div>
      </div>

      {error && (
        <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
