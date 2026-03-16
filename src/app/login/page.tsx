'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn('credentials', {
      username,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError('Invalid username or password');
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-brand-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="/logos/logo-horizontal.png"
            alt="DealFlow OH"
            className="h-14 mx-auto mb-4"
          />
          <h1 className="font-display text-2xl font-semibold text-brand-taupe">SMS Campaign Manager</h1>
          <p className="font-body text-sm text-brand-taupe/60 mt-1">Sign in to manage your campaigns</p>
        </div>

        {/* Login Form */}
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-body font-medium text-brand-taupe mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field"
                placeholder="Enter your username"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-body font-medium text-brand-taupe mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="Enter your password"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm font-body px-3 py-2 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="animate-spin">⏳</span>
              ) : null}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-brand-taupe/40 font-body mt-6">
          River of Deals
        </p>
      </div>
    </div>
  );
}
