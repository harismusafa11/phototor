/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Users,
  Shield,
  Crown,
  Settings,
  Search,
  RefreshCw,
  Check,
  Trash2,
  Sliders,
  BarChart3,
  CheckCircle2,
  XCircle,
  Clock,
  Code,
  Copy,
  Plus,
  Database
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { UserProfile } from '../../types/auth';
import { ADSTERRA_CONFIG } from '../../config/adsterra';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  setToast?: (toast: { message: string; type: 'success' | 'info' | 'error' } | null) => void;
}

export default function AdminPanelModal({
  isOpen,
  onClose,
  currentUser,
  setToast
}: AdminPanelModalProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'settings' | 'stats'>('users');
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Dynamic Adsterra Settings State
  const [adsterraEnabled, setAdsterraEnabled] = useState(ADSTERRA_CONFIG.enabled);
  const [countdownSecs, setCountdownSecs] = useState(ADSTERRA_CONFIG.exportModal.countdownSeconds);
  const [key300x250, setKey300x250] = useState(ADSTERRA_CONFIG.exportModal.adUnitKey);
  const [key728x90, setKey728x90] = useState(ADSTERRA_CONFIG.topBanner.adUnitKey);
  const [savingSettings, setSavingSettings] = useState(false);

  // SQL Schema & Add User State
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);

  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'user'>('user');
  const [newUserIsPro, setNewUserIsPro] = useState(false);
  const [addingUser, setAddingUser] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      fetchSettingsFromDB();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Check admin authorization
  if (currentUser?.role !== 'admin') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
        <div className="bg-[#181822] border border-red-800/40 p-6 rounded-2xl max-w-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-950/60 border border-red-700/50 flex items-center justify-center mx-auto text-red-400">
            <XCircle className="w-6 h-6" />
          </div>
          <h3 className="text-white font-bold text-base">Akses Ditolak</h3>
          <p className="text-gray-400 text-xs">Anda memerlukan hak akses Administrator untuk membuka Admin Panel.</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#252532] hover:bg-[#303042] text-white text-xs font-semibold rounded-xl"
          >
            Tutup
          </button>
        </div>
      </div>
    );
  }

  const fetchUsers = async () => {
    setLoadingUsers(true);

    // 1. Sync current logged-in admin user to DB
    if (currentUser) {
      try {
        await supabase.from('profiles').upsert({
          id: currentUser.id,
          email: currentUser.email,
          full_name: currentUser.full_name || currentUser.email.split('@')[0],
          role: currentUser.role || 'admin',
          is_pro: currentUser.is_pro ?? true,
          created_at: currentUser.created_at || new Date().toISOString()
        }, { onConflict: 'id' });
      } catch (e) {
        console.warn("Could not sync admin profile to Supabase:", e);
      }
    }

    // 2. Fetch profiles from Supabase
    const { data: dbData, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    // 3. Load locally registered users (from main web app AuthModal)
    let localUsers: UserProfile[] = [];
    try {
      const localStr = localStorage.getItem('phototor_registered_users');
      if (localStr) localUsers = JSON.parse(localStr);
    } catch (e) {
      console.warn("Could not read local registered users:", e);
    }

    setLoadingUsers(false);

    // 4. Merge DB profiles and local registered users without duplicates
    const userMap = new Map<string, UserProfile>();

    if (!error && dbData && dbData.length > 0) {
      (dbData as UserProfile[]).forEach((u) => userMap.set(u.email.toLowerCase(), u));
    }

    localUsers.forEach((u) => {
      if (!userMap.has(u.email.toLowerCase())) {
        userMap.set(u.email.toLowerCase(), u);
      }
    });

    if (currentUser && !userMap.has(currentUser.email.toLowerCase())) {
      userMap.set(currentUser.email.toLowerCase(), currentUser);
    }

    const mergedList = Array.from(userMap.values()).sort(
      (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );

    if (mergedList.length > 0) {
      setUsersList(mergedList);
    } else {
      const defaultUsers: UserProfile[] = [
        currentUser || {
          id: 'admin-001',
          email: 'admin@phototor.com',
          full_name: 'Phototor Admin',
          role: 'admin',
          is_pro: true,
          created_at: new Date().toISOString()
        }
      ];
      setUsersList(defaultUsers);
    }
  };

  const handleCopySqlScript = () => {
    const sql = `-- 1. Buat Tabel Profiles untuk Menyimpan Data User
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user',
  is_pro BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Aktifkan RLS & Kebijakan Akses (Policy)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Public All Profiles" ON public.profiles FOR ALL USING (true);

-- 3. Trigger Otomatis: Setiap User Daftar di Website Utama, Otomatis Masuk ke DB Profiles!
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, is_pro)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    CASE WHEN NEW.email = 'admin@phototor.com' THEN 'admin' ELSE 'user' END,
    CASE WHEN NEW.email = 'admin@phototor.com' THEN true ELSE false END
  )
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Buat Tabel App Settings untuk Iklan & Konfigurasi
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read App Settings" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Public All App Settings" ON public.app_settings FOR ALL USING (true);

-- 5. Buat Tabel User Projects untuk Menyimpan Data Proyek (Maksimal 3 Proyek per User)
CREATE TABLE IF NOT EXISTS public.user_projects (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  width INT NOT NULL,
  height INT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.user_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read User Projects" ON public.user_projects FOR SELECT USING (true);
CREATE POLICY "Public All User Projects" ON public.user_projects FOR ALL USING (true);`;

    navigator.clipboard.writeText(sql);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 3000);
  };

  const syncListToLocalStorage = (list: UserProfile[]) => {
    try {
      localStorage.setItem('phototor_registered_users', JSON.stringify(list));
    } catch (e) {
      console.warn("Could not sync users to localStorage:", e);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail) return;

    setAddingUser(true);
    const newProfile: UserProfile = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      email: newUserEmail,
      full_name: newUserFullName || newUserEmail.split('@')[0],
      role: newUserRole,
      is_pro: newUserIsPro,
      created_at: new Date().toISOString()
    };

    // Try upsert to Supabase
    try {
      await supabase.from('profiles').upsert(newProfile, { onConflict: 'id' });
    } catch (e) {
      console.warn("Could not save new user to DB:", e);
    }

    setUsersList((prev) => {
      const updated = [newProfile, ...prev];
      syncListToLocalStorage(updated);
      return updated;
    });

    setAddingUser(false);
    setShowAddUserModal(false);
    setNewUserEmail('');
    setNewUserFullName('');
    setToast?.({ message: `User ${newProfile.email} added successfully!`, type: 'success' });
  };

  const fetchSettingsFromDB = async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'adsterra_config')
      .single();

    if (data && data.value) {
      const val = data.value;
      if (val.adsterra_enabled !== undefined) setAdsterraEnabled(val.adsterra_enabled);
      if (val.export_countdown_seconds !== undefined) setCountdownSecs(val.export_countdown_seconds);
      if (val.adsterra_300x250_key) setKey300x250(val.adsterra_300x250_key);
      if (val.adsterra_728x90_key) setKey728x90(val.adsterra_728x90_key);
    }
  };

  const handleTogglePro = async (targetUser: UserProfile) => {
    setActionLoadingId(targetUser.id);
    const newProState = !targetUser.is_pro;

    const { error } = await supabase
      .from('profiles')
      .update({ is_pro: newProState })
      .eq('id', targetUser.id);

    setActionLoadingId(null);
    if (error) {
      setToast?.({ message: `Failed to update Pro status: ${error.message}`, type: 'error' });
    } else {
      setUsersList((prev) => {
        const updated = prev.map((u) => (u.id === targetUser.id ? { ...u, is_pro: newProState } : u));
        syncListToLocalStorage(updated);
        return updated;
      });
      setToast?.({
        message: `Pro status for ${targetUser.email} ${newProState ? 'enabled' : 'disabled'} successfully!`,
        type: 'success',
      });
    }
  };

  const handleToggleRole = async (targetUser: UserProfile) => {
    setActionLoadingId(targetUser.id);
    const newRole = targetUser.role === 'admin' ? 'user' : 'admin';

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', targetUser.id);

    setActionLoadingId(null);
    if (error) {
      setToast?.({ message: `Failed to change role: ${error.message}`, type: 'error' });
    } else {
      setUsersList((prev) => {
        const updated = prev.map((u) => (u.id === targetUser.id ? { ...u, role: newRole as any } : u));
        syncListToLocalStorage(updated);
        return updated;
      });
      setToast?.({
        message: `Role of ${targetUser.email} updated to ${newRole.toUpperCase()}`,
        type: 'success',
      });
    }
  };

  const handleDeleteUser = async (targetUser: UserProfile) => {
    if (!window.confirm(`Are you sure you want to delete user ${targetUser.email}?`)) return;

    setActionLoadingId(targetUser.id);
    const { error } = await supabase.from('profiles').delete().eq('id', targetUser.id);

    setActionLoadingId(null);
    if (error) {
      setToast?.({ message: `Failed to delete user: ${error.message}`, type: 'error' });
    } else {
      setUsersList((prev) => {
        const updated = prev.filter((u) => u.id !== targetUser.id);
        syncListToLocalStorage(updated);
        return updated;
      });
      setToast?.({ message: `User ${targetUser.email} deleted successfully.`, type: 'info' });
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    ADSTERRA_CONFIG.enabled = adsterraEnabled;
    ADSTERRA_CONFIG.exportModal.countdownSeconds = countdownSecs;
    ADSTERRA_CONFIG.exportModal.adUnitKey = key300x250;
    ADSTERRA_CONFIG.topBanner.adUnitKey = key728x90;

    const payload = {
      adsterra_enabled: adsterraEnabled,
      export_countdown_seconds: countdownSecs,
      adsterra_300x250_key: key300x250,
      adsterra_728x90_key: key728x90,
    };

    const { error } = await supabase
      .from('app_settings')
      .upsert({ key: 'adsterra_config', value: payload });

    setSavingSettings(false);
    if (error) {
      setToast?.({ message: `Failed to save to database: ${error.message}`, type: 'error' });
    } else {
      setToast?.({ message: 'Ad & App Settings updated successfully!', type: 'success' });
    }
  };

  const filteredUsers = usersList.filter(
    (u) =>
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.full_name && u.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 select-none">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-4xl bg-[#121217] border border-[#2a2a38] rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[85vh] text-gray-200 font-sans"
      >
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#22222e] bg-[#16161f] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-indigo-600 flex items-center justify-center shadow-md text-white font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Phototor Admin Panel</span>
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[9px] font-mono font-bold uppercase">
                  Administrator Access
                </span>
              </h2>
              <p className="text-[11px] text-gray-400">Manage users, Pro status, roles, and Adsterra ad configuration</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-[#252535]"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex items-center gap-2 px-6 py-2.5 bg-[#16161f] border-b border-[#22222e] text-xs font-semibold shrink-0">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'users'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                : 'text-gray-400 hover:text-white hover:bg-[#222230]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Manage Users ({usersList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                : 'text-gray-400 hover:text-white hover:bg-[#222230]'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Ad & App Settings</span>
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'stats'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                : 'text-gray-400 hover:text-white hover:bg-[#222230]'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Overview Statistics</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 font-sans text-xs">
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm flex items-center">
                  <Search className="w-4 h-4 text-gray-500 absolute left-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by email or name..."
                    className="w-full bg-[#181822] border border-[#282838] rounded-xl py-2 pl-9 pr-3 text-white text-xs placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAddUserModal(true)}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/30"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add User</span>
                  </button>

                  <button
                    onClick={() => setShowSqlModal(true)}
                    className="px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>Setup Supabase SQL</span>
                  </button>

                  <button
                    onClick={fetchUsers}
                    disabled={loadingUsers}
                    className="px-3 py-2 bg-[#1e1e2c] hover:bg-[#28283c] border border-[#2e2e42] rounded-xl text-gray-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              <div className="border border-[#252535] rounded-xl overflow-hidden bg-[#161620]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#1c1c28] border-b border-[#252535] text-gray-400 text-[11px] font-mono uppercase">
                      <th className="p-3">User & Email</th>
                      <th className="p-3">Session Status</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Pro Status</th>
                      <th className="p-3">Joined</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222230]">
                    {filteredUsers.map((u) => {
                      const isOnline = currentUser && (u.id === currentUser.id || u.email.toLowerCase() === currentUser.email.toLowerCase());
                      return (
                        <tr key={u.id} className="hover:bg-[#1d1d2b] transition-colors">
                          <td className="p-3">
                            <div className="font-semibold text-white">{u.full_name || u.email.split('@')[0]}</div>
                            <div className="text-[11px] font-mono text-gray-400">{u.email}</div>
                          </td>
                          <td className="p-3">
                            {isOnline ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Active Session
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono text-gray-400 bg-[#1a1a24] border border-[#262634]">
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                                Offline (Cached)
                              </span>
                            )}
                          </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                              u.role === 'admin'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-gray-800 text-gray-400'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => handleTogglePro(u)}
                            disabled={actionLoadingId === u.id}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                              u.is_pro
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                                : 'bg-[#252535] text-gray-400 hover:text-white'
                            }`}
                          >
                            <Crown className="w-3 h-3 text-amber-400 fill-current" />
                            <span>{u.is_pro ? 'PRO MEMBER' : 'FREE USER'}</span>
                          </button>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-gray-400">
                          {new Date(u.created_at).toLocaleDateString('en-US', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleToggleRole(u)}
                              disabled={actionLoadingId === u.id}
                              className="px-2 py-1 bg-[#252535] hover:bg-[#323246] text-gray-300 rounded text-[10px] font-medium cursor-pointer"
                              title="Toggle Role"
                            >
                              {u.role === 'admin' ? 'Set to User' : 'Make Admin'}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u)}
                              disabled={actionLoadingId === u.id}
                              className="p-1 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded transition-colors cursor-pointer"
                              title="Delete User"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      );
                    })}

                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-500 font-medium">
                          {loadingUsers ? 'Loading data...' : 'No users found.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-2xl mx-auto space-y-6 bg-[#161622] p-6 border border-[#252535] rounded-2xl">
              <div className="flex items-center gap-2 border-b border-[#252535] pb-3">
                <Sliders className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-bold text-white text-sm">Adsterra Ad & Export Settings</h3>
                  <p className="text-[11px] text-gray-400">Dynamically update monetization and export timers.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-[#1b1b2a] rounded-xl border border-[#28283c]">
                  <div>
                    <span className="font-bold text-white block text-xs">Enable Adsterra Ads</span>
                    <span className="text-[10px] text-gray-400">Show banner ads on export modals and dashboard.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={adsterraEnabled}
                    onChange={(e) => setAdsterraEnabled(e.target.checked)}
                    className="w-5 h-5 accent-indigo-600 cursor-pointer rounded"
                  />
                </div>

                <div className="p-4 bg-[#1b1b2a] rounded-xl border border-[#28283c] space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-white text-xs flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>Export Countdown (Seconds)</span>
                    </label>
                    <span className="font-mono text-indigo-400 font-bold text-sm">{countdownSecs}s</span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="30"
                    value={countdownSecs}
                    onChange={(e) => setCountdownSecs(parseInt(e.target.value))}
                    className="w-full accent-indigo-500 h-1.5 bg-[#252538] cursor-pointer"
                  />
                  <p className="text-[10px] text-gray-500">Wait duration before the download button activates.</p>
                </div>

                <div className="space-y-1">
                  <label className="block text-gray-400 text-xs font-semibold">300x250 Ad Unit Key (Export Modal)</label>
                  <input
                    type="text"
                    value={key300x250}
                    onChange={(e) => setKey300x250(e.target.value)}
                    placeholder="Enter key..."
                    className="w-full bg-[#181822] border border-[#2a2a3b] rounded-xl p-2.5 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-gray-400 text-xs font-semibold">728x90 Ad Unit Key (Dashboard)</label>
                  <input
                    type="text"
                    value={key728x90}
                    onChange={(e) => setKey728x90(e.target.value)}
                    placeholder="Enter key..."
                    className="w-full bg-[#181822] border border-[#2a2a3b] rounded-xl p-2.5 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-[#2a2a3b] text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
                >
                  {savingSettings ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save Ad Settings</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-[#181824] border border-[#262638] rounded-2xl p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-gray-400">
                  <span className="text-xs font-semibold">Total Registered Users</span>
                  <Users className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-bold text-white font-mono">{usersList.length}</span>
                  <span className="text-[10px] text-gray-500 block mt-1">Users created</span>
                </div>
              </div>

              <div className="bg-[#181824] border border-[#262638] rounded-2xl p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-gray-400">
                  <span className="text-xs font-semibold">Pro Members</span>
                  <Crown className="w-5 h-5 text-amber-400" />
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-bold text-amber-300 font-mono">
                    {usersList.filter((u) => u.is_pro).length}
                  </span>
                  <span className="text-[10px] text-gray-500 block mt-1">Pro Access Users</span>
                </div>
              </div>

              <div className="bg-[#181824] border border-[#262638] rounded-2xl p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-gray-400">
                  <span className="text-xs font-semibold">Administrators</span>
                  <Shield className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-bold text-emerald-300 font-mono">
                    {usersList.filter((u) => u.role === 'admin').length}
                  </span>
                  <span className="text-[10px] text-gray-500 block mt-1">Users with Admin Access</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {showAddUserModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-md bg-[#161622] border border-[#2a2a3a] rounded-2xl p-6 shadow-2xl space-y-4 text-xs"
            >
              <div className="flex items-center justify-between border-b border-[#242434] pb-3">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-indigo-400" />
                  <span>Add New User</span>
                </h3>
                <button
                  onClick={() => setShowAddUserModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddUser} className="space-y-3.5">
                <div>
                  <label className="text-gray-300 block mb-1 font-medium">Email Address</label>
                  <input
                    type="email"
                    required
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full bg-[#1e1e2c] border border-[#2a2a3c] rounded-xl p-2.5 text-white outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-gray-300 block mb-1 font-medium">Full Name</label>
                  <input
                    type="text"
                    value={newUserFullName}
                    onChange={(e) => setNewUserFullName(e.target.value)}
                    placeholder="Full name..."
                    className="w-full bg-[#1e1e2c] border border-[#2a2a3c] rounded-xl p-2.5 text-white outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-gray-300 block mb-1 font-medium">Access Role</label>
                    <select
                      value={newUserRole}
                      onChange={(e: any) => setNewUserRole(e.target.value)}
                      className="w-full bg-[#1e1e2c] border border-[#2a2a3c] rounded-xl p-2.5 text-white outline-none cursor-pointer"
                    >
                      <option value="user">User</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-gray-300 block mb-1 font-medium">Pro Status</label>
                    <select
                      value={newUserIsPro ? 'true' : 'false'}
                      onChange={(e) => setNewUserIsPro(e.target.value === 'true')}
                      className="w-full bg-[#1e1e2c] border border-[#2a2a3c] rounded-xl p-2.5 text-white outline-none cursor-pointer"
                    >
                      <option value="false">Free</option>
                      <option value="true">Pro</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-[#242434]">
                  <button
                    type="button"
                    onClick={() => setShowAddUserModal(false)}
                    className="px-4 py-2 bg-[#222230] hover:bg-[#2c2c3e] rounded-xl text-gray-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingUser}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/30"
                  >
                    {addingUser ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Add User</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showSqlModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-2xl bg-[#14141d] border border-[#2a2a3c] rounded-2xl p-6 shadow-2xl space-y-4 text-xs"
            >
              <div className="flex items-center justify-between border-b border-[#242434] pb-3">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-amber-400" />
                  <h3 className="font-bold text-sm text-white">Database SQL Setup Script</h3>
                </div>
                <button
                  onClick={() => setShowSqlModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-gray-300 leading-relaxed">
                Copy this SQL, go to <strong className="text-amber-300">Supabase SQL Editor → New Query</strong>, and <code className="text-indigo-400">Run</code> to initialize tables!
              </p>

              <div className="relative bg-[#0b0b10] border border-[#222230] rounded-xl p-4 font-mono text-[11px] text-emerald-400 overflow-x-auto max-h-60 select-all leading-relaxed">
                <pre>{`-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user',
  is_pro BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RLS & Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Public All Profiles" ON public.profiles FOR ALL USING (true);

-- 3. App Settings Table
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read App Settings" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Public All App Settings" ON public.app_settings FOR ALL USING (true);

-- 4. User Projects Table
CREATE TABLE IF NOT EXISTS public.user_projects (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  width INT NOT NULL,
  height INT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.user_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read User Projects" ON public.user_projects FOR SELECT USING (true);
CREATE POLICY "Public All User Projects" ON public.user_projects FOR ALL USING (true);`}</pre>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[10px] text-gray-400">💡 Syncing enabled after SQL execution.</span>
                <button
                  onClick={handleCopySqlScript}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  {sqlCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{sqlCopied ? 'Copied!' : 'Copy SQL'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}

      </motion.div>
    </div>
  );
}
