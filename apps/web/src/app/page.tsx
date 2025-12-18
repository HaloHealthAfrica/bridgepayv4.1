import React, { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useSession } from '@auth/create/react';
import { Wallet, ArrowRight, Shield, Zap } from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();
  const { data: session, status } = useSession();

  // Redirect signed-in users to dashboard
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      navigate('/dashboard');
    }
  }, [session, status, navigate]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-text-secondary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Bar */}
      <div className="bg-surface border-b border-[#E0E0E0] px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center font-bold text-white text-lg">
              B
            </div>
            <span className="text-xl font-bold">Bridge</span>
          </div>
          <div className="flex gap-4">
            <a
              href="/account/signin"
              className="px-4 py-2 text-text font-semibold hover:text-primary transition-colors"
            >
              Sign In
            </a>
            <a
              href="/account/signup"
              className="px-6 py-2 bg-primary text-white rounded-xl font-semibold hover:bg-[#00695C] transition-colors"
            >
              Get Started
            </a>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-text mb-6">
            Bridge MVP v3
          </h1>
          <p className="text-xl text-text-secondary max-w-2xl mx-auto mb-8">
            Welcome to the Bridge MVP platform. Send money, receive payments, and manage your finances with ease across East Africa.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a
              href="/account/signin"
              className="px-8 py-4 bg-primary text-white rounded-xl font-semibold hover:bg-[#00695C] transition-colors flex items-center gap-2 shadow-lg hover:shadow-xl"
            >
              Sign In
              <ArrowRight size={20} />
            </a>
            <a
              href="/account/signup"
              className="px-8 py-4 bg-white text-primary border-2 border-primary rounded-xl font-semibold hover:bg-primary-light transition-colors"
            >
              Create Account
            </a>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <div className="bg-surface rounded-card p-6 border border-[#E0E0E0]">
            <div className="bg-primary-light rounded-xl p-4 w-fit mb-4">
              <Wallet size={24} className="text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Digital Wallet</h3>
            <p className="text-text-secondary">
              Manage your money securely with our digital wallet. Send, receive, and store funds with ease.
            </p>
          </div>

          <div className="bg-surface rounded-card p-6 border border-[#E0E0E0]">
            <div className="bg-primary-light rounded-xl p-4 w-fit mb-4">
              <Zap size={24} className="text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Fast Payments</h3>
            <p className="text-text-secondary">
              Make instant payments via M-Pesa, bank transfers, or QR codes. Fast, secure, and reliable.
            </p>
          </div>

          <div className="bg-surface rounded-card p-6 border border-[#E0E0E0]">
            <div className="bg-primary-light rounded-xl p-4 w-fit mb-4">
              <Shield size={24} className="text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Secure & Protected</h3>
            <p className="text-text-secondary">
              Your funds are protected with bank-level security and escrow protection for transactions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

