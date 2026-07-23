/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Mail, Lock, User, LogIn, UserPlus, Layers, RefreshCw, KeyRound, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  onAuthSuccess?: () => void;
  setToast?: (toast: { message: string; type: 'success' | 'info' | 'error' } | null) => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  initialMode = 'login',
  onAuthSuccess,
  setToast
}: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const saveUserToLocalStorage = (profile: any) => {
    try {
      const existingStr = localStorage.getItem('phototor_registered_users');
      const existing = existingStr ? JSON.parse(existingStr) : [];
      const filtered = existing.filter((u: any) => u.id !== profile.id && u.email !== profile.email);
      const updated = [profile, ...filtered];
      localStorage.setItem('phototor_registered_users', JSON.stringify(updated));
    } catch (e) {
      console.warn("Could not save registered user to local storage:", e);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Silakan isi Email dan Password.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);
    if (error) {
      setErrorMsg(error.message);
      setToast?.({ message: `Login Gagal: ${error.message}`, type: 'error' });
    } else {
      if (data?.user) {
        const userProfile = {
          id: data.user.id,
          email: data.user.email,
          full_name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0],
          role: data.user.email === 'admin@phototor.com' ? 'admin' : 'user',
          is_pro: data.user.email === 'admin@phototor.com',
          created_at: data.user.created_at || new Date().toISOString()
        };
        saveUserToLocalStorage(userProfile);
        try {
          await supabase.from('profiles').upsert(userProfile, { onConflict: 'id' });
        } catch (e) {
          console.warn("Could not sync login profile to Supabase:", e);
        }
      }
      setToast?.({ message: `Selamat datang kembali!`, type: 'success' });
      onAuthSuccess?.();
      onClose();
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Silakan isi Email dan Password.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password minimal 6 karakter.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || email.split('@')[0],
        },
      },
    });

    setLoading(false);
    if (error) {
      setErrorMsg(error.message);
      setToast?.({ message: `Pendaftaran Gagal: ${error.message}`, type: 'error' });
    } else {
      const registeredUser = data?.user ? {
        id: data.user.id,
        email: data.user.email || email,
        full_name: fullName || email.split('@')[0],
        role: email === 'admin@phototor.com' ? 'admin' : 'user',
        is_pro: email === 'admin@phototor.com',
        created_at: new Date().toISOString()
      } : {
        id: `user-${Date.now()}`,
        email: email,
        full_name: fullName || email.split('@')[0],
        role: email === 'admin@phototor.com' ? 'admin' : 'user',
        is_pro: email === 'admin@phototor.com',
        created_at: new Date().toISOString()
      };

      saveUserToLocalStorage(registeredUser);

      if (data?.user) {
        try {
          await supabase.from('profiles').upsert(registeredUser, { onConflict: 'id' });
        } catch (e) {
          console.warn("Could not sync register profile to Supabase:", e);
        }
      }
      setToast?.({ message: `Registration Successful! Please check your email or log in directly.`, type: 'success' });
      onAuthSuccess?.();
      onClose();
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });

    setLoading(false);
    if (error) {
      setErrorMsg(error.message);
      setToast?.({ message: error.message, type: 'error' });
    } else {
      setToast?.({ message: 'Password reset instructions have been sent to your email.', type: 'info' });
      setMode('login');
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      setLoading(false);
      setErrorMsg(error.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md bg-[#14141a] border border-[#2c2c38] rounded-2xl overflow-hidden shadow-2xl p-6 relative text-gray-200 font-sans"
      >
        {/* Header Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Brand */}
        <div className="flex flex-col items-center text-center space-y-1 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-1">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">Phototor Account</h2>
          <p className="text-xs text-gray-400 font-medium">
            {mode === 'login' ? 'Sign in to your account' : mode === 'register' ? 'Create a free account' : 'Reset your password'}
          </p>
        </div>

        {/* Error Alert Box */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-950/50 border border-red-800/50 rounded-xl text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span className="leading-tight">{errorMsg}</span>
          </div>
        )}

        {/* Form Body */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block text-gray-400 mb-1 font-medium">Email Address</label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-gray-500 absolute left-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@email.com"
                  required
                  className="w-full bg-[#1c1c26] border border-[#2a2a38] rounded-xl py-2.5 pl-9 pr-3 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-gray-400 font-medium">Password</label>
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setErrorMsg(null); }}
                  className="text-[11px] text-indigo-400 hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-[#1c1c26] border border-[#2a2a38] rounded-xl py-2.5 pl-9 pr-3 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-[#282836] text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In Now</span>
                </>
              )}
            </button>
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-gray-400 mb-1 font-medium">Full Name</label>
              <div className="relative flex items-center">
                <User className="w-4 h-4 text-gray-500 absolute left-3" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your Full Name"
                  required
                  className="w-full bg-[#1c1c26] border border-[#2a2a38] rounded-xl py-2.5 pl-9 pr-3 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-400 mb-1 font-medium">Email Address</label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-gray-500 absolute left-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@email.com"
                  required
                  className="w-full bg-[#1c1c26] border border-[#2a2a38] rounded-xl py-2.5 pl-9 pr-3 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-400 mb-1 font-medium">Password (min 6 characters)</label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full bg-[#1c1c26] border border-[#2a2a38] rounded-xl py-2.5 pl-9 pr-3 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-[#282836] text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Sign Up Free</span>
                </>
              )}
            </button>
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={handleForgot} className="space-y-4 text-xs">
            <div>
              <label className="block text-gray-400 mb-1 font-medium">Enter Registered Email</label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-gray-500 absolute left-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@email.com"
                  required
                  className="w-full bg-[#1c1c26] border border-[#2a2a38] rounded-xl py-2.5 pl-9 pr-3 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-[#282836] text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sending Email...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Send Password Reset Link</span>
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => { setMode('login'); setErrorMsg(null); }}
                className="text-xs text-indigo-400 hover:underline cursor-pointer"
              >
                Back to Sign In
              </button>
            </div>
          </form>
        )}

        {/* Social Auth Separator */}
        {mode !== 'forgot' && (
          <>
            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-[#252532] w-full"></div>
              <span className="bg-[#14141a] px-3 text-[10px] text-gray-500 font-mono uppercase shrink-0">or sign in with</span>
              <div className="border-t border-[#252532] w-full"></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-2 bg-[#1d1d28] hover:bg-[#262636] border border-[#2e2e40] rounded-xl text-xs font-semibold text-gray-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"/>
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
                <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.4 0 15.3c0 2.9.7 5.6 1.9 8l3.7-2.9z"/>
                <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"/>
              </svg>
              <span>Google Account</span>
            </button>
          </>
        )}

        {/* Footer Mode Switcher */}
        <div className="mt-5 pt-4 border-t border-[#22222e] text-center text-xs text-gray-400">
          {mode === 'login' ? (
            <span>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => { setMode('register'); setErrorMsg(null); }}
                className="text-indigo-400 hover:underline font-bold cursor-pointer"
              >
                Sign Up Free
              </button>
            </span>
          ) : mode === 'register' ? (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setMode('login'); setErrorMsg(null); }}
                className="text-indigo-400 hover:underline font-bold cursor-pointer"
              >
                Sign In Now
              </button>
            </span>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}
