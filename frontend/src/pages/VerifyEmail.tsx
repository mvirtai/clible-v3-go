import { useState, useEffect, useActionState, useTransition } from 'react';
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import { Mail, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';

interface ActionState {
  success: boolean;
  error: string | null;
}

const initialActionState: ActionState = {
  success: false,
  error: null,
};

/**
 * Email verification page component.
 * Supports automated link token activation as well as 6-digit manual OTP code input.
 * Strictly aligned with modern React 19.2+ and optimized for React Compiler.
 *
 * @returns Rendered email verification view.
 */
export function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { strings } = useLanguage();
  const { verifyEmail } = useAuth();

  // Pure derived state from router context
  const urlToken = searchParams.get('token') || '';
  const email = (location.state as { email?: string } | null)?.email || '';

  // 1. React 19 useActionState for manual OTP form submission
  const [otpState, submitOtp, isOtpPending] = useActionState<ActionState, FormData>(
    async (_prevState, formData) => {
      const code = ((formData.get('code') as string) || '').replace(/\D/g, '');
      if (code.length !== 6) {
        return { success: false, error: strings.enterVerificationCode };
      }
      try {
        await verifyEmail({ email: email || undefined, code });
        setTimeout(() => navigate('/'), 1200);
        return { success: true, error: null };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : strings.errUnexpected,
        };
      }
    },
    initialActionState
  );

  // 2. Action state for automated link token activation
  const [tokenState, setTokenState] = useState<ActionState>(initialActionState);
  const [isTokenPending, setIsTokenPending] = useState(() => Boolean(urlToken));

  // 3. React 19 useTransition and timer for resending verification code
  const [cooldown, setCooldown] = useState(0);
  const [isResending, startResendTransition] = useTransition();
  const [resendError, setResendError] = useState<string | null>(null);

  // Automated link verification when URL token is present (imperative external URL integration)
  useEffect(() => {
    if (!urlToken) return;

    let isMounted = true;

    verifyEmail({ token: urlToken })
      .then(() => {
        if (isMounted) {
          setTokenState({ success: true, error: null });
          setTimeout(() => navigate('/'), 1500);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setTokenState({
            success: false,
            error: err instanceof Error ? err.message : strings.errUnexpected,
          });
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsTokenPending(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [urlToken, navigate, strings, verifyEmail]);

  // Cooldown countdown timer for resend action
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResend = () => {
    if (cooldown > 0 || !email) return;
    setResendError(null);
    startResendTransition(async () => {
      try {
        await apiService.resendVerification(email);
        setCooldown(60);
      } catch (err) {
        setResendError(err instanceof Error ? err.message : strings.errUnexpected);
      }
    });
  };

  // Pure derived states
  const isPending = isTokenPending || isOtpPending || isResending;
  const isSuccess = tokenState.success || otpState.success;
  const activeError = tokenState.error || otpState.error || resendError;

  return (
    <div className="flex items-center justify-center min-h-screen px-4" style={{ background: 'var(--bg)' }}>
      {/* React 19 Document Metadata Hoisting */}
      <title>{`${isSuccess ? strings.verificationSuccess : strings.verifyEmailTitle} – Clible Workspace`}</title>

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
          {isSuccess ? <CheckCircle2 size={32} /> : <Mail size={32} />}
        </div>

        <h1 className="text-2xl font-bold tracking-tight mb-2" style={{ color: 'var(--text)' }}>
          {isSuccess ? strings.verificationSuccess : strings.verifyEmailTitle}
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
          {strings.verifyEmailSubtitle} {email && <strong className="text-[var(--text)]">{email}</strong>}
        </p>

        {activeError && (
          <div
            role="alert"
            className="p-3 mb-5 text-sm rounded-xl border bg-red-500/10 border-red-500/30 text-red-500 flex items-center gap-2 text-left"
          >
            <AlertCircle size={16} className="shrink-0" />
            <span>{activeError}</span>
          </div>
        )}

        {!urlToken && !isSuccess && (
          <form action={submitOtp} className="space-y-4">
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
                name="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="123456"
                autoFocus
                autoComplete="one-time-code"
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, '');
                  if (cleaned !== e.target.value) {
                    e.target.value = cleaned;
                  }
                  if (cleaned.length === 6) {
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
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
              disabled={isPending}
              className="w-full py-3.5 rounded-xl font-medium tracking-wide btn-tactile btn-accent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? strings.verifyingLabel : strings.verifyButton}
            </button>
          </form>
        )}

        {!isSuccess && (
          <div className="mt-6 pt-4 border-t flex flex-col items-center gap-3" style={{ borderColor: 'var(--border)' }}>
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || isResending}
              className="text-xs font-medium hover:underline inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ color: 'var(--accent)' }}
            >
              <RefreshCw size={13} className={cooldown > 0 || isResending ? 'animate-spin-slow' : ''} />
              {cooldown > 0
                ? strings.resendCodeCooldown.replace('{seconds}', cooldown.toString())
                : strings.resendCodeLabel}
            </button>

            <Link
              to="/login"
              className="text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors hover:underline"
            >
              ← {strings.loginLink}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default VerifyEmail;
