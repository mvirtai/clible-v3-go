import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Mail, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { apiService } from '../services/api';

/**
 * Email verification page component.
 * Supports automated link token activation as well as 6-digit manual OTP code input.
 * Fully compliant with React 19.2+ and optimized for React Compiler.
 *
 * @returns Rendered email verification view.
 */
export function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { strings } = useLanguage();

  const urlToken = searchParams.get('token') || '';
  const emailFromState = (location.state as { email?: string } | null)?.email || '';
  const [email] = useState(emailFromState);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  // 1. Automated direct link verification if token is present in URL
  useEffect(() => {
    if (!urlToken) return;

    let isMounted = true;
    const verifyWithToken = async () => {
      setLoading(true);
      try {
        await apiService.verifyEmail({ token: urlToken });
        if (isMounted) {
          setSuccess(true);
          setTimeout(() => navigate('/'), 1500);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : strings.errUnexpected);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    verifyWithToken();
    return () => {
      isMounted = false;
    };
  }, [urlToken, navigate, strings]);

  // 2. Cooldown timer for resending verification code
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (code.length !== 6) return;

    setLoading(true);
    setError('');

    try {
      await apiService.verifyEmail({ email: email || undefined, code });
      setSuccess(true);
      setTimeout(() => navigate('/'), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : strings.errUnexpected);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || !email) return;
    try {
      await apiService.resendVerification(email);
      setCooldown(60);
    } catch (err) {
      setError(err instanceof Error ? err.message : strings.errUnexpected);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4" style={{ background: 'var(--bg)' }}>
      <div
        className="w-full max-w-md p-8 rounded-3xl border animate-fade-in text-center"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.06)',
        }}
      >
        <div
          className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center transition-transform hover:scale-105 duration-300"
          style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}
        >
          {success ? <CheckCircle2 size={32} /> : <Mail size={32} />}
        </div>

        <h1 className="text-2xl font-bold tracking-tight mb-2" style={{ color: 'var(--text)' }}>
          {success ? strings.verificationSuccess : strings.verifyEmailTitle}
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
          {strings.verifyEmailSubtitle} {email && <strong className="text-[var(--text)]">{email}</strong>}
        </p>

        {error && (
          <div
            role="alert"
            className="p-3 mb-5 text-sm rounded-xl border bg-red-500/10 border-red-500/30 text-red-500 flex items-center gap-2 text-left"
          >
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!urlToken && !success && (
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label
                htmlFor="verification-code"
                className="block text-xs font-semibold uppercase tracking-wider mb-2 text-left"
                style={{ color: 'var(--muted)' }}
              >
                {strings.enterVerificationCode}
              </label>
              <input
                id="verification-code"
                ref={inputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setCode(val);
                  if (val.length === 6) {
                    setTimeout(() => {
                      if (inputRef.current?.form) {
                        inputRef.current.form.requestSubmit();
                      }
                    }, 50);
                  }
                }}
                placeholder="123456"
                autoFocus
                autoComplete="one-time-code"
                className="w-full px-4 py-3 rounded-xl border text-center text-2xl font-mono tracking-widest transition-all focus:outline-none"
                style={{
                  background: 'var(--surface-2)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full py-3.5 rounded-xl font-medium tracking-wide btn-tactile btn-accent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? strings.verifyingLabel : strings.verifyButton}
            </button>
          </form>
        )}

        {!success && (
          <div className="mt-6 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0}
              className="text-xs font-medium hover:underline inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ color: 'var(--accent)' }}
            >
              <RefreshCw size={13} className={cooldown > 0 ? 'animate-spin-slow' : ''} />
              {cooldown > 0
                ? strings.resendCodeCooldown.replace('{seconds}', cooldown.toString())
                : strings.resendCodeLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default VerifyEmail;
