/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Plus,
  Folder,
  Trash2,
  Image as ImageIcon,
  Layers,
  Upload,
  Download,
  Zap,
  Scale,
  RefreshCw,
  X,
  Check,
  ChevronRight,
  Shield,
  HelpCircle,
  Search,
  ArrowLeftRight,
  Share2,
  Code,
  Copy,
  ExternalLink,
  Globe,
} from 'lucide-react';
import { Project, BatchJob } from '../types';
import { loadProjects, deleteProject, saveProject } from '../utils/indexedDB';
import { removeBackground, upscaleImage } from '../utils/filters';
import {
  CANVAS_PRESETS,
  CANVAS_PRESET_CATEGORIES,
  getFilteredPresets,
  PresetCategory,
  CanvasPreset
} from '../utils/canvasPresets';
import AdsterraBanner from './AdsterraBanner';
import { ADSTERRA_CONFIG } from '../config/adsterra';

import { UserProfile } from '../types/auth';

interface DashboardProps {
  onOpenProject: (projectId: string) => void;
  onCreateProject: (width: number, height: number, name: string) => void;
  onOpenImageAsProject?: (file: File) => void;
  isPremium: boolean;
  setIsPremium: (val: boolean) => void;
  userProfile?: UserProfile | null;
  onOpenAuth?: () => void;
  onOpenAdmin?: () => void;
  onSignOut?: () => void;
}

export default function Dashboard({
  onOpenProject,
  onCreateProject,
  onOpenImageAsProject,
  isPremium,
  setIsPremium,
  userProfile,
  onOpenAuth,
  onOpenAdmin,
  onSignOut,
}: DashboardProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeTab, setActiveTab] = useState<'projects' | 'batch' | 'pricing'>('projects');
  
  // Create Project & Presets State
  const [newProjName, setNewProjName] = useState('Untitled Project');
  const [newProjWidth, setNewProjWidth] = useState(1280);
  const [newProjHeight, setNewProjHeight] = useState(720);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  // Quick Action State
  const [quickActionFile, setQuickActionFile] = useState<File | null>(null);
  const [quickActionType, setQuickActionType] = useState<'removeBg' | 'compress' | null>(null);
  const [quickActionProcessing, setQuickActionProcessing] = useState(false);
  const [quickActionOutput, setQuickActionOutput] = useState<string | null>(null);
  const [quickActionSizeBefore, setQuickActionSizeBefore] = useState(0);
  const [quickActionSizeAfter, setQuickActionSizeAfter] = useState(0);
  const [compressQuality, setCompressQuality] = useState(80);

  // Batch Processing State
  const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);
  const [batchWidth, setBatchWidth] = useState<number>(800);
  const [batchHeight, setBatchHeight] = useState<number>(600);
  const [batchFormat, setBatchFormat] = useState<'image/png' | 'image/jpeg' | 'image/webp'>('image/jpeg');
  const [batchQuality, setBatchQuality] = useState<number>(85);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [embedCopied, setEmbedCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const handleCopyEmbed = () => {
    const code = `<a href="https://phototorstudio.com" target="_blank" title="Phototor Studio — Editor Foto Online Gratis"><img src="https://phototorstudio.com/logo.png" alt="Phototor Studio Editor Foto Online AI" width="180"/></a>`;
    navigator.clipboard.writeText(code);
    setEmbedCopied(true);
    setTimeout(() => setEmbedCopied(false), 3000);
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText('https://phototorstudio.com/');
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 3000);
  };

  const [presetCategory, setPresetCategory] = useState<PresetCategory>('all');
  const [presetSearch, setPresetSearch] = useState('');

  const filteredPresets = getFilteredPresets(presetCategory, presetSearch);

  const handleSwapDimensions = () => {
    const w = newProjWidth;
    setNewProjWidth(newProjHeight);
    setNewProjHeight(w);
  };

  const applyPreset = (preset: CanvasPreset) => {
    setNewProjWidth(preset.width);
    setNewProjHeight(preset.height);
    if (!newProjName || newProjName === 'Untitled Project' || newProjName === 'New Canvas') {
      setNewProjName(preset.name);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [userProfile]);

  // Adsterra Social Bar script loader (ONLY active on Dashboard page, NOT Canvas Editor)
  useEffect(() => {
    if (ADSTERRA_CONFIG.enabled && ADSTERRA_CONFIG.socialBar.enabled) {
      const script = document.createElement('script');
      script.id = 'adsterra-socialbar-script';
      script.src = ADSTERRA_CONFIG.socialBar.adScriptUrl;
      script.type = 'text/javascript';
      document.body.appendChild(script);

      return () => {
        const el = document.getElementById('adsterra-socialbar-script');
        if (el) el.remove();
        // Clean up ONLY Social Bar floating/overlay elements (direct body children)
        // Social Bar injects floating popups as direct children of document.body
        // Do NOT remove banner ad elements which live inside React component containers
        document.querySelectorAll('body > div[id*="at-"], body > div[class*="at-"]').forEach((e) => {
          // Only remove if it looks like a floating overlay (fixed/absolute positioned)
          const style = window.getComputedStyle(e);
          if (style.position === 'fixed' || style.position === 'absolute') {
            e.remove();
          }
        });
      };
    }
  }, []);

  const fetchProjects = async () => {
    const projs = await loadProjects(userProfile?.id);
    setProjects(projs);
  };

  const handleDeleteProj = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    setProjectToDelete(id);
  };

  const handleConfirmDelete = async () => {
    if (projectToDelete) {
      await deleteProject(projectToDelete, userProfile?.id);
      setProjectToDelete(null);
      fetchProjects();
    }
  };

  const handleStartCreateProject = () => {
    if (!userProfile) {
      onOpenAuth();
      return;
    }
    if (projects.length >= 3) {
      alert("Maximum 3 Projects Limit Reached!\n\nEach registered user can save up to 3 projects in the database. Please delete one of your old projects first to create a new project.");
      return;
    }
    setShowCreateModal(true);
  };

  const handleConfirmCreate = () => {
    if (projects.length >= 3) {
      alert("Maximum 3 Projects Limit Reached!\n\nPlease delete one of your old projects first to create a new project.");
      setShowCreateModal(false);
      return;
    }
    onCreateProject(newProjWidth, newProjHeight, newProjName);
    setShowCreateModal(false);
  };

  // Quick Action: Remove BG or Compress Image
  const handleQuickActionUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'removeBg' | 'compress') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setQuickActionFile(file);
    setQuickActionType(type);
    setQuickActionOutput(null);
    setQuickActionSizeBefore(file.size);
    
    if (type === 'compress') {
      // Just do standard render for compression preview
      const reader = new FileReader();
      reader.onload = () => {
        setQuickActionOutput(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      // Process Background Removal
      setQuickActionProcessing(true);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const removedBgData = removeBackground(imgData, 28);
          ctx.putImageData(removedBgData, 0, 0);
          
          canvas.toBlob((blob) => {
            if (blob) {
              setQuickActionOutput(URL.createObjectURL(blob));
              setQuickActionSizeAfter(blob.size);
            }
            setQuickActionProcessing(false);
          }, 'image/png');
        }
      };
      img.src = URL.createObjectURL(file);
    }
  };

  const executeCompress = () => {
    if (!quickActionFile) return;
    setQuickActionProcessing(true);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            setQuickActionOutput(URL.createObjectURL(blob));
            setQuickActionSizeAfter(blob.size);
          }
          setQuickActionProcessing(false);
        }, 'image/jpeg', compressQuality / 100);
      }
    };
    img.src = URL.createObjectURL(quickActionFile);
  };

  // Batch Processor
  const handleBatchFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newJobs: BatchJob[] = Array.from(files).map((file: File, idx) => ({
      id: `batch-${Date.now()}-${idx}`,
      fileName: file.name,
      originalSize: file.size,
      status: 'pending',
      progress: 0,
      resultUrl: URL.createObjectURL(file) // Storing original initially
    }));

    setBatchJobs((prev) => [...prev, ...newJobs]);
  };

  const processBatch = async () => {
    if (batchJobs.length === 0) return;
    setIsBatchProcessing(true);

    const updatedJobs = [...batchJobs];

    for (let i = 0; i < updatedJobs.length; i++) {
      const job = updatedJobs[i];
      if (job.status === 'completed') continue;

      updatedJobs[i] = { ...job, status: 'processing', progress: 20 };
      setBatchJobs([...updatedJobs]);

      try {
        // Load original image
        const img = new Image();
        const originalBlob = await fetch(job.resultUrl!).then((r) => r.blob());
        const originalUrl = URL.createObjectURL(originalBlob);

        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject();
          img.src = originalUrl;
        });

        // Create Canvas for Resize
        const canvas = document.createElement('canvas');
        canvas.width = batchWidth;
        canvas.height = batchHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, batchWidth, batchHeight);
          
          updatedJobs[i].progress = 60;
          setBatchJobs([...updatedJobs]);

          // Compress and convert to Target Format
          await new Promise<void>((resolve) => {
            canvas.toBlob((blob) => {
              if (blob) {
                updatedJobs[i] = {
                  ...job,
                  status: 'completed',
                  progress: 100,
                  resultBlob: blob,
                  resultUrl: URL.createObjectURL(blob),
                  resultSize: blob.size,
                };
              } else {
                updatedJobs[i] = { ...job, status: 'failed', progress: 100 };
              }
              resolve();
            }, batchFormat, batchQuality / 100);
          });
        }
      } catch (e) {
        updatedJobs[i] = { ...job, status: 'failed', progress: 100 };
      }

      setBatchJobs([...updatedJobs]);
    }

    setIsBatchProcessing(false);
  };

  const downloadBatchFile = (job: BatchJob) => {
    if (!job.resultUrl) return;
    const a = document.createElement('a');
    a.href = job.resultUrl;
    // Replace extension
    const baseName = job.fileName.substring(0, job.fileName.lastIndexOf('.')) || job.fileName;
    const ext = batchFormat === 'image/png' ? 'png' : batchFormat === 'image/webp' ? 'webp' : 'jpg';
    a.download = `${baseName}_phototor.${ext}`;
    a.click();
  };

  const downloadAllBatch = () => {
    batchJobs.forEach((job) => {
      if (job.status === 'completed') {
        downloadBatchFile(job);
      }
    });
  };

  const removeBatchJob = (id: string) => {
    setBatchJobs((prev) => prev.filter((j) => j.id !== id));
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="flex flex-col h-full w-full overflow-y-auto bg-[#0e0e11] text-gray-100 font-sans antialiased">
      {/* Top Bar / Brand */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-8 py-4 border-b border-[#24242b] bg-[#111115]/95 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 shrink-0">
            {/* Glow aura behind logo */}
            <div className="absolute inset-0 rounded-xl bg-violet-500/30 blur-md scale-125 animate-pulse" />
            <img
              src="/logo.png"
              alt="Phototor Logo"
              className="relative w-10 h-10 rounded-xl object-contain drop-shadow-[0_0_10px_rgba(139,92,246,0.9)]"
            />
          </div>
          <div>
            <span className="font-sans font-extrabold tracking-tight text-lg bg-gradient-to-r from-violet-300 via-white to-purple-300 bg-clip-text text-transparent"
              style={{ textShadow: '0 0 20px rgba(139,92,246,0.5)' }}>
              PHOTOTOR
            </span>
            <span className="ml-2 text-xs font-mono text-gray-500 tracking-wider">v1.2</span>
          </div>
        </div>

        {/* Workspace Navigation */}
        <div className="flex items-center gap-1 bg-[#1a1a22] p-1 rounded-lg border border-[#24242b]">
          <button
            onClick={() => setActiveTab('projects')}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
              activeTab === 'projects'
                ? 'bg-[#2a2a35] text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            My Projects
          </button>
          <button
            onClick={() => setActiveTab('batch')}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
              activeTab === 'batch'
                ? 'bg-[#2a2a35] text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Batch Processor
          </button>
          {userProfile?.role === 'admin' && (
            <button
              onClick={onOpenAdmin}
              className="px-4 py-1.5 text-xs font-bold rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-all duration-200 flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin Panel 🛠️</span>
            </button>
          )}
          {/* Hidden until payment gateway is connected */}
          {/* <button
            onClick={() => setActiveTab('pricing')}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
              activeTab === 'pricing'
                ? 'bg-[#2a2a35] text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Plan & Credits
          </button> */}
        </div>

        {/* User Profile / Admin / Auth Buttons */}
        <div className="flex items-center gap-3">
          {userProfile ? (
            <div className="flex items-center gap-2">
              {userProfile.role === 'admin' && (
                <button
                  onClick={onOpenAdmin}
                  className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/10"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Admin Panel 🛠️</span>
                </button>
              )}

              <div className="flex items-center gap-2 px-3 py-1 bg-[#1a1a24] border border-[#242434] rounded-xl">
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white text-[10px]">
                  {(userProfile.full_name || userProfile.email)[0].toUpperCase()}
                </div>
                <div className="text-left hidden sm:block">
                  <span className="block text-[11px] font-bold text-white leading-tight">
                    {userProfile.full_name || userProfile.email.split('@')[0]}
                  </span>
                  <span className="block text-[9px] font-mono text-gray-400 leading-tight">
                    {userProfile.role === 'admin' ? 'Administrator' : userProfile.is_pro ? 'Pro Member' : 'Free Member'}
                  </span>
                </div>
              </div>

              <button
                onClick={onSignOut}
                className="px-2.5 py-1.5 text-xs text-gray-400 hover:text-red-400 hover:bg-red-950/30 rounded-xl transition-colors cursor-pointer"
                title="Sign Out"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Sign In / Sign Up 🔑</span>
            </button>
          )}
        </div>
      </header>

      {/* Adsterra 728x90 Sponsor Leaderboard Banner */}
      {ADSTERRA_CONFIG.enabled && ADSTERRA_CONFIG.topBanner.enabled && (
        <div className="w-full flex justify-center bg-[#0d0d12] py-2 border-b border-[#1c1c24]">
          <AdsterraBanner format="728x90" />
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-8">
        
        {/* Admin Welcome Hero Card when logged in as Admin */}
        {userProfile?.role === 'admin' && (
          <div className="mb-6 p-5 rounded-2xl bg-gradient-to-r from-amber-950/60 via-[#181822] to-indigo-950/40 border border-amber-500/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xl">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold shrink-0">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-white font-bold text-sm tracking-tight">Welcome, Administrator!</h4>
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[9px] font-mono font-bold uppercase">
                    Admin Active
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Logged in as <span className="text-amber-300 font-mono font-bold">{userProfile.email}</span>. Use the Admin Panel to manage users & ads.
                </p>
              </div>
            </div>

            <button
              onClick={onOpenAdmin}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Shield className="w-4 h-4 fill-current" />
              <span>Open Admin Panel 🛠️</span>
            </button>
          </div>
        )}

        {/* Welcome Auth Callout Banner when not logged in */}
        {!userProfile && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-[#181824] to-purple-950/40 border border-indigo-500/30 flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-white font-bold text-xs tracking-tight">Phototor Account</h4>
                <p className="text-[11px] text-gray-400">Sign in or create a free account to save & manage your access.</p>
              </div>
            </div>
            <button
              onClick={onOpenAuth}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30 transition-all cursor-pointer shrink-0"
            >
              Sign In / Sign Up 🔑
            </button>
          </div>
        )}

        {/* TAB 1: PROJECTS & RECENT PROJECTS */}
        {activeTab === 'projects' && (
          <div className="space-y-10">
            {/* Call to Action Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Box 1: Create New Project or Open Local Image */}
              <div
                className="group relative flex flex-col justify-between p-6 rounded-xl bg-[#141419] border border-[#23232c] hover:border-indigo-500/50 hover:bg-[#181822] transition-all duration-300 shadow-sm overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-all duration-300" />
                <div className="flex items-center justify-between mb-4">
                  <div 
                    onClick={handleStartCreateProject}
                    className="flex items-center justify-center w-12 h-12 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 cursor-pointer group-hover:scale-105 transition-all"
                  >
                    <Plus className="w-6 h-6" />
                  </div>
                  <label 
                    className="flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded text-[11px] font-semibold cursor-pointer transition-colors"
                  >
                    <Upload className="w-3 h-3" />
                    Open Image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (!userProfile) {
                          onOpenAuth();
                          return;
                        }
                        if (projects.length >= 3) {
                          alert("Maximum 3 Projects Limit Reached!\n\nEach registered user can save up to 3 projects in the database. Please delete one of your old projects first to create a new project.");
                          return;
                        }
                        if (onOpenImageAsProject) {
                          onOpenImageAsProject(file);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
                <div>
                  <h3 
                    onClick={handleStartCreateProject}
                    className="font-sans font-bold text-base text-white tracking-tight mb-1 group-hover:text-indigo-300 transition-colors cursor-pointer"
                  >
                    New Project / Open Photo
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Start a new canvas with size presets or open a local photo with 100% original resolution.
                  </p>
                </div>
              </div>

              {/* Box 2: Quick Remove BG */}
              <div className="relative flex flex-col justify-between p-6 rounded-xl bg-[#141419] border border-[#23232c] hover:border-violet-500/50 hover:bg-[#181822] transition-all duration-300 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400">
                    <Zap className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono uppercase bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded">
                    AI Auto-Key
                  </span>
                </div>
                <div>
                  <h3 className="font-sans font-bold text-base text-white tracking-tight mb-1">
                    Instant Bg Remover
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed mb-4">
                    Instantly extract objects and subjects from flat studio and solid-color backgrounds.
                  </p>
                  <label className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-[#1b1b22] hover:bg-[#22222d] border border-[#2a2a35] rounded-lg text-xs font-medium cursor-pointer transition-colors text-gray-200">
                    <Upload className="w-3.5 h-3.5" />
                    Upload Image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleQuickActionUpload(e, 'removeBg')}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Box 3: Quick Compress */}
              <div className="relative flex flex-col justify-between p-6 rounded-xl bg-[#141419] border border-[#23232c] hover:border-emerald-500/50 hover:bg-[#181822] transition-all duration-300 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <Scale className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">
                    Optimize
                  </span>
                </div>
                <div>
                  <h3 className="font-sans font-bold text-base text-white tracking-tight mb-1">
                    Image Optimizer
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed mb-4">
                    Compress large PNG, JPG, or WEBP images with custom quality control before sharing.
                  </p>
                  <label className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-[#1b1b22] hover:bg-[#22222d] border border-[#2a2a35] rounded-lg text-xs font-medium cursor-pointer transition-colors text-gray-200">
                    <Upload className="w-3.5 h-3.5" />
                    Choose File
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleQuickActionUpload(e, 'compress')}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

            </div>

            {/* Quick Action Preview Modal / Container */}
            {quickActionType && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-xl bg-[#141419] border border-indigo-500/30 shadow-lg relative"
              >
                <button
                  onClick={() => {
                    setQuickActionType(null);
                    setQuickActionFile(null);
                    setQuickActionOutput(null);
                  }}
                  className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded bg-[#1e1e24]"
                >
                  <X className="w-4 h-4" />
                </button>

                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-indigo-400" />
                  {quickActionType === 'removeBg' ? 'AI Background Removal' : 'Image Compression'}
                </h3>

                {quickActionProcessing ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                    <span className="text-xs text-gray-400">Processing image securely on client-side...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                      <span className="text-xs text-gray-400 font-mono">Original: {formatSize(quickActionSizeBefore)}</span>
                      <div className="w-full aspect-video bg-[#0a0a0d] rounded-lg overflow-hidden flex items-center justify-center border border-[#24242c] p-2">
                        {quickActionFile && (
                          <img
                            src={URL.createObjectURL(quickActionFile)}
                            className="max-h-full max-w-full object-contain"
                          />
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 justify-between">
                      <div className="flex flex-col gap-2">
                        <span className="text-xs text-emerald-400 font-mono">
                          Output: {quickActionSizeAfter ? formatSize(quickActionSizeAfter) : 'Compress to compute'}
                        </span>
                        <div className="w-full aspect-video bg-[#0a0a0d] checkerboard-pattern rounded-lg overflow-hidden flex items-center justify-center border border-[#24242c] p-2 relative">
                          {quickActionOutput ? (
                            <img
                              src={quickActionOutput}
                              className="max-h-full max-w-full object-contain"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <span className="text-xs text-gray-500">Output preview ready</span>
                          )}
                        </div>
                      </div>

                      {/* Compress slider if compress type */}
                      {quickActionType === 'compress' && (
                        <div className="space-y-3 bg-[#1c1c22] p-4 rounded-lg border border-[#26262f]">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-300 font-medium">Quality level:</span>
                            <span className="font-mono text-emerald-400 font-bold">{compressQuality}%</span>
                          </div>
                          <input
                            type="range"
                            min="10"
                            max="100"
                            value={compressQuality}
                            onChange={(e) => setCompressQuality(parseInt(e.target.value))}
                            className="w-full accent-indigo-500 h-1.5 bg-[#2d2d38] rounded-lg"
                          />
                          <button
                            onClick={executeCompress}
                            className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium text-xs transition-colors"
                          >
                            Recalculate Compression
                          </button>
                        </div>
                      )}

                      {quickActionOutput && (
                        <a
                          href={quickActionOutput}
                          download={`phototor_export_${quickActionType === 'removeBg' ? 'nobg' : 'optimized'}.${quickActionType === 'removeBg' ? 'png' : 'jpg'}`}
                          className="flex items-center justify-center gap-2 w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors mt-2"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download Result
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Recent Projects Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#24242b] pb-2">
                <h2 className="font-sans font-bold text-base text-white tracking-tight flex items-center gap-2">
                  <Folder className="w-4 h-4 text-indigo-400" />
                  Recent Projects
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{projects.length} saved project{projects.length !== 1 ? 's' : ''}</span>
                  {userProfile && (
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                      projects.length >= 3 
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                        : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                    }`}>
                      {projects.length} / 3 Proyek DB {projects.length >= 3 ? '(Maksimal)' : ''}
                    </span>
                  )}
                </div>
              </div>

              {projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 border border-dashed border-[#24242b] rounded-xl bg-[#0f0f13] text-center">
                  <ImageIcon className="w-10 h-10 text-gray-600 mb-3" />
                  <p className="text-sm font-semibold text-gray-300">No projects yet</p>
                  <p className="text-xs text-gray-500 max-w-sm mt-1 mb-4">
                    Your local edits and layer projects are automatically synced and persisted directly in your browser.
                  </p>
                  <button
                    onClick={handleStartCreateProject}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New Canvas
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
                  {projects.map((proj) => (
                    <div
                      key={proj.id}
                      onClick={() => onOpenProject(proj.id)}
                      className="group flex flex-col bg-[#141419] border border-[#23232c] hover:border-indigo-500/30 rounded-xl overflow-hidden cursor-pointer transition-all duration-300"
                    >
                      {/* Project Thumbnail Preview */}
                      <div className="aspect-video w-full bg-[#0a0a0d] flex items-center justify-center overflow-hidden border-b border-[#23232c] relative">
                        {proj.thumbnail ? (
                          <img
                            src={proj.thumbnail}
                            alt={proj.name}
                            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                          />
                        ) : (
                          <ImageIcon className="w-8 h-8 text-gray-700" />
                        )}
                        <button
                          onClick={(e) => handleDeleteProj(e, proj.id)}
                          className="absolute top-2 right-2 p-1.5 bg-[#141419]/90 text-gray-400 hover:text-red-400 hover:bg-[#1c1c24] rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 border border-[#23232c]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="p-4 flex flex-col justify-between flex-1">
                        <div>
                          <h4 className="font-sans font-bold text-xs text-white truncate mb-1">
                            {proj.name}
                          </h4>
                          <span className="text-[10px] font-mono text-gray-500 block">
                            {proj.width} × {proj.height} px • {proj.layers.length} layers
                          </span>
                        </div>
                        <span className="text-[9px] font-mono text-gray-600 mt-3 block text-right">
                          Edited {new Date(proj.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Adsterra Native Banner Slot */}
            {ADSTERRA_CONFIG.enabled && ADSTERRA_CONFIG.nativeBanner.enabled && (
              <div className="w-full flex justify-center my-6">
                <AdsterraBanner format="native" />
              </div>
            )}
          </div>
        )}

        {/* TAB 2: BATCH PROCESSING */}
        {activeTab === 'batch' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Batch Setup Configuration */}
            <div className="space-y-6 bg-[#141419] p-6 rounded-xl border border-[#23232c]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-indigo-400" />
                Batch Config
              </h3>

              <div className="space-y-4 text-xs">
                {/* Resize width & height */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-400 block mb-1">Target Width (px)</label>
                    <input
                      type="number"
                      value={batchWidth}
                      onChange={(e) => setBatchWidth(Math.max(10, parseInt(e.target.value) || 0))}
                      className="w-full bg-[#1c1c24] border border-[#2a2a35] rounded p-2 text-white font-mono focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 block mb-1">Target Height (px)</label>
                    <input
                      type="number"
                      value={batchHeight}
                      onChange={(e) => setBatchHeight(Math.max(10, parseInt(e.target.value) || 0))}
                      className="w-full bg-[#1c1c24] border border-[#2a2a35] rounded p-2 text-white font-mono focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Target formats */}
                <div>
                  <label className="text-gray-400 block mb-1">Export Format</label>
                  <select
                    value={batchFormat}
                    onChange={(e: any) => setBatchFormat(e.target.value)}
                    className="w-full bg-[#1c1c24] border border-[#2a2a35] rounded p-2 text-white focus:border-indigo-500 focus:outline-none cursor-pointer font-medium"
                  >
                    <option value="image/jpeg">JPG Image</option>
                    <option value="image/png">PNG Transparent Image</option>
                    <option value="image/webp">WEBP Lightweight Image</option>
                  </select>
                </div>

                {/* Quality control */}
                {batchFormat !== 'image/png' && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Quality:</span>
                      <span className="font-mono text-indigo-400">{batchQuality}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={batchQuality}
                      onChange={(e) => setBatchQuality(parseInt(e.target.value))}
                      className="w-full accent-indigo-500 h-1 bg-[#2a2a35]"
                    />
                  </div>
                )}

                {/* Files selector drop area */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#2a2a35] hover:border-indigo-500/40 rounded-xl p-6 bg-[#1a1a22] flex flex-col items-center justify-center text-center cursor-pointer transition-colors"
                >
                  <Upload className="w-8 h-8 text-indigo-400 mb-2" />
                  <span className="font-semibold text-white">Upload Images</span>
                  <p className="text-[10px] text-gray-500 mt-1">PNG, JPG, WEBP • Select multiple files</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleBatchFileSelect}
                    className="hidden"
                  />
                </div>

                {batchJobs.length > 0 && (
                  <div className="space-y-2 pt-4">
                    <button
                      onClick={processBatch}
                      disabled={isBatchProcessing}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-[#252530] text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      {isBatchProcessing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Execute Batch Job
                        </>
                      )}
                    </button>
                    {batchJobs.some((j) => j.status === 'completed') && (
                      <button
                        onClick={downloadAllBatch}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        Download All Completed
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Batch Files Queue */}
            <div className="lg:col-span-2 bg-[#141419] p-6 rounded-xl border border-[#23232c] flex flex-col">
              <div className="flex items-center justify-between border-b border-[#24242b] pb-3 mb-4">
                <h3 className="text-sm font-bold text-white">Files Processing Queue ({batchJobs.length})</h3>
                {batchJobs.length > 0 && (
                  <button
                    onClick={() => setBatchJobs([])}
                    className="text-xs text-gray-500 hover:text-red-400 font-medium transition-colors"
                  >
                    Clear Queue
                  </button>
                )}
              </div>

              {batchJobs.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 text-center text-gray-500 text-xs">
                  <ImageIcon className="w-10 h-10 text-gray-700 mb-2" />
                  <p className="font-semibold text-gray-400">Queue is empty</p>
                  <p className="text-[10px] text-gray-600 mt-1 max-w-xs">
                    Add images using the config panel to execute batch resize, conversion, and compression in one click.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {batchJobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between p-3 bg-[#1a1a22] rounded-lg border border-[#24242d] text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded bg-[#0a0a0d] border border-[#24242c] overflow-hidden flex items-center justify-center p-0.5">
                          {job.resultUrl && (
                            <img
                              src={job.resultUrl}
                              className="w-full h-full object-contain"
                              alt="preview"
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-200 truncate max-w-[200px]">{job.fileName}</p>
                          <span className="text-[10px] font-mono text-gray-500">
                            Original: {formatSize(job.originalSize)}
                            {job.resultSize && ` → ${formatSize(job.resultSize)}`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Status badge */}
                        {job.status === 'pending' && (
                          <span className="text-[10px] font-mono text-gray-500 uppercase bg-[#24242d] px-2 py-0.5 rounded">
                            Pending
                          </span>
                        )}
                        {job.status === 'processing' && (
                          <div className="flex items-center gap-2">
                            <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                            <span className="text-[10px] font-mono text-indigo-400 uppercase">
                              {job.progress}%
                            </span>
                          </div>
                        )}
                        {job.status === 'completed' && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded uppercase">
                              Done
                            </span>
                            <button
                              onClick={() => downloadBatchFile(job)}
                              className="p-1.5 bg-[#252532] text-white hover:bg-indigo-600 rounded"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        {job.status === 'failed' && (
                          <span className="text-[10px] font-mono text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded uppercase">
                            Failed
                          </span>
                        )}

                        <button
                          onClick={() => removeBatchJob(job.id)}
                          className="text-gray-500 hover:text-red-400 p-1 rounded"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 3: PRICING & CREDITS */}
        {activeTab === 'pricing' && (
          <div className="space-y-8">
            <div className="text-center max-w-xl mx-auto space-y-3">
              <h2 className="font-sans font-bold text-2xl text-white tracking-tight">Flexible Freemium Plans</h2>
              <p className="text-sm text-gray-400 leading-relaxed">
                Phototor is free to use with basic local storage. Upgrade to Premium for batch operations, full-resolution AI keying, and ad-free workspace experience.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              
              {/* Free Plan */}
              <div className="bg-[#141419] p-8 rounded-2xl border border-[#23232c] flex flex-col justify-between space-y-6 relative">
                {!isPremium && (
                  <span className="absolute top-4 right-4 text-[10px] font-mono uppercase bg-indigo-500/10 text-indigo-300 px-2.5 py-1 rounded-full border border-indigo-500/30">
                    Your Current Plan
                  </span>
                )}
                <div>
                  <h3 className="font-sans font-bold text-lg text-white">Standard Starter</h3>
                  <p className="text-xs text-gray-500 mt-1">Perfect for fast crops and lightweight browser edits.</p>
                  
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-2xl font-bold font-mono text-white">$0</span>
                    <span className="text-xs text-gray-500">/ forever</span>
                  </div>

                  <ul className="mt-6 space-y-3 text-xs text-gray-300">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      Unlimited multi-layer canvas editing
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      Standard local IndexedDB sync (5 Projects)
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      Standard drawing, text, and shape tools
                    </li>
                    <li className="flex items-center gap-2 text-gray-500">
                      <X className="w-4 h-4 text-red-500 shrink-0" />
                      Support for Batch processing queue
                    </li>
                    <li className="flex items-center gap-2 text-gray-500">
                      <X className="w-4 h-4 text-red-500 shrink-0" />
                      Watermark-free export & ad-free panel
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => setIsPremium(false)}
                  disabled={!isPremium}
                  className="w-full py-2.5 bg-[#1f1f26] border border-[#2e2e3a] hover:bg-[#252530] text-gray-300 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {!isPremium ? 'Currently Active' : 'Switch to Starter'}
                </button>
              </div>

              {/* Premium Plan */}
              <div className="bg-[#191924] p-8 rounded-2xl border border-amber-500/30 flex flex-col justify-between space-y-6 relative overflow-hidden">
                {isPremium && (
                  <span className="absolute top-4 right-4 text-[10px] font-mono uppercase bg-amber-500/15 text-amber-400 px-2.5 py-1 rounded-full border border-amber-500/30">
                    Your Current Plan
                  </span>
                )}
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl" />
                
                <div>
                  <h3 className="font-sans font-bold text-lg text-amber-400 flex items-center gap-2">
                    <Shield className="w-4.5 h-4.5 text-amber-500" />
                    Phototor Pro
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">Engineered for content creators and freelancers.</p>
                  
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-2xl font-bold font-mono text-white">$9.99</span>
                    <span className="text-xs text-gray-500">/ month</span>
                  </div>

                  <ul className="mt-6 space-y-3 text-xs text-gray-200">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      Unlimited IndexedDB cloud storage sync
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      Full resolution Smart Background Remover
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      100+ batch resize/compress operations
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      Completely ad-free & premium canvas
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      High-fidelity Upscaler & object removal
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => setIsPremium(true)}
                  className={`w-full py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    isPremium
                      ? 'bg-amber-500 text-black hover:bg-amber-400'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20'
                  }`}
                >
                  {isPremium ? 'Active Premium Account' : 'Upgrade to Pro'}
                </button>
              </div>

            </div>
          </div>
        )}

        {/* SEO & COMPREHENSIVE LANDING CONTENT SECTION (H1, H2, H3, FAQ, & BACKLINK WIDGET) */}
        <div className="mt-16 pt-12 border-t border-[#22222c] space-y-16">
          
          {/* Main Hero SEO Heading */}
          <div className="text-center max-w-4xl mx-auto space-y-3">
            <h1 className="font-sans font-extrabold text-2xl md:text-3xl text-white tracking-tight leading-tight">
              Phototor Studio — Editor Foto Online Gratis Versi Browser
            </h1>
            <p className="text-xs md:text-sm text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Editor foto profesional versi web terbaik. Edit file PSD online, potong gambar dengan <strong className="text-indigo-400">Slice Tool &amp; Grid Cutter</strong>, hapus background otomatis berbasis AI, dan manipulasi gambar multi-layer secara profesional gratis langsung di browser PC dan HP tanpa instalasi.
            </p>
          </div>

          {/* Section 1: Core Features (H2 & H3) */}
          <section id="features" className="space-y-6">
            <div className="flex items-center gap-2 border-b border-[#22222e] pb-3">
              <h2 className="font-sans font-bold text-lg md:text-xl text-white tracking-tight">
                Fitur Unggulan Phototor Photo Editor Online Gratis
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-5 rounded-xl bg-[#141419] border border-[#23232c] space-y-2">
                <h3 className="font-bold text-sm text-indigo-300 flex items-center gap-1.5">
                  <span>🔪 Slice Tool &amp; Grid Cutter</span>
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Potong gambar menjadi kisi-kisi atau area presisi untuk desain web, slicing layout, dan ekspor potongan otomatis dalam format ZIP.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-[#141419] border border-[#23232c] space-y-2">
                <h3 className="font-bold text-sm text-purple-300 flex items-center gap-1.5">
                  <span>🎨 Multi-Layer &amp; Layer Styles</span>
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Kelola layer tanpa batas, blending modes, stroke, drop shadow, inner glow, dan penyesuaian gaya layer profesional.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-[#141419] border border-[#23232c] space-y-2">
                <h3 className="font-bold text-sm text-emerald-300 flex items-center gap-1.5">
                  <span>📈 Adjustment Curves &amp; Levels</span>
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Koreksi warna profesional menggunakan kurva RGB, histogram real-time, pencahayaan, kontras, saturasi, dan Filter Gallery artistik.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-[#141419] border border-[#23232c] space-y-2">
                <h3 className="font-bold text-sm text-amber-300 flex items-center gap-1.5">
                  <span>💾 Ekspor Format PSD &amp; WEBP</span>
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Simpan hasil desain ke berbagai format standar industri: PNG Transparan, JPEG, WEBP modern super ringan, dan paket proyek PSD.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: AI Studio Tools (H2 & H3) */}
          <section id="ai-tools" className="space-y-6">
            <div className="flex items-center gap-2 border-b border-[#22222e] pb-3">
              <h2 className="font-sans font-bold text-lg md:text-xl text-white tracking-tight">
                Teknologi Phototor AI: Hapus Background &amp; Upscale Foto HD 4K
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-[#141419] to-purple-950/20 border border-indigo-500/30 space-y-3">
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-indigo-400" />
                  <span>AI Hapus Background Otomatis</span>
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Pisahkan objek dari latar belakang secara instan dalam hitungan detik. Algoritma pemrosesan lokal menjaga privasi gambar Anda 100% aman.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-950/40 via-[#141419] to-pink-950/20 border border-purple-500/30 space-y-3">
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <Scale className="w-4 h-4 text-purple-400" />
                  <span>AI Super Resolution &amp; Upscaler</span>
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Tingkatkan resolusi gambar buram atau kecil menjadi tajam berkualitas HD hingga 4K tanpa kehilangan detail esensial foto Anda.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-[#141419] to-teal-950/20 border border-emerald-500/30 space-y-3">
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>AI Denoise &amp; Portrait Enhancer</span>
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Hilangkan noise foto pencahayaan minim dan haluskan tekstur kulit portrait secara alami dengan kecerdasan buatan terpadu.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Step-by-Step Tutorial Guide (HowTo Schema) */}
          <section id="tutorials" className="space-y-6">
            <div className="flex items-center gap-2 border-b border-[#22222e] pb-3">
              <h2 className="font-sans font-bold text-lg md:text-xl text-white tracking-tight">
                Panduan Cara Edit Foto Online Tanpa Aplikasi di Phototor
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-5 rounded-xl bg-[#141419] border border-[#23232c] space-y-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xs font-mono">
                  01
                </div>
                <h3 className="font-bold text-sm text-white">Upload atau Buat Kanvas</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Pilih preset ukuran media sosial (Instagram, YouTube Banner, TikTok) atau drag &amp; drop file gambar Anda ke area kerja Phototor.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-[#141419] border border-[#23232c] space-y-2">
                <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold text-xs font-mono">
                  02
                </div>
                <h3 className="font-bold text-sm text-white">Edit &amp; Gunakan Fitur AI</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Gunakan Sidebar Tools untuk memotong slice, menambah layer teks, menyesuaikan warna kurva, atau menghapus latar belakang secara otomatis.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-[#141419] border border-[#23232c] space-y-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs font-mono">
                  03
                </div>
                <h3 className="font-bold text-sm text-white">Ekspor Kualitas Tinggi</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Simpan gambar akhir dalam format PNG transparan, JPEG, WEBP, atau simpan struktur layer untuk diedit kembali kapan saja.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4: FAQ Section (FAQPage Schema) */}
          <section id="faq" className="space-y-6">
            <div className="flex items-center gap-2 border-b border-[#22222e] pb-3">
              <h2 className="font-sans font-bold text-lg md:text-xl text-white tracking-tight flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-400" />
                <span>Pertanyaan yang Sering Diajukan (FAQ)</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 rounded-xl bg-[#141419] border border-[#23232c] space-y-2">
                <h3 className="font-bold text-sm text-white">Apakah Phototor Studio adalah editor foto online versi website gratis?</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Ya! Phototor Studio dirancang sebagai <strong className="text-indigo-300">editor foto online gratis</strong> versi browser yang dapat langsung dijalankan tanpa perlu mengunduh software berat.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-[#141419] border border-[#23232c] space-y-2">
                <h3 className="font-bold text-sm text-white">Fitur unggulan apa saja yang tersedia di Phototor Studio?</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Phototor Studio mendukung Slice Tool (pemotong gambar layout web &amp; kisi-kisi), Layer Management tanpa batas, Layer Styles (Stroke, Shadow, Glow), Adjustment Curves RGB, Histogram, hingga AI Hapus Background otomatis.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-[#141419] border border-[#23232c] space-y-2">
                <h3 className="font-bold text-sm text-white">Apakah Phototor Studio dapat digunakan di perangkat HP (Smartphone)?</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Phototor Studio dirancang khusus untuk layar PC / Laptop (Desktop) agar memberikan alur kerja pengeditan foto yang lebih presisi, detail, dan nyaman. Untuk hasil pengeditan terbaik, kami sangat menyarankan Anda membukanya melalui perangkat Desktop/Laptop.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-[#141419] border border-[#23232c] space-y-2">
                <h3 className="font-bold text-sm text-white">Apakah Phototor Studio mendukung format PSD?</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Tentu. Anda dapat membuat desain ber-layer dan mengekspor proyek ke format PSD, PNG Transparan, JPEG, maupun WEBP modern super ringan.
                </p>
              </div>
            </div>
          </section>

          {/* Section 5: Backlink & Social Sharing Widget */}
          <section id="backlink-share" className="p-6 md:p-8 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-[#14141a] to-purple-950/40 border border-indigo-500/40 space-y-6 shadow-2xl">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#252535] pb-4">
              <div>
                <h2 className="font-sans font-bold text-lg md:text-xl text-white tracking-tight flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-indigo-400" />
                  <span>Bagikan Phototor &amp; Pasang Widget (Dapatkan Backlink)</span>
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Bantu rekomendasikan Phototor kepada teman atau pasang badge di blog/website Anda untuk mendukung komunitas editor foto gratis!
                </p>
              </div>

              {/* Share Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleCopyShareLink}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/30"
                >
                  {shareCopied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{shareCopied ? 'Tautan Tersalin!' : 'Salin Tautan Web'}</span>
                </button>
                <a
                  href="https://twitter.com/intent/tweet?text=Edit%20foto%20online%20gratis%20tanpa%20aplikasi%20di%20Phototor%20Studio!%20Fitur%20lengkap%20%2B%20Hapus%20Background%20AI%20%F0%9F%9A%80&url=https://phototorstudio.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 bg-[#1da1f2]/20 hover:bg-[#1da1f2]/30 text-[#1da1f2] border border-[#1da1f2]/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Twitter / X</span>
                </a>
              </div>
            </div>

            {/* HTML Embed Badge Block (Backlink Generator for Webmasters) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                  <Code className="w-4 h-4 text-amber-400" />
                  <span>Kode Embed Badge HTML (Untuk Blogger / Web Owner):</span>
                </label>
                <button
                  onClick={handleCopyEmbed}
                  className="text-[11px] font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {embedCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{embedCopied ? 'Kode HTML Tersalin!' : 'Salin Kode Badge'}</span>
                </button>
              </div>

              <div className="relative bg-[#0d0d12] border border-[#242432] rounded-xl p-3 font-mono text-[11px] text-gray-300 overflow-x-auto select-all">
                <code>
                  {`<a href="https://phototorstudio.com" target="_blank" title="Phototor Studio — Editor Foto Online Gratis"><img src="https://phototorstudio.com/logo.png" alt="Phototor Studio Editor Foto Online AI" width="180"/></a>`}
                </code>
              </div>
              <p className="text-[10px] text-gray-500">
                💡 Tempelkan kode HTML di atas ke blog atau situs Anda untuk menampilkan badge Phototor sekaligus mengirimkan backlink otomatis.
              </p>
            </div>
          </section>

        </div>

      </main>

      {/* CREATE NEW PROJECT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-3xl bg-[#141419] border border-[#2c2c36] rounded-xl overflow-hidden p-6 shadow-2xl space-y-5"
          >
            <div className="flex items-center justify-between border-b border-[#24242c] pb-3">
              <div>
                <h3 className="font-sans font-bold text-base text-white">Create New Workspace Canvas</h3>
                <p className="text-xs text-gray-400">Select a preset or enter custom dimensions</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white cursor-pointer transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left Column: Form Input fields (5 cols) */}
              <div className="md:col-span-5 space-y-4 text-xs">
                <div>
                  <label className="text-gray-400 block mb-1 font-medium">Project Name</label>
                  <input
                    type="text"
                    value={newProjName}
                    onChange={(e) => setNewProjName(e.target.value)}
                    className="w-full bg-[#1c1c24] border border-[#2a2a35] rounded-lg p-2.5 text-white font-medium focus:border-indigo-500 focus:outline-none transition-colors"
                    placeholder="Canvas project name..."
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-gray-400 block font-medium">Canvas Dimensions (px)</label>
                    <button
                      type="button"
                      onClick={handleSwapDimensions}
                      title="Swap Width & Height (Orientation)"
                      className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 font-mono transition-colors cursor-pointer"
                    >
                      <ArrowLeftRight className="w-3 h-3" />
                      Swap Orientation
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] text-gray-500 block mb-0.5">Width (W)</span>
                      <input
                        type="number"
                        min="10"
                        value={newProjWidth}
                        onChange={(e) => setNewProjWidth(Math.max(10, parseInt(e.target.value) || 0))}
                        className="w-full bg-[#1c1c24] border border-[#2a2a35] rounded-lg p-2 text-white font-mono focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] text-gray-500 block mb-0.5">Height (H)</span>
                      <input
                        type="number"
                        min="10"
                        value={newProjHeight}
                        onChange={(e) => setNewProjHeight(Math.max(10, parseInt(e.target.value) || 0))}
                        className="w-full bg-[#1c1c24] border border-[#2a2a35] rounded-lg p-2 text-white font-mono focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-[#0f0f13] border border-[#202028] rounded-lg text-[11px] space-y-1">
                  <div className="flex justify-between text-gray-400">
                    <span>Total Pixels:</span>
                    <span className="font-mono text-gray-200">{(newProjWidth * newProjHeight / 1000000).toFixed(2)} MP</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Aspect Ratio:</span>
                    <span className="font-mono text-indigo-300">
                      {(newProjWidth / newProjHeight).toFixed(2)}:1
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Presets choice (7 cols) */}
              <div className="md:col-span-7 flex flex-col space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-gray-400 font-bold">
                    Canvas Presets ({filteredPresets.length})
                  </span>
                </div>

                {/* Search & Category Filter */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-500" />
                    <input
                      type="text"
                      value={presetSearch}
                      onChange={(e) => setPresetSearch(e.target.value)}
                      placeholder="Search presets (e.g. Instagram, A4, 4K, Banner)..."
                      className="w-full pl-8 pr-3 py-1.5 bg-[#1c1c24] border border-[#2a2a35] rounded-lg text-xs text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
                    />
                    {presetSearch && (
                      <button
                        onClick={() => setPresetSearch('')}
                        className="absolute right-2.5 top-2 text-xs text-gray-500 hover:text-white"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {/* Category Tabs */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
                    {CANVAS_PRESET_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setPresetCategory(cat.id)}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                          presetCategory === cat.id
                            ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                            : 'bg-[#181820] text-gray-400 hover:text-gray-200 hover:bg-[#20202a]'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preset Cards List */}
                <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                  {filteredPresets.length === 0 ? (
                    <div className="py-8 text-center text-xs text-gray-500">
                      No presets matching search "{presetSearch}"
                    </div>
                  ) : (
                    filteredPresets.map((p) => {
                      const isSelected = newProjWidth === p.width && newProjHeight === p.height;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => applyPreset(p)}
                          className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600/15 border-indigo-500 text-white ring-1 ring-indigo-500/50'
                              : 'bg-[#1c1c24] border-[#2a2a35] hover:border-gray-500 text-gray-200 hover:bg-[#22222e]'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-100">{p.name}</span>
                              <span className="px-1.5 py-0.2 text-[9px] font-mono rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                {p.badge}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-400">{p.desc}</p>
                          </div>
                          <span className="font-mono text-[10px] text-gray-400 bg-[#121216] px-2 py-1 rounded border border-[#262632] shrink-0 ml-2">
                            {p.width} × {p.height}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[#24242c]">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-[#1e1e24] hover:bg-[#25252e] rounded-lg text-xs font-semibold text-gray-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCreate}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-semibold text-white transition-colors cursor-pointer shadow-lg"
              >
                Create Canvas
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm bg-[#141419] border border-[#2c2c36] rounded-xl overflow-hidden p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-2 text-red-500 font-bold border-b border-[#24242c] pb-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              <span>Delete Project?</span>
            </div>
            <p className="text-xs text-gray-300 leading-normal font-sans">
              Are you sure you want to permanently delete this project? This action cannot be undone and you will lose all layer states.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setProjectToDelete(null)}
                className="px-4 py-2 bg-[#252530] hover:bg-[#2d2d3c] rounded text-xs text-gray-300 font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded text-xs text-white font-semibold cursor-pointer transition-colors"
              >
                Delete Permanently
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* FOOTER & SPONSOR ADS STATIC BOX (Never covers editing canvas) */}
      <footer className="mt-auto px-8 py-4 border-t border-[#24242b] bg-[#111115] flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col md:flex-row items-center gap-4 text-[11px] text-gray-500">
          <div className="flex items-center gap-6">
            <span>© 2026 Phototor Studio Inc.</span>
            <a href="#" className="hover:text-gray-300">Terms of Service</a>
            <a href="#" className="hover:text-gray-300">Privacy Policy</a>
            <a href="#" className="hover:text-gray-300">FAQ Help</a>
          </div>
        </div>

        {/* Banner Ad Box for Free plan hidden until payment gateway is active */}
        {/* {!isPremium && (
          <div className="px-4 py-1.5 rounded-lg bg-[#191924]/80 border border-[#242436] text-[10px] text-gray-400 flex items-center gap-2">
            <span className="font-mono text-indigo-400 uppercase font-bold bg-indigo-500/10 px-1.5 py-0.5 rounded tracking-wider text-[8px]">
              SPONSORED
            </span>
            <span>Get unlimited AI credits and ad-free experience. Upgrade for $9.99/mo!</span>
            <button
              onClick={() => setActiveTab('pricing')}
              className="text-white hover:underline ml-1 font-semibold"
            >
              Upgrade
            </button>
          </div>
        )} */}
      </footer>
    </div>
  );
}
