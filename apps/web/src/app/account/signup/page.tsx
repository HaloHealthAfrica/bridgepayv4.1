import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useSession } from '@auth/create/react';
import useAuth from '@/utils/useAuth';
import { Button } from '@/components/common/Button';
import { ArrowLeft, Mail, Lock, User } from 'lucide-react';

export default function SignUpPage() {
  const navigate = useNavigate();
  const { data: session, status } = useSession();
  const { signUpWithCredentials } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Read error from URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const urlErr = sp.get('error');
      if (urlErr) {
        setError(decodeURIComponent(urlErr));
      }
    }
  }, []);

  // Redirect if already signed in
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      navigate('/dashboard');
    }
  }, [session, status, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!firstName || !lastName || !email || !password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      await signUpWithCredentials({
        email,
        password,
        name: `${firstName} ${lastName}`,
        callbackUrl: '/dashboard',
        redirect: true,
      });
    } catch (err) {
      console.error('Sign up error:', err);
      setError('Could not create your account. Please try again.');
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-text-secondary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-text-secondary hover:text-primary mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          Back to home
        </a>

        <div className="bg-surface rounded-card p-8 border border-[#E0E0E0] shadow-lg">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-white">B</span>
            </div>
            <h1 className="text-3xl font-bold mb-2">Create Account</h1>
            <p className="text-text-secondary">Join Bridge and start managing your money</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            {error && (
              <div className="bg-[#FFEBEE] border border-error rounded-xl p-4">
                <p className="text-sm text-error">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-text mb-2">
                  First Name
                </label>
                <div className="relative">
                  <User
                    size={20}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary"
                  />
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary text-base"
                    placeholder="John"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-text mb-2">
                  Last Name
                </label>
                <div className="relative">
                  <User
                    size={20}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary"
                  />
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary text-base"
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-text mb-2">
                Email
              </label>
              <div className="relative">
                <Mail
                  size={20}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary text-base"
                  placeholder="john.doe@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-text mb-2">
                Password
              </label>
              <div className="relative">
                <Lock
                  size={20}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary text-base"
                  placeholder="Choose a secure password"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              fullWidth
              disabled={loading}
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </Button>

            <p className="text-center text-sm text-text-secondary">
              Already have an account?{' '}
              <a
                href="/account/signin"
                className="text-primary font-semibold hover:underline"
              >
                Sign in
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

