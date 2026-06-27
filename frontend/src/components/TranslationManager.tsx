// src/components/TranslationManager.tsx
import React, { useState } from 'react';
import { apiService } from '../services/api';
import { Upload, Download, Loader2 } from 'lucide-react';

interface Props {
  onTranslationInstalled?: () => void;
}

interface PresetTranslation {
  id: string;
  name: string;
  lang: string;
  filename: string;
}

const PRESET_TRANSLATIONS: PresetTranslation[] = [
  { id: 'fin-biblia', name: 'Biblia (1776)', lang: 'fi', filename: 'fin-biblia.osis.xml' },
  { id: 'web', name: 'World English Bible', lang: 'en', filename: 'eng-web.osis.xml' },
  { id: 'kjv', name: 'King James Version', lang: 'en', filename: 'eng-kjv.osis.xml' },
];

export const TranslationManager: React.FC<Props> = ({ onTranslationInstalled }) => {
  const [file, setFile] = useState<File | null>(null);
  const [transId, setTransId] = useState('');
  const [transName, setTransName] = useState('');
  const [lang, setLang] = useState('fi');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);

      const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
      setTransId(nameWithoutExt.substring(0, 15).toLowerCase().replace(/[^a-z0-9-]/g, ""));
      setTransName(nameWithoutExt);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !transId || !transName || !lang) return;

    setLoading(true);
    setStatus(null);
    try {
      await apiService.importTranslation(
        transId.trim().toLowerCase(),
        transName.trim(),
        lang.trim().toLowerCase(),
        file
      );
      setStatus({ type: 'success', message: `Translation "${transName}" successfully imported to the database!` });
      setFile(null);
      if (onTranslationInstalled) onTranslationInstalled();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus({ type: 'error', message: msg || 'Import failed. Ensure the XML file is valid.' });
    } finally {
      setLoading(false);
    }
  };

  // Downloads the selected translation from the open-bibles repository and uploads it to the backend
  const handleInstallPreset = async (preset: PresetTranslation) => {
    setLoading(true);
    setStatus(null);
    const url = `https://raw.githubusercontent.com/seven1m/open-bibles/master/${preset.filename}`;

    try {
      setStatus({ type: 'success', message: `Downloading translation "${preset.name}" from GitHub...` });

      const response = await fetch(url);
      if (!response.ok) throw new Error(`File download failed (HTTP ${response.status})`);

      const blob = await response.blob();
      const xmlFile = new File([blob], preset.filename, { type: "text/xml" });

      setStatus({ type: 'success', message: `Translation file downloaded. Installing into database "${preset.id}" (this may take 10-30 seconds)...` });
      await apiService.importTranslation(preset.id, preset.name, preset.lang, xmlFile);

      setStatus({ type: 'success', message: `Translation "${preset.name}" successfully installed!` });
      if (onTranslationInstalled) onTranslationInstalled();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus({ type: 'error', message: msg || `Installation of ${preset.name} failed.` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl p-8 space-y-6" style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
    }}>
      <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
        Translation Management
      </h2>

      {status && (
        <div className="p-4 rounded-2xl text-sm flex items-start gap-3" style={{
          background: status.type === 'success' ? 'rgba(52,168,83,0.08)' : 'rgba(234,67,53,0.08)',
          border: `1px solid ${status.type === 'success' ? 'rgba(52,168,83,0.3)' : 'rgba(234,67,53,0.3)'}`,
          color: status.type === 'success' ? '#2d8a4e' : '#c0392b',
        }}>
          <span className="leading-relaxed">{status.message}</span>
        </div>
      )}

      {/* Preset installations */}
      <div className="space-y-3 pb-6" style={{ borderBottom: '1px solid var(--border-soft)' }}>
        <p className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>
          Install from Web (GitHub: open-bibles)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PRESET_TRANSLATIONS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleInstallPreset(preset)}
              disabled={loading}
              className="rounded-2xl p-4 text-xs font-medium flex flex-col items-center gap-2 transition-opacity hover:opacity-80 disabled:opacity-40"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                cursor: 'pointer',
              }}
            >
              {loading
                ? <Loader2 size={16} className="animate-spin" style={{ color: 'var(--accent)' }} />
                : <Download size={16} style={{ color: 'var(--accent)' }} />}
              <span className="font-semibold text-center">{preset.name}</span>
              <span style={{ color: 'var(--muted)' }}>{preset.lang.toUpperCase()}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Custom XML upload */}
      <form onSubmit={handleUpload} className="space-y-4">
        <p className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>
          Import Custom XML (USFX / OSIS)
        </p>

        <div className="rounded-2xl p-5 text-center relative cursor-pointer transition-colors"
          style={{ border: '2px dashed var(--border)', background: 'var(--surface-2)' }}>
          <input
            type="file"
            accept=".xml"
            onChange={handleFileChange}
            className="absolute inset-0 opacity-0 cursor-pointer"
            disabled={loading}
          />
          <Upload size={24} className="mx-auto mb-2" style={{ color: 'var(--muted)' }} />
          <span className="text-sm" style={{ color: 'var(--muted)' }}>
            {file ? file.name : 'Select XML file'}
          </span>
          {file && (
            <span className="block text-xs mt-1" style={{ color: 'var(--accent)' }}>
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </span>
          )}
        </div>

        {file && (
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs block mb-1" style={{ color: 'var(--muted)' }}>Name</label>
              <input
                type="text"
                placeholder="World English Bible"
                value={transName}
                onChange={(e) => setTransName(e.target.value)}
                className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                required
              />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--muted)' }}>ID</label>
              <input
                type="text"
                placeholder="web"
                value={transId}
                onChange={(e) => setTransId(e.target.value)}
                className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                required
              />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--muted)' }}>Language</label>
              <input
                type="text"
                placeholder="fi / en"
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="col-span-2 rounded-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-80 disabled:opacity-40"
              style={{ background: 'var(--text)', color: 'var(--bg)', cursor: 'pointer' }}
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
              Install
            </button>
          </div>
        )}
      </form>
    </div>
  );
};