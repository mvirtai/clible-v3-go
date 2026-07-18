// frontend/src/pages/Register.tsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const { strings } = useLanguage();

  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const isPasswordValid = hasMinLength && hasNumber && hasUppercase && hasSpecial;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isPasswordValid) {
      setError('Salasana ei täytä kaikkia turvavaatimuksia.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Salasanat eivät täsmää.');
      return;
    }

    setLoading(true);

    try {
      await register(email, password);
      navigate('/');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Rekisteröityminen epäonnistui. Sähköposti saattaa olla jo käytössä.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4" style={{ background: 'var(--bg)' }}>
      <div
        className="w-full max-w-md p-8 rounded-3xl border animate-fade-in"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.06)',
        }}
      >
        <div className="flex flex-col items-center mb-8">
          <div className="p-4 rounded-full mb-4 transition-transform hover:scale-110 duration-300 flex items-center justify-center"
            style={{ 
              background: 'var(--accent-bg)', 
              color: 'var(--accent)',
              border: '1px solid var(--accent-border)',
              boxShadow: '0 4px 12px var(--accent-bg)',
            }}>
            <BookOpen size={28} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>
            {strings.registerTitle}
          </h1>
          <p className="text-sm mt-1.5" style={{ color: 'var(--muted)' }}>
            Rekisteröidy käyttääksesi Clible Workspacea
          </p>
        </div>

        {error && (
          <div className="p-3 mb-5 text-sm rounded-xl border bg-red-500/10 border-red-500/30 text-red-500">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>
              Sähköposti
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border transition-all duration-200 focus:outline-none"
              style={{
                background: 'var(--surface-2)',
                borderColor: 'var(--border)',
                color: 'var(--text)',
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>
              Salasana
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border transition-all duration-200 focus:outline-none"
              style={{
                background: 'var(--surface-2)',
                borderColor: 'var(--border)',
                color: 'var(--text)',
              }}
            />
          </div>

          {password && (
            <div
              className="text-xs space-y-1.5 p-3 rounded-xl animate-fade-in"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border-soft)',
              }}
            >
              <p className="font-semibold mb-1" style={{ color: 'var(--text)' }}>
                Salasanan vaatimukset:
              </p>
              <div className="flex items-center gap-2">
                <span
                  className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
                    hasMinLength ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                />
                <span style={{ color: hasMinLength ? 'var(--text)' : 'var(--muted)' }}>
                  Vähintään 8 merkkiä
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
                    hasUppercase ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                />
                <span style={{ color: hasUppercase ? 'var(--text)' : 'var(--muted)' }}>
                  Vähintään yksi iso kirjain (A-Z)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
                    hasNumber ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                />
                <span style={{ color: hasNumber ? 'var(--text)' : 'var(--muted)' }}>
                  Vähintään yksi numero (0-9)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
                    hasSpecial ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                />
                <span style={{ color: hasSpecial ? 'var(--text)' : 'var(--muted)' }}>
                  Vähintään yksi erikoismerkki
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>
              Vahvista salasana
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border transition-all duration-200 focus:outline-none"
              style={{
                background: 'var(--surface-2)',
                borderColor: 'var(--border)',
                color: 'var(--text)',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !isPasswordValid}
            className="w-full py-3.5 mt-2 rounded-xl font-medium tracking-wide btn-tactile btn-accent focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? strings.registeringLabel : strings.registerButton}
          </button>
        </form>

        <p className="text-sm text-center mt-6" style={{ color: 'var(--muted)' }}>
          Onko sinulla jo tili?{' '}
          <Link to="/login" style={{ color: 'var(--accent)' }} className="hover:underline font-medium">
            Kirjaudu sisään
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
