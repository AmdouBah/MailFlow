'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AppShell } from '@/components/layout/AppShell';
import { getSettings, updateSettings } from '@/lib/firebase/firestore';
import { encrypt } from '@/lib/utils/crypto';
import type { AppSettings, SmtpProvider, AiProvider, AiReplyDelay, AiLanguage } from '@/types';
import { CheckCircle, XCircle, Loader2, Server, Bot, User, Info } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const TABS = ['smtp', 'ai', 'sender'] as const;
type Tab = typeof TABS[number];

export default function SettingsPage() {
  const t = useTranslations('settings');
  const [activeTab, setActiveTab] = useState<Tab>('smtp');
  const [settings, setSettings] = useState<Partial<AppSettings>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    getSettings().then((s) => {
      setSettings(s);
      setLoading(false);
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      // Chiffrer les secrets avant sauvegarde
      const toSave = { ...settings };
      if (toSave.smtp) {
        if (toSave.smtp.password) toSave.smtp.password = encrypt(toSave.smtp.password);
        if (toSave.smtp.apiKey) toSave.smtp.apiKey = encrypt(toSave.smtp.apiKey);
        if (toSave.smtp.awsAccessKey) toSave.smtp.awsAccessKey = encrypt(toSave.smtp.awsAccessKey);
        if (toSave.smtp.awsSecretKey) toSave.smtp.awsSecretKey = encrypt(toSave.smtp.awsSecretKey);
      }
      if (toSave.ai?.apiKey) {
        toSave.ai.apiKey = encrypt(toSave.ai.apiKey);
      }
      await updateSettings(toSave);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  async function handleTestSmtp() {
    if (!settings.smtp) return;
    setTestingSmtp(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/smtp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: settings.smtp }),
      });
      const result = await res.json();
      setTestResult({
        success: result.success,
        message: result.success ? t('testSuccess') : (result.error || t('testFail')),
      });
    } catch {
      setTestResult({ success: false, message: t('testFail') });
    } finally {
      setTestingSmtp(false);
    }
  }

  function updateSmtp(key: string, value: string | number | boolean) {
    setSettings((s) => ({ ...s, smtp: { ...s.smtp, [key]: value } as any }));
  }

  function updateAi(key: string, value: string | boolean) {
    setSettings((s) => ({ ...s, ai: { ...s.ai, [key]: value } as any }));
  }

  function updateSender(key: string, value: string) {
    setSettings((s) => ({ ...s, sender: { ...s.sender, [key]: value } as any }));
  }

  if (loading) {
    return (
      <AppShell title={t('title')}>
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={t('title')}>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-secondary rounded-xl w-fit">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                activeTab === tab ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab === 'smtp' && <Server size={14} className="inline mr-1.5 mb-0.5" />}
              {tab === 'ai' && <Bot size={14} className="inline mr-1.5 mb-0.5" />}
              {tab === 'sender' && <User size={14} className="inline mr-1.5 mb-0.5" />}
              {t(tab)}
            </button>
          ))}
        </div>

        {/* SMTP Tab */}
        {activeTab === 'smtp' && (
          <div className="card p-6 space-y-5 animate-fade-in">
            <div>
              <h2 className="font-semibold">{t('smtp')}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{t('smtpDesc')}</p>
            </div>

            {/* Recommendation */}
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
              <Info size={14} className="inline mr-1.5 mb-0.5" />
              {t('smtpRecommendation')}
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="label">{t('provider')}</label>
                <select
                  value={settings.smtp?.provider || 'gmail'}
                  onChange={(e) => updateSmtp('provider', e.target.value)}
                  className="input"
                >
                  <option value="gmail">Gmail SMTP</option>
                  <option value="brevo">Brevo</option>
                  <option value="ses">Amazon SES</option>
                  <option value="resend">Resend</option>
                  <option value="custom">SMTP personnalisé</option>
                </select>
              </div>

              {/* Gmail / Brevo / Resend */}
              {['gmail', 'brevo', 'resend'].includes(settings.smtp?.provider || 'gmail') && (
                <>
                  <div className="space-y-1.5">
                    <label className="label">{t('user')}</label>
                    <input type="text" value={settings.smtp?.user || ''} onChange={(e) => updateSmtp('user', e.target.value)} className="input" placeholder="votre@email.com" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="label">
                      {settings.smtp?.provider === 'gmail' ? 'Mot de passe d\'application' : t('apiKey')}
                    </label>
                    <input type="password" value={settings.smtp?.password || settings.smtp?.apiKey || ''} onChange={(e) => updateSmtp(settings.smtp?.provider === 'gmail' ? 'password' : 'apiKey', e.target.value)} className="input" placeholder="••••••••" />
                  </div>
                </>
              )}

              {/* Amazon SES */}
              {settings.smtp?.provider === 'ses' && (
                <>
                  <div className="space-y-1.5">
                    <label className="label">{t('region')}</label>
                    <select value={settings.smtp?.awsRegion || 'eu-west-1'} onChange={(e) => updateSmtp('awsRegion', e.target.value)} className="input">
                      <option value="us-east-1">us-east-1 (N. Virginia)</option>
                      <option value="eu-west-1">eu-west-1 (Ireland)</option>
                      <option value="ap-southeast-1">ap-southeast-1 (Singapore)</option>
                      <option value="me-south-1">me-south-1 (Bahrain)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="label">{t('accessKey')}</label>
                    <input type="text" value={settings.smtp?.awsAccessKey || ''} onChange={(e) => updateSmtp('awsAccessKey', e.target.value)} className="input" placeholder="AKIA..." />
                  </div>
                  <div className="space-y-1.5">
                    <label className="label">{t('secretKey')}</label>
                    <input type="password" value={settings.smtp?.awsSecretKey || ''} onChange={(e) => updateSmtp('awsSecretKey', e.target.value)} className="input" placeholder="••••••••" />
                  </div>
                </>
              )}

              {/* Custom SMTP */}
              {settings.smtp?.provider === 'custom' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="label">{t('host')}</label>
                      <input type="text" value={settings.smtp?.host || ''} onChange={(e) => updateSmtp('host', e.target.value)} className="input" placeholder="smtp.example.com" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="label">{t('port')}</label>
                      <input type="number" value={settings.smtp?.port || 587} onChange={(e) => updateSmtp('port', parseInt(e.target.value))} className="input" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="label">{t('user')}</label>
                    <input type="text" value={settings.smtp?.user || ''} onChange={(e) => updateSmtp('user', e.target.value)} className="input" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="label">{t('password')}</label>
                    <input type="password" value={settings.smtp?.password || ''} onChange={(e) => updateSmtp('password', e.target.value)} className="input" placeholder="••••••••" />
                  </div>
                </>
              )}

              {/* Test SMTP */}
              <div className="flex items-center gap-3 pt-2">
                <button onClick={handleTestSmtp} disabled={testingSmtp} className="btn-secondary flex items-center gap-2">
                  {testingSmtp ? <Loader2 size={14} className="animate-spin" /> : null}
                  {t('testSmtp')}
                </button>
                {testResult && (
                  <span className={`flex items-center gap-1.5 text-sm ${testResult.success ? 'text-emerald-600' : 'text-red-600'}`}>
                    {testResult.success ? <CheckCircle size={14} /> : <XCircle size={14} />}
                    {testResult.message}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* AI Tab */}
        {activeTab === 'ai' && (
          <div className="card p-6 space-y-5 animate-fade-in">
            <div>
              <h2 className="font-semibold">{t('ai')}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{t('aiDesc')}</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="label">{t('provider')}</label>
                <select value={settings.ai?.provider || 'gemini'} onChange={(e) => updateAi('provider', e.target.value)} className="input">
                  <option value="gemini">Google Gemini 1.5 Flash (gratuit)</option>
                  <option value="openai">OpenAI GPT-4o mini</option>
                  <option value="anthropic">Anthropic Claude Haiku</option>
                  <option value="custom">API compatible OpenAI (custom)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="label">{t('apiKey')}</label>
                <input type="password" value={settings.ai?.apiKey || ''} onChange={(e) => updateAi('apiKey', e.target.value)} className="input" placeholder="••••••••" />
              </div>

              {settings.ai?.provider === 'custom' && (
                <div className="space-y-1.5">
                  <label className="label">Endpoint API</label>
                  <input type="url" value={settings.ai?.customEndpoint || ''} onChange={(e) => updateAi('customEndpoint', e.target.value)} className="input" placeholder="https://api.example.com/v1" />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="label">{t('businessContext')}</label>
                <textarea
                  value={settings.ai?.businessContext || ''}
                  onChange={(e) => updateAi('businessContext', e.target.value)}
                  className="input min-h-[140px] resize-y"
                  placeholder={t('businessContextPlaceholder')}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="label">{t('replyDelay')}</label>
                  <select value={settings.ai?.replyDelay || 'immediate'} onChange={(e) => updateAi('replyDelay', e.target.value)} className="input">
                    <option value="immediate">Immédiat</option>
                    <option value="5min">5 minutes</option>
                    <option value="15min">15 minutes</option>
                    <option value="1h">1 heure</option>
                    <option value="disabled">Désactivé</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="label">{t('language')}</label>
                  <select value={settings.ai?.language || 'auto'} onChange={(e) => updateAi('language', e.target.value)} className="input">
                    <option value="auto">Automatique</option>
                    <option value="fr">Français</option>
                    <option value="en">Anglais</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-secondary transition-colors">
                <input
                  type="checkbox"
                  checked={settings.ai?.supervisionMode || false}
                  onChange={(e) => updateAi('supervisionMode', e.target.checked)}
                  className="w-4 h-4 rounded accent-primary"
                />
                <span className="text-sm">{t('supervisionMode')}</span>
              </label>
            </div>
          </div>
        )}

        {/* Sender Tab */}
        {activeTab === 'sender' && (
          <div className="card p-6 space-y-5 animate-fade-in">
            <div>
              <h2 className="font-semibold">{t('sender')}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{t('senderDesc')}</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="label">{t('senderName')}</label>
                <input type="text" value={settings.sender?.name || ''} onChange={(e) => updateSender('name', e.target.value)} className="input" placeholder="Mon Entreprise" />
              </div>
              <div className="space-y-1.5">
                <label className="label">{t('senderEmail')}</label>
                <input type="email" value={settings.sender?.email || ''} onChange={(e) => updateSender('email', e.target.value)} className="input" placeholder="contact@monentreprise.com" />
              </div>
            </div>
          </div>
        )}

        {/* Save button */}
        <div className="flex justify-end">
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 px-8">
            {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <CheckCircle size={16} /> : null}
            {saving ? t('saving') : saved ? t('saved') : t('save')}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
