// frontend/src/pages/Register.tsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen } from 'lucide-react';

const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

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
        className="w-full max-w-md p-8 rounded-2xl border animate-fade-in"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 rounded-full mb-3" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>
            <BookOpen size={32} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>
            Luo uusi tili
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            Rekisteröidy käyttääksesi Clible Workspacea
          </p>
        </div>

        {error && (
          <div className="p-3 mb-4 text-sm rounded-lg border bg-red-500/10 border-red-500/30 text-red-500">
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
              className="w-full px-4 py-2.5 rounded-xl border transition-all duration-200 focus:outline-none"
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
              className="w-full px-4 py-2.5 rounded-xl border transition-all duration-200 focus:outline-none"
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
              className="w-full px-4 py-2.5 rounded-xl border transition-all duration-200 focus:outline-none"
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
            className="w-full py-3 mt-2 rounded-xl font-medium tracking-wide transition-colors focus:outline-none cursor-pointer hover:opacity-90 active:scale-95 duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'var(--accent)',
              color: 'var(--bg)',
            }}
          >
            {loading ? 'Rekisteröidytään...' : 'Rekisteröidy'}
          </button>
        </form>

        <p className="text-sm text-center mt-6" style={{ color: 'var(--muted)' }}>
          Onko sinulla jo tili?{' '}
          <Link to="/login" style={{ color: 'var(--accent)' }} className="hover:underline">
            Kirjaudu sisään
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
