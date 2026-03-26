/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  getDoc, 
  getDocs,
  setDoc,
  orderBy,
  Timestamp,
  increment,
  serverTimestamp
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { db, auth, signInWithGoogle, signUpEmail, signInEmail, signOut, updateProfile, sendPasswordResetEmail } from './firebase';
import firebaseConfig from '../firebase-applet-config.json';
import { nanoid } from 'nanoid';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { 
  Plus, 
  CheckCircle, 
  Clock, 
  XCircle, 
  ExternalLink, 
  Trophy, 
  Share2, 
  Key,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  CreditCard,
  Phone,
  ArrowRight,
  Eye,
  MoreVertical,
  Coins,
  Wallet,
  TrendingUp,
  ArrowUpRight,
  AlertCircle,
  History as HistoryIcon,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  Users,
  Settings,
  BarChart3,
  Zap,
  Award,
  Info,
  Mail,
  Lock,
  FileText,
  Cookie,
  HelpCircle,
  Briefcase,
  DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
  }
}

// --- Types ---
interface Offer {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  landingPageUrl: string;
  shortCode: string;
  rewardPoints: number;
  status: 'pending_admin' | 'active' | 'paused' | 'rejected';
  createdAt: Timestamp;
}

interface Swap {
  id: string;
  offerId: string;
  userId: string;
  offerCreatorId: string;
  screenshotUrl?: string; // Optional if using code
  proofCode?: string; // Optional if using screenshot
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp;
  rewardKey?: string;
}

interface Payment {
  id: string;
  userId: string;
  method: 'bkash' | 'faucetpay';
  accountNumber: string; // bKash number or FaucetPay email
  amount: number;
  credits: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp;
}

interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  points: number;
  earnedPoints: number;
  pepeBalance?: number;
  role: 'user' | 'admin' | 'advertiser' | 'publisher';
  savedBkashNumber?: string;
  savedFaucetPayEmail?: string;
  referralCode?: string;
  referredBy?: string;
  referralCount?: number;
}

interface Referral {
  id: string;
  referrerId: string;
  referredUserId: string;
  bonusAmount: number;
  pepeBonusAmount?: number;
  createdAt: Timestamp;
}

interface CreditLog {
  id: string;
  adminId: string;
  userId: string;
  amount: number;
  reason: string;
  timestamp: Timestamp;
}

interface Withdrawal {
  id: string;
  userId: string;
  method: 'bkash' | 'faucetpay';
  accountNumber: string; // bKash number or FaucetPay email
  points: number;
  pepeAmount: number;
  status: 'pending' | 'completed' | 'rejected';
  createdAt: Timestamp;
}

interface PasswordResetRequest {
  id: string;
  email: string;
  status: 'pending' | 'completed';
  createdAt: Timestamp;
}

interface Config {
  adminBkashNumber: string;
  adminFaucetPayEmail: string;
  referralCreditBonus: number;
  referralPepeBonus: number;
  creditToPepeRate: number;
  signupBonus: number;
  signupReferralBonus: number;
  adDailyJob?: string;
  adBrowseOffer?: string;
  adMyOffer?: string;
  adWithdraw?: string;
  facebookPageUrl?: string;
  totalUsers?: number;
  totalOffers?: number;
  totalWithdrawals?: number;
}

interface DailyJob {
  id: string;
  title: string;
  description: string;
  url: string;
  rewardPoints: number;
  createdAt: Timestamp;
}

interface DailyJobCompletion {
  id: string;
  userId: string;
  jobId: string;
  date: string;
  completedAt: Timestamp;
}

// --- Components ---

const Button = ({ 
  className, 
  variant = 'primary', 
  size = 'md', 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger', size?: 'sm' | 'md' | 'lg' }) => {
  const variants = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
    secondary: 'bg-zinc-800 text-white hover:bg-zinc-900',
    outline: 'border border-zinc-200 text-zinc-700 hover:bg-zinc-50',
    ghost: 'text-zinc-600 hover:bg-zinc-100',
    danger: 'bg-red-600 text-white hover:bg-red-700'
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };
  return (
    <button 
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className
      )} 
      {...props} 
    />
  );
};

const Card = ({ className, children, ...props }: { className?: string, children: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('bg-white border border-zinc-100 rounded-2xl shadow-sm overflow-hidden', className)} {...props}>
    {children}
  </div>
);

const Badge = ({ children, variant = 'neutral', className }: { children: React.ReactNode, variant?: 'success' | 'warning' | 'error' | 'neutral' | 'primary', className?: string }) => {
  const variants = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    warning: 'bg-amber-50 text-amber-700 border-amber-100',
    error: 'bg-red-50 text-red-700 border-red-100',
    neutral: 'bg-zinc-50 text-zinc-600 border-zinc-100',
    primary: 'bg-blue-50 text-blue-700 border-blue-100'
  };
  return (
    <span className={cn('px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border rounded-full', variants[variant], className)}>
      {children}
    </span>
  );
};

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-zinc-900">{title}</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </motion.div>
    </div>
  );
};

const Notification = ({ message, type, onClose }: { message: string, type: 'success' | 'error' | 'info', onClose: () => void }) => {
  const renderMessage = (msg: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = msg.split(urlRegex);
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a 
            key={i} 
            href={part} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="underline font-bold hover:text-opacity-80 break-all"
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className={cn(
        "fixed bottom-6 left-6 right-6 md:left-auto md:w-96 z-[110] px-6 py-4 rounded-xl shadow-lg flex items-start gap-3 border",
        type === 'success' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : 
        type === 'error' ? "bg-red-50 text-red-700 border-red-100" : 
        "bg-blue-50 text-blue-700 border-blue-100"
      )}
    >
      <div className="mt-1">
        {type === 'success' ? <CheckCircle size={20} /> : type === 'error' ? <XCircle size={20} /> : <AlertCircle size={20} />}
      </div>
      <div className="flex-1">
        <p className="font-medium text-sm leading-relaxed">
          {renderMessage(message)}
        </p>
      </div>
      <button onClick={onClose} className="opacity-50 hover:opacity-100 p-1">
        <X size={16} />
      </button>
    </motion.div>
  );
};

const getTodayDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
};

const AdSpace = ({ code, className }: { code?: string, className?: string }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!code || !containerRef.current) return;
    
    // Clear previous content
    containerRef.current.innerHTML = '';
    
    // Create a temporary div to parse the HTML
    const div = document.createElement('div');
    div.innerHTML = code;
    
    // Append all nodes, but handle scripts specially
    Array.from(div.childNodes).forEach(node => {
      if (node.nodeName === 'SCRIPT') {
        const script = document.createElement('script');
        Array.from((node as HTMLScriptElement).attributes).forEach(attr => {
          script.setAttribute(attr.name, attr.value);
        });
        script.innerHTML = (node as HTMLScriptElement).innerHTML;
        containerRef.current?.appendChild(script);
      } else {
        containerRef.current?.appendChild(node.cloneNode(true));
      }
    });
  }, [code]);

  if (!code) return null;
  return (
    <div 
      ref={containerRef}
      className={cn("w-full overflow-hidden flex flex-col justify-center items-center my-6 min-h-[50px] bg-zinc-50/50 rounded-xl border border-dashed border-zinc-200", className)}
    />
  );
};

// --- Main App ---

// --- Footer Component ---
function Footer({ setView }: { setView: (v: any) => void }) {
  return (
    <footer className="bg-zinc-900 text-zinc-400 py-16 border-t border-zinc-800">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                <Share2 size={24} />
              </div>
              <span className="text-2xl font-black text-white tracking-tighter">AdSwap<span className="text-emerald-500">top</span></span>
            </div>
            <p className="text-sm leading-relaxed max-w-xs">
              The world's leading platform for ad credit swapping and daily job opportunities. Join thousands of users growing their reach today.
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all">
                <Users size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all">
                <BarChart3 size={18} />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6">Company</h4>
            <ul className="space-y-4 text-sm">
              <li><button onClick={() => setView('about')} className="hover:text-emerald-500 transition-colors">About Us</button></li>
              <li><button onClick={() => setView('contact')} className="hover:text-emerald-500 transition-colors">Contact Us</button></li>
              <li><button onClick={() => setView('browse')} className="hover:text-emerald-500 transition-colors">Features</button></li>
              <li><button onClick={() => setView('pricing')} className="hover:text-emerald-500 transition-colors">Pricing</button></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6">Legal</h4>
            <ul className="space-y-4 text-sm">
              <li><button onClick={() => setView('privacy')} className="hover:text-emerald-500 transition-colors">Privacy Policy</button></li>
              <li><button onClick={() => setView('terms')} className="hover:text-emerald-500 transition-colors">Terms of Service</button></li>
              <li><button onClick={() => setView('privacy')} className="hover:text-emerald-500 transition-colors">Cookie Policy</button></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6">Support</h4>
            <ul className="space-y-4 text-sm">
              <li><button onClick={() => setView('dashboard')} className="hover:text-emerald-500 transition-colors">Help Center</button></li>
              <li><button onClick={() => setView('referrals')} className="hover:text-emerald-500 transition-colors">Referral Program</button></li>
              <li><button onClick={() => setView('daily-jobs')} className="hover:text-emerald-500 transition-colors">Daily Jobs</button></li>
              <li><button onClick={() => setView('pricing')} className="hover:text-emerald-500 transition-colors">Credits</button></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-zinc-800 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
          <p>© 2026 AdSwaptop. All rights reserved.</p>
          <div className="flex gap-6">
            <button onClick={() => setView('privacy')} className="hover:text-white transition-colors">Privacy</button>
            <button onClick={() => setView('terms')} className="hover:text-white transition-colors">Terms</button>
            <button onClick={() => setView('contact')} className="hover:text-white transition-colors">Contact</button>
          </div>
        </div>
      </div>
    </footer>
  );
}

const LearnHow = ({ setView }: { setView: (v: any) => void }) => {
  return (
    <motion.div 
      key="learn-how" 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-8 max-w-4xl mx-auto pb-20"
    >
      <header className="text-center space-y-4">
        <div className="inline-flex p-3 bg-emerald-100 text-emerald-600 rounded-2xl mb-2">
          <HelpCircle size={32} />
        </div>
        <h2 className="text-4xl font-bold text-zinc-900 tracking-tight">কিভাবে কাজ করবেন? (Learn How)</h2>
        <p className="text-zinc-500 text-lg max-w-2xl mx-auto">
          AdSwaptop এ সফলভাবে কাজ করার জন্য নিচের গাইডলাইনটি অনুসরণ করুন। এখানে আপনি শিখতে পারবেন কিভাবে অফার তৈরি করবেন এবং কিভাবে ইনকাম করবেন।
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Section 1: How to Post a Job */}
        <Card className="p-8 space-y-4 border-2 border-emerald-100 hover:border-emerald-200 transition-colors">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
            <Plus size={24} />
          </div>
          <h3 className="text-2xl font-bold text-zinc-900">কিভাবে জব পোস্ট করবেন?</h3>
          <ul className="space-y-3 text-zinc-600">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xs font-bold">১</span>
              <span>প্রথমে <b>"Create Offer"</b> বাটনে ক্লিক করুন।</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xs font-bold">২</span>
              <span>আপনার জবের একটি সুন্দর টাইটেল এবং বিস্তারিত বর্ণনা দিন।</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xs font-bold">৩</span>
              <span>আপনার ল্যান্ডিং পেজ বা অফার লিংকটি প্রদান করুন।</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xs font-bold">৪</span>
              <span>কত ক্রেডিট রিওয়ার্ড দিতে চান তা সেট করুন এবং সাবমিট করুন।</span>
            </li>
          </ul>
          <Button onClick={() => setView('create')} className="w-full mt-4">এখনই জব পোস্ট করুন</Button>
        </Card>

        {/* Section 2: How to Create Landing Page */}
        <Card className="p-8 space-y-4 border-2 border-blue-100 hover:border-blue-200 transition-colors">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
            <FileText size={24} />
          </div>
          <h3 className="text-2xl font-bold text-zinc-900">কিভাবে ল্যান্ডিং পেজ তৈরি করবেন?</h3>
          <p className="text-zinc-600 text-sm">
            লিংক প্রমোট করার জন্য একটি ভালো ল্যান্ডিং পেজ থাকা জরুরি। আপনি নিচের ফ্রি টুলসগুলো ব্যবহার করতে পারেন:
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-zinc-50 rounded-xl border text-center">
              <span className="font-bold text-zinc-900">Linktree</span>
            </div>
            <div className="p-3 bg-zinc-50 rounded-xl border text-center">
              <span className="font-bold text-zinc-900">Blogger</span>
            </div>
            <div className="p-3 bg-zinc-50 rounded-xl border text-center">
              <span className="font-bold text-zinc-900">Carrd.co</span>
            </div>
            <div className="p-3 bg-zinc-50 rounded-xl border text-center">
              <span className="font-bold text-zinc-900">Google Sites</span>
            </div>
          </div>
          <p className="text-zinc-500 text-xs italic">টিপস: ল্যান্ডিং পেজে আপনার অফারের সুবিধাগুলো সুন্দরভাবে ফুটিয়ে তুলুন।</p>
        </Card>
      </div>

      {/* Section 3: General Guidelines */}
      <Card className="p-8 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
            <Zap size={24} />
          </div>
          <h3 className="text-2xl font-bold text-zinc-900">কাজের গাইডলাইন (Visual Guide)</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2 text-center">
            <div className="aspect-video bg-zinc-100 rounded-xl flex items-center justify-center border-2 border-dashed border-zinc-200">
              <Search className="text-zinc-400" size={40} />
            </div>
            <h4 className="font-bold">১. অফার খুঁজুন</h4>
            <p className="text-xs text-zinc-500">Browse Offers থেকে আপনার পছন্দের কাজ বেছে নিন।</p>
          </div>
          <div className="space-y-2 text-center">
            <div className="aspect-video bg-zinc-100 rounded-xl flex items-center justify-center border-2 border-dashed border-zinc-200">
              <ExternalLink className="text-zinc-400" size={40} />
            </div>
            <h4 className="font-bold">২. কাজ সম্পন্ন করুন</h4>
            <p className="text-xs text-zinc-500">লিংকে ভিজিট করে নির্দেশ অনুযায়ী কাজ শেষ করুন।</p>
          </div>
          <div className="space-y-2 text-center">
            <div className="aspect-video bg-zinc-100 rounded-xl flex items-center justify-center border-2 border-dashed border-zinc-200">
              <CheckCircle2 className="text-zinc-400" size={40} />
            </div>
            <h4 className="font-bold">৩. প্রুফ সাবমিট করুন</h4>
            <p className="text-xs text-zinc-500">কাজের স্ক্রিনশট বা প্রুফ দিয়ে সাবমিট করুন এবং ক্রেডিট বুঝে নিন।</p>
          </div>
        </div>
      </Card>

      {/* Section 4: Video Tutorials */}
      <div className="space-y-6">
        <h3 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
          <Zap className="text-red-500" size={24} /> ভিডিও টিউটোরিয়াল
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-xl">
            <iframe 
              width="100%" 
              height="100%" 
              src="https://www.youtube.com/embed/dQw4w9WgXcQ" 
              title="YouTube video player" 
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen
            ></iframe>
          </div>
          <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-xl">
            <iframe 
              width="100%" 
              height="100%" 
              src="https://www.youtube.com/embed/dQw4w9WgXcQ" 
              title="YouTube video player" 
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen
            ></iframe>
          </div>
        </div>
      </div>

      <div className="flex justify-center pt-8">
        <Button size="lg" onClick={() => setView('browse')} className="px-12 py-6 text-lg rounded-2xl shadow-xl shadow-emerald-200">
          এখনই কাজ শুরু করুন
        </Button>
      </div>
    </motion.div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [mySwaps, setMySwaps] = useState<Swap[]>([]);
  const [pendingSwapsForMe, setPendingSwapsForMe] = useState<Swap[]>([]);
  const [allAdminOffers, setAllAdminOffers] = useState<Offer[]>([]);
  const [adminOfferFilter, setAdminOfferFilter] = useState<'pending_admin' | 'active' | 'rejected' | 'paused'>('pending_admin');
  const [allPendingPayments, setAllPendingPayments] = useState<Payment[]>([]);
  const [allPendingWithdrawals, setAllPendingWithdrawals] = useState<Withdrawal[]>([]);
  const [allPendingSwaps, setAllPendingSwaps] = useState<Swap[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allCreditLogs, setAllCreditLogs] = useState<CreditLog[]>([]);
  const [dailyJobs, setDailyJobs] = useState<DailyJob[]>([]);
  const [myReferrals, setMyReferrals] = useState<Referral[]>([]);
  const [referralCodeFromUrl, setReferralCodeFromUrl] = useState<string | null>(null);
  const [myDailyJobCompletions, setMyDailyJobCompletions] = useState<DailyJobCompletion[]>([]);
  const [config, setConfig] = useState<Config>({
    adminBkashNumber: '01878324400',
    adminFaucetPayEmail: 'monnajamal2000@gmail.com',
    referralCreditBonus: 1000,
    referralPepeBonus: 4000,
    creditToPepeRate: 0.5,
    signupBonus: 150,
    signupReferralBonus: 20,
    adDailyJob: '',
    adBrowseOffer: '',
    adMyOffer: '',
    adWithdraw: '',
    totalUsers: 0,
    totalOffers: 0,
    totalWithdrawals: 0
  });
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'dashboard' | 'browse' | 'create' | 'my-offers' | 'my-swaps' | 'pricing' | 'admin' | 'withdraw' | 'daily-jobs' | 'privacy' | 'terms' | 'contact' | 'about' | 'referrals' | 'learn-how'>('dashboard');
  const [adminTab, setAdminTab] = useState<'offers' | 'payments' | 'users' | 'withdrawals' | 'daily-jobs' | 'credit-logs' | 'settings'>('offers');
  const [userSearch, setUserSearch] = useState('');
  const [logSearch, setLogSearch] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [submittingProofFor, setSubmittingProofFor] = useState<Offer | null>(null);
  const [adminAction, setAdminAction] = useState<{
    type: 'add' | 'deduct' | 'password' | 'delete' | 'role';
    user: UserProfile;
  } | null>(null);
  const [adminActionValue, setAdminActionValue] = useState('');
  const [adminActionReason, setAdminActionReason] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; onConfirm: () => void; } | null>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);
  const [offerClickTimes, setOfferClickTimes] = useState<Record<string, number>>({});
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const notify = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const isAdmin = profile?.role === 'admin' || (user?.email === 'monnajamal2000@gmail.com' && user?.emailVerified);

  const handleFirestoreError = (error: any, operationType: OperationType, path: string) => {
    const errInfo: FirestoreErrorInfo = {
      error: error.message || String(error),
      operationType,
      path,
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
      }
    };
    console.error('Firestore Error:', JSON.stringify(errInfo));
  };

  // Auth Listener
  useEffect(() => {
    // Check for referral code in URL
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    if (ref) {
      setReferralCodeFromUrl(ref);
      // Clean up URL without refreshing
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const userRef = doc(db, 'users', u.uid);
        try {
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            const newProfile: UserProfile = {
              uid: u.uid,
              displayName: u.displayName || 'Anonymous',
              email: u.email || '',
              photoURL: u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`,
              points: 150, // 150 points for new users
              earnedPoints: 0,
              role: u.email === 'monnajamal2000@gmail.com' ? 'admin' : 'publisher',
              referralCode: nanoid(8)
            };
            await setDoc(userRef, newProfile);
            
            // Increment totalUsers in config/main
            const configRef = doc(db, 'config', 'main');
            const configSnap = await getDoc(configRef);
            if (!configSnap.exists()) {
              // Initialize config if it doesn't exist
              const initialConfig: Config = {
                adminBkashNumber: '01XXXXXXXXX',
                adminFaucetPayEmail: 'admin@example.com',
                referralCreditBonus: 50,
                referralPepeBonus: 10,
                creditToPepeRate: 0.5,
                signupBonus: 150,
                signupReferralBonus: 50,
                totalUsers: 1,
                totalOffers: 0,
                totalWithdrawals: 0,
                adDailyJob: '',
                adBrowseOffer: '',
                adMyOffer: '',
                adWithdraw: ''
              };
              await setDoc(configRef, initialConfig);
            } else {
              await updateDoc(configRef, { totalUsers: increment(1) });
            }
            setProfile(newProfile);
          } else {
            const data = userSnap.data() as UserProfile;
            if (!data.referralCode) {
              const referralCode = nanoid(8);
              await updateDoc(userRef, { referralCode });
              setProfile({ ...data, referralCode });
            } else {
              setProfile(data);
            }
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `users/${u.uid}`);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Real-time Listeners (Global)
  useEffect(() => {
    // Config
    const unsubscribeConfig = onSnapshot(doc(db, 'config', 'main'), (snapshot) => {
      if (snapshot.exists()) setConfig(snapshot.data() as Config);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'config/main'));

    return () => unsubscribeConfig();
  }, []);

  // Real-time Listeners (User-dependent)
  useEffect(() => {
    if (!user) return;

    // Active Offers for Browsing
    const activeOffersQuery = query(collection(db, 'offers'), where('status', '==', 'active'), orderBy('createdAt', 'desc'));
    const unsubscribeOffers = onSnapshot(activeOffersQuery, (snapshot) => {
      setOffers(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Offer)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'offers'));

    // My Profile
    const unsubscribeProfile = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      if (snapshot.exists()) setProfile(snapshot.data() as UserProfile);
    }, (err) => handleFirestoreError(err, OperationType.GET, `users/${user.uid}`));

    // My Swaps
    const swapsQuery = query(collection(db, 'swaps'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsubscribeMySwaps = onSnapshot(swapsQuery, (snapshot) => {
      setMySwaps(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Swap)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'swaps'));

    // Pending Swaps for my offers (Manual Verification)
    const unsubscribeSwapsForMe = onSnapshot(query(collection(db, 'swaps'), where('offerCreatorId', '==', user.uid), where('status', '==', 'pending')), (snapshot) => {
      setPendingSwapsForMe(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Swap)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'swaps'));

    // Daily Jobs
    const unsubscribeDailyJobs = onSnapshot(query(collection(db, 'dailyJobs'), orderBy('createdAt', 'desc')), (snapshot) => {
      setDailyJobs(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DailyJob)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'dailyJobs'));

    // My Daily Job Completions (Today)
    const today = getTodayDate();
    const unsubscribeMyCompletions = onSnapshot(query(collection(db, 'dailyJobCompletions'), where('userId', '==', user.uid), where('date', '==', today)), (snapshot) => {
      setMyDailyJobCompletions(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DailyJobCompletion)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'dailyJobCompletions'));

    // My Referrals
    const unsubscribeMyReferrals = onSnapshot(query(collection(db, 'referrals'), where('referrerId', '==', user.uid)), (snapshot) => {
      const referrals = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Referral));
      // Sort client-side to avoid index requirement
      referrals.sort((a, b) => {
        const timeA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      setMyReferrals(referrals);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'referrals'));

    // Admin Listeners
    let unsubscribeAdminOffers: () => void = () => {};
    let unsubscribePendingPayments: () => void = () => {};
    let unsubscribePendingWithdrawals: () => void = () => {};
    let unsubscribeUsers: () => void = () => {};
    let unsubscribeCreditLogs: () => void = () => {};
    let unsubscribeAllPendingSwaps: () => void = () => {};

    if (isAdmin) {
      unsubscribeAdminOffers = onSnapshot(query(collection(db, 'offers')), (snapshot) => {
        setAllAdminOffers(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Offer)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'offers (admin)'));

      unsubscribePendingPayments = onSnapshot(query(collection(db, 'payments'), where('status', '==', 'pending')), (snapshot) => {
        setAllPendingPayments(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'payments (admin)'));

      unsubscribePendingWithdrawals = onSnapshot(query(collection(db, 'withdrawals'), where('status', '==', 'pending')), (snapshot) => {
        setAllPendingWithdrawals(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Withdrawal)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'withdrawals (admin)'));

      unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
        setAllUsers(snapshot.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'users (admin)'));

      unsubscribeCreditLogs = onSnapshot(query(collection(db, 'creditLogs'), orderBy('timestamp', 'desc')), (snapshot) => {
        setAllCreditLogs(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CreditLog)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'creditLogs (admin)'));

      unsubscribeAllPendingSwaps = onSnapshot(query(collection(db, 'swaps'), where('status', '==', 'pending')), (snapshot) => {
        setAllPendingSwaps(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Swap)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'swaps (admin)'));
    }

    return () => {
      unsubscribeOffers();
      unsubscribeProfile();
      unsubscribeMySwaps();
      unsubscribeSwapsForMe();
      unsubscribeDailyJobs();
      unsubscribeMyCompletions();
      unsubscribeMyReferrals();
      if (isAdmin) {
        unsubscribeAdminOffers();
        unsubscribePendingPayments();
        unsubscribePendingWithdrawals();
        unsubscribeUsers();
        unsubscribeCreditLogs();
        unsubscribeAllPendingSwaps();
      }
    };
  }, [user, isAdmin]);

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const name = formData.get('name') as string;
    const selectedRole = formData.get('role') as 'advertiser' | 'publisher' || 'publisher';

    try {
      if (authMode === 'signup') {
        const res = await signUpEmail(email, password);
        await updateProfile(res.user, { displayName: name });
        
        let referredBy = null;
        let points = config.signupBonus;

        // Check for referral
        if (referralCodeFromUrl) {
          const referrersQuery = query(collection(db, 'users'), where('referralCode', '==', referralCodeFromUrl));
          const referrersSnap = await getDocs(referrersQuery);
          
          if (!referrersSnap.empty) {
            const referrerDoc = referrersSnap.docs[0];
            referredBy = referrerDoc.id;
            points = config.signupBonus + config.signupReferralBonus;

            // Update referrer
            await updateDoc(doc(db, 'users', referredBy), {
              points: increment(config.referralCreditBonus),
              pepeBalance: increment(config.referralPepeBonus),
              referralCount: increment(1)
            });

            // Create referral record
            await addDoc(collection(db, 'referrals'), {
              referrerId: referredBy,
              referredUserId: res.user.uid,
              bonusAmount: config.referralCreditBonus,
              pepeBonusAmount: config.referralPepeBonus,
              createdAt: serverTimestamp()
            });
          }
        }

        // Create profile
        const userRef = doc(db, 'users', res.user.uid);
        const newProfile: UserProfile = {
          uid: res.user.uid,
          displayName: name,
          email: email,
          photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${res.user.uid}`,
          points: points,
          earnedPoints: 0,
          pepeBalance: 0,
          role: email === 'monnajamal2000@gmail.com' ? 'admin' : selectedRole,
          referralCode: nanoid(8),
          referredBy: referredBy || undefined,
          referralCount: 0
        };
        await setDoc(userRef, newProfile);
        setProfile(newProfile);
        notify('Account created successfully!', 'success');
      } else {
        await signInEmail(email, password);
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      if (err.code === 'auth/operation-not-allowed') {
        setAuthError('Authentication method (Email/Password) is not enabled in the Firebase Console. Please enable it under Authentication > Sign-in method.');
      } else {
        setAuthError(err.message);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCreateOffer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const landingPageUrl = formData.get('url') as string;
    const rewardPoints = 40; // Worker gets 40
    const shortCode = nanoid(8);

    try {
      await addDoc(collection(db, 'offers'), {
        creatorId: user.uid,
        title,
        description,
        landingPageUrl,
        shortCode,
        rewardPoints,
        status: 'pending_admin',
        createdAt: Timestamp.now()
      });
      await updateDoc(doc(db, 'config', 'main'), { totalOffers: increment(1) });
      notify('Offer submitted! Waiting for admin approval.', 'success');
      setView('my-offers');
    } catch (err) {
      console.error(err);
      notify('Failed to create offer', 'error');
    }
  };

  const handleSubmitSwap = async (offerId: string, screenshotUrl?: string, proofCode?: string) => {
    if (!user) return;
    if (!screenshotUrl && !proofCode) {
      notify('Please provide either a screenshot link or a proof code.', 'error');
      return;
    }
    console.log("Submitting swap for offer:", offerId, { screenshotUrl, proofCode });
    try {
      const offerRef = doc(db, 'offers', offerId);
      const offerSnap = await getDoc(offerRef);
      if (!offerSnap.exists()) {
        notify('Offer not found', 'error');
        return;
      }
      const offerData = offerSnap.data() as Offer;

      await addDoc(collection(db, 'swaps'), {
        offerId,
        userId: user.uid,
        offerCreatorId: offerData.creatorId,
        screenshotUrl: screenshotUrl || '',
        proofCode: proofCode || '',
        status: 'pending',
        createdAt: Timestamp.now()
      });
      notify('Swap submitted for verification!', 'success');
      setView('my-swaps');
    } catch (err: any) {
      console.error("Swap submission error:", err);
      notify('Failed to submit swap: ' + err.message, 'error');
    }
  };

  const handleCompleteDailyJob = async (job: DailyJob) => {
    if (!user) return;
    
    // Check if already completed today
    const today = getTodayDate();
    const alreadyCompleted = myDailyJobCompletions.some(c => c.jobId === job.id && c.date === today);
    if (alreadyCompleted) {
      notify('You have already completed this job today!', 'info');
      return;
    }

    try {
      // Record completion
      await addDoc(collection(db, 'dailyJobCompletions'), {
        userId: user.uid,
        jobId: job.id,
        date: today,
        completedAt: Timestamp.now()
      });

      // Add points
      await updateDoc(doc(db, 'users', user.uid), {
        points: increment(job.rewardPoints),
        earnedPoints: increment(job.rewardPoints)
      });

      notify(`Job completed! You earned ${job.rewardPoints} credits.`, 'success');
      window.open(job.url, '_blank');
    } catch (err) {
      console.error(err);
      notify('Failed to complete daily job', 'error');
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isAdmin) return;
    const formData = new FormData(e.currentTarget);
    const newConfig = {
      ...config,
      adminBkashNumber: formData.get('adminBkashNumber') as string,
      adminFaucetPayEmail: formData.get('adminFaucetPayEmail') as string,
      facebookPageUrl: formData.get('facebookPageUrl') as string,
      referralCreditBonus: Number(formData.get('referralCreditBonus')),
      referralPepeBonus: Number(formData.get('referralPepeBonus')),
      creditToPepeRate: Number(formData.get('creditToPepeRate')),
      signupBonus: Number(formData.get('signupBonus')),
      signupReferralBonus: Number(formData.get('signupReferralBonus')),
      totalUsers: Number(formData.get('totalUsers')),
      totalOffers: Number(formData.get('totalOffers')),
      totalWithdrawals: Number(formData.get('totalWithdrawals')),
      adDailyJob: formData.get('adDailyJob') as string,
      adBrowseOffer: formData.get('adBrowseOffer') as string,
      adMyOffer: formData.get('adMyOffer') as string,
      adWithdraw: formData.get('adWithdraw') as string
    };

    try {
      await setDoc(doc(db, 'config', 'main'), newConfig);
      notify('Settings updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating settings:', error);
      notify('Failed to update settings.', 'error');
    }
  };

  const handleCreateDailyJob = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isAdmin) return;
    
    // Check if already 4 jobs created today
    const today = getTodayDate();
    // We need to fetch jobs created today or just count existing ones if they are all "daily"
    // The user said "I can post 4 jobs every day". 
    // Let's assume they mean 4 active jobs at a time or 4 new ones per day.
    // Usually "Daily Jobs" are a fixed set. 
    // If they want to post 4 every day, I should check the count of jobs created today.
    const jobsToday = dailyJobs.filter(j => {
      const createdAt = (j.createdAt as any).toDate();
      const jobDate = `${createdAt.getFullYear()}-${createdAt.getMonth() + 1}-${createdAt.getDate()}`;
      return jobDate === today;
    });

    if (jobsToday.length >= 4) {
      notify('You can only post 4 daily jobs per day!', 'error');
      return;
    }
    
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const url = formData.get('url') as string;
    const rewardPoints = Number(formData.get('points'));

    try {
      await addDoc(collection(db, 'dailyJobs'), {
        title,
        description,
        url,
        rewardPoints,
        createdAt: Timestamp.now()
      });
      notify('Daily job created!', 'success');
      setAdminTab('daily-jobs');
    } catch (err) {
      console.error(err);
      notify('Failed to create daily job', 'error');
    }
  };

  const handleDeleteDailyJob = async (id: string) => {
    if (!isAdmin) return;
    setConfirmAction({
      title: 'Delete Daily Job',
      message: 'Are you sure you want to delete this daily job?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'dailyJobs', id));
          notify('Daily job deleted', 'success');
        } catch (err) {
          console.error(err);
          notify('Failed to delete daily job', 'error');
        }
      }
    });
  };
  const handleApproveSwap = async (swap: Swap, offer: Offer) => {
    try {
      const rewardKey = nanoid(12).toUpperCase();
      
      const creatorRef = doc(db, 'users', offer.creatorId);
      const creatorSnap = await getDoc(creatorRef);
      const creatorData = creatorSnap.data() as UserProfile;
      
      if (creatorData.points < 50) {
        notify('Offer creator does not have enough credits (50 required) to reward this swap.', 'error');
        return;
      }

      await updateDoc(doc(db, 'swaps', swap.id), {
        status: 'approved',
        rewardKey
      });
      
      // Add 40 points to visitor (worker)
      await updateDoc(doc(db, 'users', swap.userId), {
        points: increment(40),
        earnedPoints: increment(40)
      });
      
      // Deduct 50 points from creator (job holder)
      await updateDoc(creatorRef, {
        points: increment(-50)
      });
      
      notify('Swap approved! 40 credits sent to worker, 50 deducted from creator.', 'success');
    } catch (err) {
      console.error(err);
      notify('Failed to approve swap', 'error');
    }
  };

  const handleAdminApproveOffer = async (offerId: string) => {
    try {
      await updateDoc(doc(db, 'offers', offerId), { status: 'active' });
      notify('Offer approved!', 'success');
    } catch (err) {
      console.error(err);
      notify('Failed to approve offer', 'error');
    }
  };

  const handleAdminRejectOffer = async (offerId: string) => {
    try {
      await updateDoc(doc(db, 'offers', offerId), { status: 'rejected' });
      notify('Offer rejected!', 'success');
    } catch (err) {
      console.error(err);
      notify('Failed to reject offer', 'error');
    }
  };

  const handleAdminPauseOffer = async (offerId: string) => {
    try {
      await updateDoc(doc(db, 'offers', offerId), { status: 'paused' });
      notify('Offer paused!', 'success');
    } catch (err) {
      console.error(err);
      notify('Failed to pause offer', 'error');
    }
  };

  const handleBuyCredits = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const formData = new FormData(e.currentTarget);
    const method = formData.get('method') as 'bkash' | 'faucetpay';
    const accountNumber = formData.get('accountNumber') as string;
    const plan = formData.get('plan') as string;
    
    let credits = 0;
    let amount = 0;
    if (plan === '2000') { credits = 2000; amount = 50; }
    else if (plan === '4200') { credits = 4200; amount = 100; }
    else if (plan === '6000') { credits = 6000; amount = 135; }

    try {
      await addDoc(collection(db, 'payments'), {
        userId: user.uid,
        method,
        accountNumber,
        amount,
        credits,
        status: 'pending',
        createdAt: Timestamp.now()
      });

      // Save user's payment detail if not already saved
      const userRef = doc(db, 'users', user.uid);
      if (method === 'bkash') {
        await updateDoc(userRef, { savedBkashNumber: accountNumber });
      } else {
        await updateDoc(userRef, { savedFaucetPayEmail: accountNumber });
      }

      notify('Payment proof submitted! Admin will verify soon.', 'success');
      setView('dashboard');
    } catch (err) {
      console.error(err);
      notify('Failed to submit payment proof', 'error');
    }
  };

  const handleAdminApprovePayment = async (payment: Payment) => {
    try {
      await updateDoc(doc(db, 'payments', payment.id), { status: 'approved' });
      await updateDoc(doc(db, 'users', payment.userId), {
        points: increment(payment.credits)
      });
      notify('Payment approved and credits added!', 'success');
    } catch (err) {
      console.error(err);
      notify('Failed to approve payment', 'error');
    }
  };

  const handleWithdraw = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !profile) return;
    const formData = new FormData(e.currentTarget);
    const method = formData.get('method') as 'bkash' | 'faucetpay';
    const accountNumber = formData.get('accountNumber') as string;
    const pointsToConvert = parseInt(formData.get('points') as string) || 0;
    const pepeToWithdraw = parseInt(formData.get('pepeBonus') as string) || 0;

    if (pointsToConvert <= 0 && pepeToWithdraw <= 0) {
      notify('Please enter an amount to withdraw.', 'error');
      return;
    }

    if (pointsToConvert > (profile.earnedPoints || 0)) {
      notify('You do not have enough earned points.', 'error');
      return;
    }

    if (pepeToWithdraw > (profile.pepeBalance || 0)) {
      notify('You do not have enough Pepe bonus balance.', 'error');
      return;
    }

    const pepeFromPoints = pointsToConvert * config.creditToPepeRate;
    const totalPepeAmount = pepeFromPoints + pepeToWithdraw;

    if (totalPepeAmount < 2000) {
      notify('Minimum withdrawal is 2000 Pepe.', 'error');
      return;
    }

    if (totalPepeAmount > 1000000) {
      notify('Maximum withdrawal is 1,000,000 Pepe.', 'error');
      return;
    }

    // Check daily limit (1 payout per day)
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      
      // We can use the withdrawals state if we have it, but it's safer to query or check if we have a local list
      // Actually, we have allPendingWithdrawals but that's only for admins.
      // Let's use a simple check: we can't easily query without a new listener or a one-time get.
      // However, we can use the 'mySwaps' pattern if we had 'myWithdrawals'.
      // Let's assume we need to fetch or use a query.
      
      // For now, I'll add a check against a new state or just do a quick getDocs.
      // Since I can't easily add a new listener without more boilerplate, 
      // I'll check if the user has any withdrawals created today.
      
      const q = query(
        collection(db, 'withdrawals'), 
        where('userId', '==', user.uid),
        where('createdAt', '>=', Timestamp.fromDate(startOfDay))
      );
      
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        notify('You can only make 1 withdrawal per day.', 'error');
        return;
      }

      await addDoc(collection(db, 'withdrawals'), {
        userId: user.uid,
        method,
        accountNumber,
        points: pointsToConvert,
        pepeAmount: totalPepeAmount,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      // Save user's payment detail
      const userRef = doc(db, 'users', user.uid);
      if (method === 'bkash') {
        await updateDoc(userRef, { savedBkashNumber: accountNumber });
      } else {
        await updateDoc(userRef, { savedFaucetPayEmail: accountNumber });
      }

      // Deduct points from both points and earnedPoints, and deduct pepeBalance
      await updateDoc(doc(db, 'users', user.uid), {
        points: increment(-pointsToConvert),
        earnedPoints: increment(-pointsToConvert),
        pepeBalance: increment(-pepeToWithdraw)
      });

      notify(`Withdrawal request submitted for ${totalPepeAmount} Pepe coins! It will take 1-2 days to process.`, 'success');
      setView('dashboard');
    } catch (err) {
      console.error(err);
      notify('Failed to submit withdrawal request.', 'error');
    }
  };

  const handleSwitchRole = async () => {
    if (!user || !profile) return;
    const newRole = profile.role === 'advertiser' ? 'publisher' : 'advertiser';
    try {
      await updateDoc(doc(db, 'users', user.uid), { role: newRole });
      setProfile({ ...profile, role: newRole });
      notify(`Switched to ${newRole} mode!`, 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      notify('Failed to switch role', 'error');
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error("Google Auth error:", err);
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAdminApproveWithdrawal = async (withdrawal: Withdrawal) => {
    try {
      await updateDoc(doc(db, 'withdrawals', withdrawal.id), { status: 'completed' });
      await updateDoc(doc(db, 'config', 'main'), { totalWithdrawals: increment(1) });
      notify('Withdrawal marked as completed!', 'success');
    } catch (err) {
      console.error(err);
    }
  };
  
  const handleAdminAddCredits = async (uid: string, credits: number, reason: string) => {
    if (!auth.currentUser) return;
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        points: increment(credits)
      });
      
      // Log the adjustment
      await addDoc(collection(db, 'creditLogs'), {
        adminId: auth.currentUser.uid,
        userId: uid,
        amount: credits,
        reason: reason || 'Manual Credit Adjustment',
        timestamp: serverTimestamp()
      });

      notify(`Added ${credits} credits successfully!`, 'success');
    } catch (err: any) {
      console.error("Admin add credits error:", err);
      notify('Failed to add credits: ' + err.message, 'error');
    }
  };

  const handleAdminDeductCredits = async (uid: string, credits: number, reason: string) => {
    if (!auth.currentUser) return;
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        points: increment(-credits)
      });
      
      // Log the adjustment
      await addDoc(collection(db, 'creditLogs'), {
        adminId: auth.currentUser.uid,
        userId: uid,
        amount: -credits,
        reason: reason || 'Manual Credit Deduction',
        timestamp: serverTimestamp()
      });

      notify(`Deducted ${credits} credits successfully!`, 'success');
    } catch (err: any) {
      console.error("Admin deduct credits error:", err);
      notify('Failed to deduct credits: ' + err.message, 'error');
    }
  };

  const handleAdminChangePassword = async (uid: string, newPassword: string) => {
    if (!user) {
      console.log("No user logged in, cannot change password");
      return;
    }
    if (newPassword.length < 6) {
      notify('Password must be at least 6 characters long', 'error');
      return;
    }
    try {
      console.log(`Requesting ID token for admin: ${user.email}`);
      const idToken = await user.getIdToken(true); // Force refresh
      console.log(`ID token received, length: ${idToken.length}`);
      const res = await fetch(`/api/admin/users/${uid}/password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        console.log("Password changed successfully");
        notify('Password changed successfully!', 'success');
        setAdminAction(null);
        setAdminActionValue('');
      } else {
        console.error("Failed to change password:", data.error);
        notify('Failed to change password: ' + (data.error || 'Unknown error'), 'error');
      }
    } catch (err: any) {
      console.error("Admin change password error:", err);
      notify('Error: ' + err.message, 'error');
    }
  };

  const handleAdminChangeRole = async (uid: string, newRole: string) => {
    if (!user) return;
    try {
      const idToken = await user.getIdToken(true);
      const res = await fetch(`/api/admin/users/${uid}/role`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ newRole })
      });
      const data = await res.json();
      if (res.ok) {
        notify('Role updated successfully!', 'success');
        setAdminAction(null);
        setAdminActionValue('');
      } else {
        notify('Failed to update role: ' + (data.error || 'Unknown error'), 'error');
      }
    } catch (err: any) {
      console.error("Admin change role error:", err);
      notify('Error: ' + err.message, 'error');
    }
  };

  const handleAdminDeleteUser = async (uid: string) => {
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/admin/users/${uid}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      if (res.ok) notify('User deleted successfully!', 'success');
      else notify('Failed to delete user', 'error');
    } catch (err) {
      console.error(err);
      notify('Failed to delete user', 'error');
    }
  };

  const handleRequestPasswordReset = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      setShowForgotPasswordModal(false);
      setConfirmAction({
        title: 'Email Sent',
        message: `আপনার ইমেইলে (${email}) একটি পাসওয়ার্ড রিসেট লিঙ্ক পাঠানো হয়েছে। অনুগ্রহ করে আপনার ইনবক্স (বা স্প্যাম ফোল্ডার) চেক করুন।`,
        onConfirm: () => {}
      });
    } catch (err: any) {
      console.error("Password reset error:", err);
      notify('Failed to send reset email: ' + err.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col font-sans">
      {!user ? (
        <div className="min-h-screen bg-zinc-50 flex flex-col font-sans">
          {/* Navigation */}
          <nav className="w-full bg-white border-b border-zinc-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <Share2 size={24} />
            </div>
            <span className="text-2xl font-bold text-zinc-900 tracking-tight">AdSwaptop</span>
          </div>
          <div className="hidden md:flex gap-6 text-sm font-medium text-zinc-600">
            <a href="#features" className="hover:text-emerald-600 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-emerald-600 transition-colors">How it Works</a>
            <a href="#auth" className="hover:text-emerald-600 transition-colors">Sign In</a>
          </div>
        </nav>

        {/* Hero Section */}
        <main className="flex-1 flex flex-col md:flex-row items-center justify-center max-w-7xl mx-auto w-full px-6 py-12 md:py-24 gap-12">
          <div className="flex-1 space-y-8 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-sm font-semibold">
              <span className="flex h-2 w-2 rounded-full bg-emerald-600"></span>
              The #1 Adsterra P2P Exchange
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold text-zinc-900 tracking-tight leading-tight">
              Boost Your <span className="text-emerald-600">Adsterra</span> Revenue Organically
            </h1>
            <p className="text-lg md:text-xl text-zinc-600 max-w-2xl mx-auto md:mx-0 leading-relaxed">
              AdSwaptop is the premier peer-to-peer platform for exchanging direct link clicks. Join our community of publishers, swap clicks safely, and maximize your earnings today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <a href="#auth" className="inline-flex items-center justify-center px-8 py-4 text-base font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1">
                Start Earning Now
                <ArrowRight className="ml-2 w-5 h-5" />
              </a>
              <a href="#features" className="inline-flex items-center justify-center px-8 py-4 text-base font-bold text-zinc-700 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-all">
                Learn More
              </a>
            </div>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-zinc-500 font-medium">
              <div className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Free Sign Up</div>
              <div className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 150 Bonus Credits</div>
              <div className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Secure P2P</div>
            </div>
          </div>

          {/* Auth Card */}
          <div id="auth" className="w-full max-w-md">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-8 rounded-3xl shadow-2xl border border-zinc-100 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-emerald-600"></div>
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-zinc-900 mb-2">
                  {authMode === 'login' ? 'Welcome Back' : 'Create Your Account'}
                </h2>
                <p className="text-zinc-500 text-sm">
                  {authMode === 'login' ? 'Sign in to manage your offers and swaps.' : 'Join AdSwaptop and get 150 free credits!'}
                </p>
              </div>

              <div className="mb-6">
                <Button variant="outline" onClick={handleGoogleSignIn} disabled={authLoading} className="w-full gap-2 py-6 text-base font-semibold border-zinc-200 hover:bg-zinc-50">
                  {authLoading ? (
                    <div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
                  ) : (
                    <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
                  )}
                  Continue with Google
                </Button>
                <div className="mt-6 relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-200"></div></div>
                  <div className="relative flex justify-center text-xs uppercase font-bold tracking-wider"><span className="bg-white px-4 text-zinc-400">Or use email</span></div>
                </div>
              </div>

              {authError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 leading-relaxed">
                  <p className="font-bold flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Authentication Error</p>
                  <p className="mt-1">{authError}</p>
                </div>
              )}

              <form onSubmit={handleAuth} className="space-y-4">
                {authMode === 'signup' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-zinc-700">Full Name</label>
                      <input name="name" required className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow bg-zinc-50 focus:bg-white" placeholder="John Doe" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-zinc-700">I am a...</label>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="relative flex items-center gap-2 p-3 border rounded-xl cursor-pointer hover:bg-zinc-50 transition-all border-zinc-200 has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50">
                          <input type="radio" name="role" value="publisher" defaultChecked className="peer hidden" />
                          <div className="w-4 h-4 rounded-full border border-zinc-300 flex items-center justify-center peer-checked:border-emerald-500">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 scale-0 transition-transform peer-checked:scale-100" />
                          </div>
                          <span className="text-sm font-bold text-zinc-700">Publisher</span>
                        </label>
                        <label className="relative flex items-center gap-2 p-3 border rounded-xl cursor-pointer hover:bg-zinc-50 transition-all border-zinc-200 has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50">
                          <input type="radio" name="role" value="advertiser" className="peer hidden" />
                          <div className="w-4 h-4 rounded-full border border-zinc-300 flex items-center justify-center peer-checked:border-emerald-500">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 scale-0 transition-transform peer-checked:scale-100" />
                          </div>
                          <span className="text-sm font-bold text-zinc-700">Advertiser</span>
                        </label>
                      </div>
                    </div>
                  </>
                )}
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-zinc-700">Email Address</label>
                  <input name="email" type="email" required className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow bg-zinc-50 focus:bg-white" placeholder="you@example.com" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-zinc-700">Password</label>
                  <input name="password" type="password" required className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow bg-zinc-50 focus:bg-white" placeholder="••••••••" />
                </div>
                
                {authMode === 'login' && (
                  <div className="text-right">
                    <button 
                      type="button"
                      onClick={() => setShowForgotPasswordModal(true)}
                      className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}

                <Button type="submit" className="w-full py-6 text-base font-bold mt-2 shadow-md hover:shadow-lg transition-all" disabled={authLoading}>
                  {authLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </div>
                  ) : (
                    authMode === 'signup' ? 'Create Account' : 'Sign In'
                  )}
                </Button>
              </form>
              
              <div className="mt-8 text-center">
                <button 
                  onClick={() => {
                    setAuthMode(authMode === 'login' ? 'signup' : 'login');
                    setAuthError(null);
                  }}
                  className="text-sm text-zinc-600 font-medium hover:text-emerald-600 transition-colors"
                >
                  {authMode === 'login' ? (
                    <>Don't have an account? <span className="font-bold text-emerald-600">Sign Up</span></>
                  ) : (
                    <>Already have an account? <span className="font-bold text-emerald-600">Sign In</span></>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        </main>

        {/* Platform Stats */}
        <section className="bg-zinc-50 py-12 border-y border-zinc-200">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-6 relative overflow-hidden group border-none shadow-xl shadow-indigo-100/50 bg-gradient-to-br from-indigo-600 to-violet-700 text-white">
                <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                  <Users size={120} />
                </div>
                <div className="relative z-10 space-y-1">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-100/80">Total Users</p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-4xl font-black tracking-tight">{config.totalUsers || 0}</h3>
                    <span className="text-xs font-bold text-indigo-200">+{(config.totalUsers || 0) > 10 ? '12%' : '0%'}</span>
                  </div>
                  <p className="text-[10px] font-bold text-indigo-200/60 uppercase tracking-widest pt-2">Global Community</p>
                </div>
              </Card>

              <Card className="p-6 relative overflow-hidden group border-none shadow-xl shadow-emerald-100/50 bg-gradient-to-br from-emerald-600 to-teal-700 text-white">
                <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                  <ShieldCheck size={120} />
                </div>
                <div className="relative z-10 space-y-1">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-100/80">Total Offers Run</p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-4xl font-black tracking-tight">{config.totalOffers || 0}</h3>
                    <span className="text-xs font-bold text-emerald-200">Active Now</span>
                  </div>
                  <p className="text-[10px] font-bold text-emerald-200/60 uppercase tracking-widest pt-2">Campaigns Delivered</p>
                </div>
              </Card>

              <Card className="p-6 relative overflow-hidden group border-none shadow-xl shadow-amber-100/50 bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                  <Wallet size={120} />
                </div>
                <div className="relative z-10 space-y-1">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-100/80">Total Withdrawals</p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-4xl font-black tracking-tight">{config.totalWithdrawals || 0}</h3>
                    <span className="text-xs font-bold text-amber-200">Paid Out</span>
                  </div>
                  <p className="text-[10px] font-bold text-amber-200/60 uppercase tracking-widest pt-2">Successful Payouts</p>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="bg-white py-24 border-t border-zinc-100">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 mb-4">Why Choose AdSwaptop?</h2>
              <p className="text-lg text-zinc-600">Our platform is designed to give you the best tools to grow your Adsterra revenue safely and efficiently.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="p-8 rounded-3xl bg-zinc-50 border border-zinc-100 hover:shadow-xl transition-shadow">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-6">
                  <RefreshCw size={28} />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 mb-3">P2P Click Exchange</h3>
                <p className="text-zinc-600 leading-relaxed">Swap direct link clicks with real users. Create offers, set your credit reward, and watch your organic traffic grow.</p>
              </div>
              <div className="p-8 rounded-3xl bg-zinc-50 border border-zinc-100 hover:shadow-xl transition-shadow">
                <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-6">
                  <ShieldCheck size={28} />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 mb-3">Secure & Verified</h3>
                <p className="text-zinc-600 leading-relaxed">Every click is verified through our proof submission system. Admins review swaps to ensure high-quality traffic.</p>
              </div>
              <div className="p-8 rounded-3xl bg-zinc-50 border border-zinc-100 hover:shadow-xl transition-shadow">
                <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mb-6">
                  <Wallet size={28} />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 mb-3">Earn & Withdraw</h3>
                <p className="text-zinc-600 leading-relaxed">Accumulate credits by completing offers or daily jobs. Withdraw your earnings for real cash via bKash or Nagad.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-zinc-900 text-zinc-400 py-12 text-center">
          <div className="max-w-7xl mx-auto px-6 flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 text-white mb-4">
              <Share2 size={24} />
              <span className="text-xl font-bold tracking-tight">AdSwaptop</span>
            </div>
            <p>© {new Date().getFullYear()} AdSwaptop. All rights reserved.</p>
            <p className="text-sm max-w-md">The premier peer-to-peer platform for exchanging Adsterra direct link clicks. Safe, secure, and community-driven.</p>
          </div>
        </footer>
      </div>
    ) : (
      <div className="min-h-screen bg-zinc-50 flex flex-col">
      {/* Proof Submission Modal */}
      <AnimatePresence>
        {submittingProofFor && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-zinc-900">Submit Proof</h3>
                <button onClick={() => setSubmittingProofFor(null)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-800">
                <p>Provide a screenshot link (from sites like ImgBB, Lightshot) OR a verification code.</p>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                
                // Check if 30 seconds have passed since clicking the link
                const clickTime = offerClickTimes[submittingProofFor.id];
                const now = Date.now();
                if (!clickTime) {
                  notify("Please visit the offer link first!", "error");
                  window.open(submittingProofFor.landingPageUrl, '_blank');
                  setOfferClickTimes(prev => ({ ...prev, [submittingProofFor.id]: now }));
                  return;
                }
                
                const elapsed = now - clickTime;
                if (elapsed < 30000) {
                  const remaining = Math.ceil((30000 - elapsed) / 1000);
                  notify(`Please wait ${remaining} more seconds before submitting proof.`, 'error');
                  return;
                }

                const formData = new FormData(e.currentTarget);
                const url = formData.get('screenshotUrl') as string;
                const code = formData.get('proofCode') as string;
                handleSubmitSwap(submittingProofFor.id, url, code);
                setSubmittingProofFor(null);
              }} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-zinc-700">Screenshot URL (Link)</label>
                  <input name="screenshotUrl" placeholder="https://ibb.co/..." className="w-full px-4 py-2 rounded-lg border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-200"></div></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-zinc-400">Or</span></div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-zinc-700">Verification Code</label>
                  <input name="proofCode" placeholder="Enter code if provided" className="w-full px-4 py-2 rounded-lg border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                {(() => {
                  const clickTime = offerClickTimes[submittingProofFor.id];
                  const elapsed = currentTime - (clickTime || 0);
                  const isWaiting = clickTime && elapsed < 30000;
                  const remaining = Math.ceil((30000 - elapsed) / 1000);

                  return (
                    <Button 
                      type="submit" 
                      className="w-full py-3" 
                      disabled={isWaiting}
                    >
                      {isWaiting ? `Wait ${remaining}s...` : 'Submit Verification'}
                    </Button>
                  );
                })()}
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <nav className="bg-white border-b border-zinc-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('dashboard')}>
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                <Share2 size={18} />
              </div>
              <span className="text-xl font-bold text-zinc-900 tracking-tight">AdSwaptop</span>
            </div>
            
            <div className="hidden md:flex items-center space-x-4">
              <Button variant="ghost" onClick={() => setView('dashboard')} className={cn(view === 'dashboard' && 'bg-zinc-100')}>Dashboard</Button>
              
              {profile?.role === 'advertiser' ? (
                <>
                  <Button variant="ghost" onClick={() => setView('my-offers')} className={cn(view === 'my-offers' && 'bg-zinc-100')}>My Offers</Button>
                  <Button variant="ghost" onClick={() => setView('pricing')} className={cn(view === 'pricing' && 'bg-zinc-100')}>Buy Credits</Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => setView('browse')} className={cn(view === 'browse' && 'bg-zinc-100')}>Browse</Button>
                  <Button variant="ghost" onClick={() => setView('learn-how')} className={cn(view === 'learn-how' && 'bg-zinc-100')}>Learn How</Button>
                  <Button variant="ghost" onClick={() => setView('daily-jobs')} className={cn(view === 'daily-jobs' && 'bg-zinc-100')}>Daily Jobs</Button>
                  <Button variant="ghost" onClick={() => setView('withdraw')} className={cn(view === 'withdraw' && 'bg-zinc-100')}>Withdraw</Button>
                </>
              )}
              
              {isAdmin && <Button variant="ghost" onClick={() => setView('admin')} className={cn(view === 'admin' && 'bg-zinc-100')}>Admin</Button>}
              
              <div className="h-6 w-px bg-zinc-200 mx-2" />
              
              <div className="flex items-center gap-3 pl-2">
                <div className="text-right">
                  <p className="text-sm font-semibold text-zinc-900 leading-none">{profile?.displayName}</p>
                  <p className="text-xs text-emerald-600 font-bold mt-1">{profile?.points} Credits</p>
                </div>
                <img src={profile?.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-zinc-200" />
                <Button variant="ghost" size="sm" onClick={signOut}><LogOut size={18} /></Button>
              </div>
            </div>

            <div className="md:hidden flex items-center">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-zinc-600">
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white border-t border-zinc-100 overflow-hidden"
            >
              <div className="px-4 pt-2 pb-6 space-y-1">
                <button 
                  onClick={() => { setView('dashboard'); setIsMenuOpen(false); }}
                  className={cn("w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors", view === 'dashboard' ? "bg-emerald-50 text-emerald-700" : "text-zinc-600 hover:bg-zinc-50")}
                >
                  Dashboard
                </button>

                {profile?.role === 'advertiser' ? (
                  <>
                    <button 
                      onClick={() => { setView('my-offers'); setIsMenuOpen(false); }}
                      className={cn("w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors", view === 'my-offers' ? "bg-emerald-50 text-emerald-700" : "text-zinc-600 hover:bg-zinc-50")}
                    >
                      My Offers
                    </button>
                    <button 
                      onClick={() => { setView('pricing'); setIsMenuOpen(false); }}
                      className={cn("w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors", view === 'pricing' ? "bg-emerald-50 text-emerald-700" : "text-zinc-600 hover:bg-zinc-50")}
                    >
                      Buy Credits
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => { setView('browse'); setIsMenuOpen(false); }}
                      className={cn("w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors", view === 'browse' ? "bg-emerald-50 text-emerald-700" : "text-zinc-600 hover:bg-zinc-50")}
                    >
                      Browse Offers
                    </button>
                    <button 
                      onClick={() => { setView('learn-how'); setIsMenuOpen(false); }}
                      className={cn("w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors", view === 'learn-how' ? "bg-emerald-50 text-emerald-700" : "text-zinc-600 hover:bg-zinc-50")}
                    >
                      Learn How
                    </button>
                    <button 
                      onClick={() => { setView('daily-jobs'); setIsMenuOpen(false); }}
                      className={cn("w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors", view === 'daily-jobs' ? "bg-emerald-50 text-emerald-700" : "text-zinc-600 hover:bg-zinc-50")}
                    >
                      Daily Jobs
                    </button>
                    <button 
                      onClick={() => { setView('withdraw'); setIsMenuOpen(false); }}
                      className={cn("w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors", view === 'withdraw' ? "bg-emerald-50 text-emerald-700" : "text-zinc-600 hover:bg-zinc-50")}
                    >
                      Withdraw Pepe
                    </button>
                    <button 
                      onClick={() => { setView('referrals'); setIsMenuOpen(false); }}
                      className={cn("w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors", view === 'referrals' ? "bg-emerald-50 text-emerald-700" : "text-zinc-600 hover:bg-zinc-50")}
                    >
                      Referrals
                    </button>
                  </>
                )}
                {isAdmin && (
                  <button 
                    onClick={() => { setView('admin'); setIsMenuOpen(false); }}
                    className={cn("w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors", view === 'admin' ? "bg-emerald-50 text-emerald-700" : "text-zinc-600 hover:bg-zinc-50")}
                  >
                    Admin Panel
                  </button>
                )}
                
                <div className="pt-4 mt-4 border-t border-zinc-100">
                  <div className="flex items-center gap-3 px-4 py-3 mb-2">
                    <img src={profile?.photoURL} alt="Profile" className="w-10 h-10 rounded-full border border-zinc-200" />
                    <div>
                      <p className="text-sm font-bold text-zinc-900">{profile?.displayName}</p>
                      <p className="text-xs text-emerald-600 font-bold">{profile?.points} Credits</p>
                    </div>
                  </div>
                  <button 
                    onClick={signOut}
                    className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                  >
                    <LogOut size={18} /> Sign Out
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {view === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <img src={profile?.photoURL} alt="Profile" className="w-16 h-16 rounded-2xl border-2 border-white shadow-md" />
                    <div className={cn(
                      "absolute -bottom-1 -right-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-white shadow-sm",
                      profile?.role === 'advertiser' ? "bg-purple-600" : "bg-emerald-600"
                    )}>
                      {profile?.role}
                    </div>
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-zinc-900">Welcome, {profile?.displayName}!</h2>
                    <p className="text-zinc-500">
                      {profile?.role === 'advertiser' ? 'Manage your campaigns and verify submissions.' : 
                       profile?.role === 'publisher' ? 'Complete offers and earn rewards.' :
                       'Manage your P2P offer exchange and earnings.'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" onClick={handleSwitchRole} className="gap-2 border-zinc-200">
                    <RefreshCw size={16} /> Switch to {profile?.role === 'advertiser' ? 'Publisher' : 'Advertiser'}
                  </Button>
                  {profile?.role === 'advertiser' ? (
                    <Button onClick={() => setView('create')} className="gap-2 shadow-lg shadow-emerald-100"><Plus size={18} /> Create Offer</Button>
                  ) : (
                    <Button onClick={() => setView('browse')} className="gap-2 shadow-lg shadow-emerald-100"><Search size={18} /> Browse Offers</Button>
                  )}
                </div>
              </header>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-6 flex items-center gap-4 bg-emerald-600 text-white border-none shadow-lg shadow-emerald-100">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center"><Trophy size={24} /></div>
                  <div>
                    <p className="text-xs text-emerald-100 font-bold uppercase tracking-wider">Available Credits</p>
                    <p className="text-3xl font-black">{profile?.points}</p>
                  </div>
                </Card>
                <Card className="p-6 flex items-center gap-4 bg-zinc-900 text-white border-none shadow-lg shadow-zinc-200">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center"><TrendingUp size={24} /></div>
                  <div>
                    <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Earned Credits</p>
                    <p className="text-3xl font-black">{profile?.earnedPoints || 0}</p>
                  </div>
                </Card>
                <Card 
                  className="p-6 flex items-center gap-4 cursor-pointer hover:bg-zinc-50 transition-all group border-zinc-200/60"
                  onClick={() => setView('withdraw')}
                >
                  <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-100 transition-colors"><Coins size={24} /></div>
                  <div>
                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Pepe Value</p>
                    <p className="text-3xl font-black text-zinc-900">{(profile?.earnedPoints || 0) * 2} <span className="text-sm font-medium text-zinc-400">Pepe</span></p>
                  </div>
                </Card>
                <Card 
                  className="p-6 flex items-center gap-4 cursor-pointer hover:bg-zinc-50 transition-all group border-zinc-200/60"
                  onClick={() => setView('daily-jobs')}
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-100 transition-colors"><Zap size={24} /></div>
                  <div>
                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Daily Jobs</p>
                    <p className="text-3xl font-black text-zinc-900">{dailyJobs.length}</p>
                  </div>
                </Card>
              </div>

              {/* Live Preview Graphs */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-black text-zinc-900">Total Users Growth</h3>
                      <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Live Preview • Last 7 Days</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Users size={20} />
                    </div>
                  </div>
                  <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={[
                          { name: 'Mon', users: Math.floor(allUsers.length * 0.7) },
                          { name: 'Tue', users: Math.floor(allUsers.length * 0.75) },
                          { name: 'Wed', users: Math.floor(allUsers.length * 0.8) },
                          { name: 'Thu', users: Math.floor(allUsers.length * 0.85) },
                          { name: 'Fri', users: Math.floor(allUsers.length * 0.9) },
                          { name: 'Sat', users: Math.floor(allUsers.length * 0.95) },
                          { name: 'Sun', users: allUsers.length },
                        ]}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#a1a1aa', fontSize: 12, fontWeight: 600 }}
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#a1a1aa', fontSize: 12, fontWeight: 600 }}
                        />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 700 }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="users" 
                          stroke="#4f46e5" 
                          strokeWidth={3}
                          fillOpacity={1} 
                          fill="url(#colorUsers)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-black text-zinc-900">Total Ads Run</h3>
                      <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Live Preview • Last 7 Days</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <TrendingUp size={20} />
                    </div>
                  </div>
                  <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { name: 'Mon', ads: Math.floor(allAdminOffers.length * 0.6) },
                          { name: 'Tue', ads: Math.floor(allAdminOffers.length * 0.65) },
                          { name: 'Wed', ads: Math.floor(allAdminOffers.length * 0.7) },
                          { name: 'Thu', ads: Math.floor(allAdminOffers.length * 0.75) },
                          { name: 'Fri', ads: Math.floor(allAdminOffers.length * 0.8) },
                          { name: 'Sat', ads: Math.floor(allAdminOffers.length * 0.9) },
                          { name: 'Sun', ads: allAdminOffers.length },
                        ]}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#a1a1aa', fontSize: 12, fontWeight: 600 }}
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#a1a1aa', fontSize: 12, fontWeight: 600 }}
                        />
                        <Tooltip 
                          cursor={{ fill: '#f8fafc' }}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 700 }}
                        />
                        <Bar dataKey="ads" radius={[6, 6, 0, 0]}>
                          {[0, 1, 2, 3, 4, 5, 6].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 6 ? '#10b981' : '#d1fae5'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  {/* Role-specific Performance Overview */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-black text-zinc-900 flex items-center gap-2">
                        <BarChart3 size={20} className="text-emerald-600" />
                        {profile?.role === 'advertiser' ? 'Campaign Performance' : 'Earnings Overview'}
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {profile?.role === 'advertiser' ? (
                        <>
                          <div className="p-5 bg-white rounded-2xl border border-zinc-100 shadow-sm">
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Total Offers</p>
                            <div className="flex items-end gap-2">
                              <span className="text-2xl font-black text-zinc-900">{offers.filter(o => o.creatorId === user?.uid).length}</span>
                              <span className="text-xs font-bold text-emerald-600 mb-1 flex items-center">Created</span>
                            </div>
                          </div>
                          <div className="p-5 bg-white rounded-2xl border border-zinc-100 shadow-sm">
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Pending Proofs</p>
                            <div className="flex items-end gap-2">
                              <span className="text-2xl font-black text-zinc-900">{pendingSwapsForMe.filter(s => s.status === 'pending').length}</span>
                              <span className="text-xs font-bold text-amber-600 mb-1 flex items-center">To Verify</span>
                            </div>
                          </div>
                          <div className="p-5 bg-white rounded-2xl border border-zinc-100 shadow-sm">
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Active Campaigns</p>
                            <div className="flex items-end gap-2">
                              <span className="text-2xl font-black text-zinc-900">{offers.filter(o => o.creatorId === user?.uid && o.status === 'active').length}</span>
                              <span className="text-xs font-bold text-blue-600 mb-1 flex items-center">Live</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="p-5 bg-white rounded-2xl border border-zinc-100 shadow-sm">
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Swaps Completed</p>
                            <div className="flex items-end gap-2">
                              <span className="text-2xl font-black text-zinc-900">{mySwaps.filter(s => s.status === 'approved').length}</span>
                              <span className="text-xs font-bold text-emerald-600 mb-1 flex items-center"><ArrowUpRight size={12} /> Total</span>
                            </div>
                          </div>
                          <div className="p-5 bg-white rounded-2xl border border-zinc-100 shadow-sm">
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Pending Rewards</p>
                            <div className="flex items-end gap-2">
                              <span className="text-2xl font-black text-zinc-900">{mySwaps.filter(s => s.status === 'pending').length}</span>
                              <span className="text-xs font-bold text-amber-600 mb-1 flex items-center">Waiting</span>
                            </div>
                          </div>
                          <div className="p-5 bg-white rounded-2xl border border-zinc-100 shadow-sm">
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Daily Jobs</p>
                            <div className="flex items-end gap-2">
                              <span className="text-2xl font-black text-zinc-900">{dailyJobs.length}</span>
                              <span className="text-xs font-bold text-blue-600 mb-1 flex items-center">Available</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Primary Section Based on Role */}
                  {profile?.role === 'advertiser' ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-black text-zinc-900 flex items-center gap-2">
                          <CheckCircle2 size={20} className="text-emerald-600" />
                          Verify Submissions
                        </h3>
                        <Button variant="outline" size="sm" onClick={() => setView('my-offers')}>Manage Offers</Button>
                      </div>
                      {pendingSwapsForMe.filter(s => s.status === 'pending').length === 0 ? (
                        <Card className="p-12 text-center text-zinc-500 bg-zinc-50/50 border-dashed border-2">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400">
                              <CheckCircle size={24} />
                            </div>
                            <p className="font-medium">All caught up! No pending swaps for your offers.</p>
                          </div>
                        </Card>
                      ) : (
                        <div className="grid gap-4">
                          {pendingSwapsForMe.filter(s => s.status === 'pending').slice(0, 5).map(swap => {
                            const offer = offers.find(o => o.id === swap.offerId);
                            return (
                              <Card key={swap.id} className="p-4 flex items-center justify-between hover:border-emerald-200 transition-colors">
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-400 overflow-hidden border border-zinc-200">
                                    {swap.screenshotUrl ? (
                                      <img src={swap.screenshotUrl} className="w-full h-full object-cover" alt="Proof" />
                                    ) : (
                                      <Key size={20} className="text-emerald-600" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-black text-zinc-900">{offer?.title}</p>
                                    <div className="flex items-center gap-2">
                                      <p className="text-xs text-zinc-500 font-medium">User: {swap.userId.slice(0, 8)}</p>
                                      {swap.proofCode && (
                                        <Badge variant="neutral" className="text-[10px] py-0 px-1.5 font-mono">
                                          Code: {swap.proofCode}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  {swap.screenshotUrl && (
                                    <Button variant="outline" size="sm" onClick={() => window.open(swap.screenshotUrl, '_blank')} className="rounded-lg">View</Button>
                                  )}
                                  <Button size="sm" onClick={() => handleApproveSwap(swap, offer!)} className="rounded-lg shadow-md shadow-emerald-100">Approve</Button>
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-black text-zinc-900 flex items-center gap-2">
                          <Search size={20} className="text-emerald-600" />
                          Recommended Offers
                        </h3>
                        <Button variant="outline" size="sm" onClick={() => setView('browse')}>View All</Button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {offers.filter(o => o.status === 'active').slice(0, 4).map(offer => (
                          <Card key={offer.id} className="p-5 space-y-4 hover:border-emerald-200 transition-all group">
                            <div className="flex justify-between items-start">
                              <Badge variant="primary" className="bg-emerald-50 text-emerald-700 border-emerald-100">{offer.rewardPoints} Credits</Badge>
                              <div className="p-1.5 rounded-lg bg-zinc-50 text-zinc-400 group-hover:text-emerald-600 transition-colors">
                                <Zap size={14} />
                              </div>
                            </div>
                            <div>
                              <h4 className="font-black text-zinc-900 group-hover:text-emerald-700 transition-colors truncate">{offer.title}</h4>
                              <p className="text-xs text-zinc-500 line-clamp-1 mt-1">{offer.description}</p>
                            </div>
                            <Button size="sm" className="w-full rounded-xl" onClick={() => {
                              if (!offerClickTimes[offer.id]) {
                                setOfferClickTimes(prev => ({ ...prev, [offer.id]: Date.now() }));
                                window.open(offer.landingPageUrl, '_blank');
                              }
                              setSubmittingProofFor(offer);
                            }}>
                              {(() => {
                                const clickTime = offerClickTimes[offer.id];
                                const elapsed = currentTime - (clickTime || 0);
                                const isWaiting = clickTime && elapsed < 30000;
                                const remaining = Math.ceil((30000 - elapsed) / 1000);
                                if (isWaiting) return `Wait ${remaining}s`;
                                if (clickTime) return 'Submit Proof';
                                return 'Start Offer';
                              })()}
                            </Button>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-8">
                  {/* Secondary Section Based on Role */}
                  {profile?.role === 'advertiser' ? (
                    <div className="space-y-6">
                      <h3 className="text-xl font-black text-zinc-900 flex items-center gap-2">
                        <Trophy size={20} className="text-emerald-600" />
                        My Active Offers
                      </h3>
                      <div className="space-y-4">
                        {offers.filter(o => o.creatorId === user?.uid && o.status === 'active').slice(0, 3).map(offer => (
                          <div key={offer.id} className="p-4 bg-white rounded-2xl border border-zinc-100 shadow-sm space-y-3">
                            <div className="flex justify-between items-start">
                              <p className="font-bold text-sm text-zinc-900 truncate pr-2">{offer.title}</p>
                              <Badge variant="success" className="text-[10px]">Active</Badge>
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                              <span>Code: {offer.shortCode}</span>
                              <span className="text-emerald-600">{offer.rewardPoints} Credits</span>
                            </div>
                          </div>
                        ))}
                        {offers.filter(o => o.creatorId === user?.uid && o.status === 'active').length === 0 && (
                          <p className="text-center text-zinc-500 py-8 text-sm font-medium italic">No active offers found.</p>
                        )}
                        <Button variant="outline" className="w-full rounded-xl font-bold py-3" onClick={() => setView('my-offers')}>
                          Manage All Offers
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <h3 className="text-xl font-black text-zinc-900 flex items-center gap-2">
                        <TrendingUp size={20} className="text-emerald-600" />
                        Recent Activity
                      </h3>
                      <div className="space-y-4">
                        {mySwaps.slice(0, 5).map(swap => {
                          const offer = offers.find(o => o.id === swap.offerId);
                          return (
                            <div key={swap.id} className="flex gap-4 p-4 bg-white rounded-2xl border border-zinc-100 shadow-sm">
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                                swap.status === 'approved' ? "bg-emerald-50 text-emerald-600" :
                                swap.status === 'rejected' ? "bg-red-50 text-red-600" :
                                "bg-amber-50 text-amber-600"
                              )}>
                                {swap.status === 'approved' ? <CheckCircle2 size={18} /> : 
                                 swap.status === 'rejected' ? <XCircle size={18} /> : 
                                 <Clock size={18} />}
                              </div>
                              <div className="flex-grow min-w-0">
                                <p className="font-bold text-sm text-zinc-900 truncate">{offer?.title || 'Unknown Offer'}</p>
                                <p className="text-xs text-zinc-500 font-medium">
                                  {swap.status.charAt(0).toUpperCase() + swap.status.slice(1)} • {swap.createdAt.toDate().toLocaleDateString()}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-black text-sm text-zinc-900">+{offer?.rewardPoints || 0}</p>
                                <p className="text-[10px] font-bold text-zinc-400 uppercase">Credits</p>
                              </div>
                            </div>
                          );
                        })}
                        {mySwaps.length === 0 && (
                          <p className="text-center text-zinc-500 py-8 text-sm font-medium italic">No recent activity found.</p>
                        )}
                        <Button variant="outline" className="w-full rounded-xl font-bold py-3" onClick={() => setView('my-swaps')}>
                          View All Activity
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {view === 'learn-how' && <LearnHow setView={setView} />}

          {view === 'browse' && (
            <motion.div key="browse" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <header className="flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-bold text-zinc-900">Browse Offers</h2>
                  <p className="text-zinc-500">Complete offers to earn credits.</p>
                </div>
                <Button variant="outline" onClick={() => setView('learn-how')} className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                  <HelpCircle size={18} /> How to Work?
                </Button>
              </header>
              <AdSpace code={config.adBrowseOffer} />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {offers.map(offer => (
                  <Card key={offer.id} className="p-6 space-y-4 relative">
                    <div className="flex justify-between items-start">
                      <Badge variant="primary">{offer.rewardPoints} Credits</Badge>
                      <button className="p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors">
                        <MoreVertical size={18} />
                      </button>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-zinc-900">{offer.title}</h3>
                      <p className="text-sm text-zinc-500 line-clamp-2">{offer.description}</p>
                    </div>
                    <div className="p-3 bg-zinc-50 rounded-lg border text-xs font-mono truncate">
                      {offer.landingPageUrl}
                    </div>
                    <div className="flex gap-2">
                      <Button className="flex-grow gap-2" onClick={() => {
                        setOfferClickTimes(prev => ({ ...prev, [offer.id]: Date.now() }));
                        window.open(offer.landingPageUrl, '_blank');
                      }}>Visit Page <ExternalLink size={14} /></Button>
                      {(() => {
                        const clickTime = offerClickTimes[offer.id];
                        const elapsed = currentTime - (clickTime || 0);
                        const isWaiting = clickTime && elapsed < 30000;
                        const remaining = Math.ceil((30000 - elapsed) / 1000);
                        return (
                          <Button 
                            variant="secondary" 
                            onClick={() => setSubmittingProofFor(offer)}
                            disabled={isWaiting}
                          >
                            {isWaiting ? `Wait ${remaining}s` : 'Submit Proof'}
                          </Button>
                        );
                      })()}
                    </div>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

          {view === 'my-offers' && (
            <motion.div key="my-offers" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <header className="flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-bold text-zinc-900">My Offers</h2>
                  <p className="text-zinc-500">Manage the offers you've shared.</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setView('learn-how')} className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                    <HelpCircle size={18} /> Tutorial
                  </Button>
                  <Button onClick={() => setView('create')} className="gap-2"><Plus size={18} /> New Offer</Button>
                </div>
              </header>
              <AdSpace code={config.adMyOffer} />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {offers.filter(o => o.creatorId === user.uid).map(offer => (
                  <Card key={offer.id} className="p-6 space-y-4 relative">
                    <div className="flex justify-between items-start">
                      <Badge variant={offer.status === 'active' ? 'success' : offer.status === 'pending_admin' ? 'warning' : 'error'}>
                        {offer.status.replace('_', ' ')}
                      </Badge>
                      <button className="p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors">
                        <MoreVertical size={18} />
                      </button>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-zinc-900">{offer.title}</h3>
                      <p className="text-sm text-zinc-500 line-clamp-2">{offer.description}</p>
                    </div>
                    <div className="p-3 bg-zinc-50 rounded-lg border text-xs font-mono truncate">
                      {offer.landingPageUrl}
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-1 text-xs text-zinc-500">
                        <Trophy size={14} className="text-emerald-600" />
                        <span>{offer.rewardPoints} Reward</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-zinc-500">
                        <Share2 size={14} className="text-blue-600" />
                        <span>Code: {offer.shortCode}</span>
                      </div>
                    </div>
                  </Card>
                ))}
                {offers.filter(o => o.creatorId === user.uid).length === 0 && (
                  <Card className="col-span-full p-12 text-center text-zinc-500">
                    You haven't created any offers yet.
                  </Card>
                )}
              </div>
            </motion.div>
          )}

          {view === 'my-swaps' && (
            <motion.div key="my-swaps" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <header>
                <h2 className="text-3xl font-bold text-zinc-900">My Swaps</h2>
                <p className="text-zinc-500">Track your offer completions and rewards.</p>
              </header>
              <div className="grid gap-4">
                {mySwaps.map(swap => {
                  const offer = offers.find(o => o.id === swap.offerId);
                  return (
                    <Card key={swap.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-400 overflow-hidden">
                              {swap.screenshotUrl ? (
                                <img src={swap.screenshotUrl} className="w-full h-full object-cover" alt="Proof" />
                              ) : (
                                <Key size={20} className="text-emerald-600" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-zinc-900">{offer?.title || 'Unknown Offer'}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant={swap.status === 'approved' ? 'success' : swap.status === 'pending' ? 'warning' : 'error'}>
                                  {swap.status}
                                </Badge>
                                <span className="text-xs text-zinc-400">{swap.createdAt.toDate().toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {swap.proofCode && (
                              <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg">
                                <span className="text-xs font-mono font-bold text-zinc-600">Code: {swap.proofCode}</span>
                              </div>
                            )}
                            {swap.rewardKey && (
                              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-lg">
                                <Key size={14} className="text-emerald-600" />
                                <span className="text-xs font-mono font-bold text-emerald-700">{swap.rewardKey}</span>
                              </div>
                            )}
                            {swap.screenshotUrl && (
                              <Button variant="outline" size="sm" onClick={() => window.open(swap.screenshotUrl, '_blank')}>View Proof</Button>
                            )}
                          </div>
                    </Card>
                  );
                })}
                {mySwaps.length === 0 && (
                  <Card className="p-12 text-center text-zinc-500">
                    You haven't submitted any swaps yet.
                  </Card>
                )}
              </div>
            </motion.div>
          )}

          {view === 'create' && (
            <motion.div key="create" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-xl mx-auto">
              <Card className="p-8 space-y-6">
                <h2 className="text-2xl font-bold text-zinc-900">Share Your Offer</h2>
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-800">
                  <p className="font-bold">⚠️ Important Rule:</p>
                  <p>Direct Adsterra links are NOT allowed. You must provide a link to your Facebook Page or Website where the offer is hosted.</p>
                </div>
                <form onSubmit={handleCreateOffer} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-zinc-700">Offer Title</label>
                    <input name="title" required className="w-full px-4 py-2 rounded-lg border" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-zinc-700">Facebook/Website URL</label>
                    <input name="url" type="url" required placeholder="https://facebook.com/page/..." className="w-full px-4 py-2 rounded-lg border" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-zinc-700">Description</label>
                    <textarea name="description" required rows={3} className="w-full px-4 py-2 rounded-lg border resize-none" />
                  </div>
                    <div className="space-y-1">
                      <label className="text-sm font-bold text-zinc-700">Reward Credits (Fixed)</label>
                      <div className="w-full px-4 py-2 rounded-lg border bg-zinc-50 text-zinc-500 font-bold">
                        Worker gets 40, You pay 50
                      </div>
                    </div>
                  <Button type="submit" className="w-full py-3">Submit for Approval</Button>
                </form>
              </Card>
            </motion.div>
          )}

          {view === 'pricing' && (
            <motion.div key="pricing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              <header className="text-center space-y-2">
                <h2 className="text-3xl font-bold text-zinc-900">Buy Credits</h2>
                <p className="text-zinc-500">Boost your offers by purchasing more credits.</p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { credits: 2000, price: 50, color: 'bg-blue-50 text-blue-700 border-blue-100' },
                  { credits: 4200, price: 100, color: 'bg-emerald-50 text-emerald-700 border-emerald-100', popular: true },
                  { credits: 6000, price: 135, color: 'bg-purple-50 text-purple-700 border-purple-100' }
                ].map(plan => (
                  <Card key={plan.credits} className={cn('p-8 text-center space-y-6 relative', plan.popular && 'ring-2 ring-emerald-500')}>
                    {plan.popular && <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold">Most Popular</div>}
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-zinc-500">{plan.credits} Credits</h3>
                      <p className="text-4xl font-black text-zinc-900">৳{plan.price}</p>
                    </div>
                    <div className={cn('py-2 rounded-lg font-bold text-sm', plan.color)}>
                      One-time Purchase
                    </div>
                  </Card>
                ))}
              </div>

              <Card className="max-w-xl mx-auto p-8 space-y-6">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4 p-4 bg-zinc-50 rounded-2xl border">
                    <div className="w-12 h-12 rounded-full bg-pink-600 text-white flex items-center justify-center font-bold shrink-0">b</div>
                    <div>
                      <p className="text-sm font-bold text-zinc-900">bKash Personal: {config.adminBkashNumber}</p>
                      <p className="text-xs text-zinc-500">Send Money to this number and submit proof below.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-zinc-50 rounded-2xl border">
                    <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shrink-0">F</div>
                    <div>
                      <p className="text-sm font-bold text-zinc-900">FaucetPay Email: {config.adminFaucetPayEmail}</p>
                      <p className="text-xs text-zinc-500">Send USDT/Pepe to this email and submit proof below.</p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleBuyCredits} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-zinc-700">Select Plan</label>
                    <select name="plan" required className="w-full px-4 py-2 rounded-lg border">
                      <option value="2000">2000 Credits - ৳50 / $0.50</option>
                      <option value="4200">4200 Credits - ৳100 / $1.00</option>
                      <option value="6000">6000 Credits - ৳135 / $1.35</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-zinc-700">Payment Method</label>
                    <div className="grid grid-cols-2 gap-4">
                      <label className="flex items-center gap-2 p-3 border rounded-xl cursor-pointer hover:bg-zinc-50">
                        <input type="radio" name="method" value="bkash" defaultChecked />
                        <span className="text-sm font-medium">bKash</span>
                      </label>
                      <label className="flex items-center gap-2 p-3 border rounded-xl cursor-pointer hover:bg-zinc-50">
                        <input type="radio" name="method" value="faucetpay" />
                        <span className="text-sm font-medium">FaucetPay</span>
                      </label>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-zinc-700">Your Account (bKash Number or FaucetPay Email)</label>
                    <input 
                      name="accountNumber" 
                      required 
                      placeholder="01XXX-XXXXXX or email@example.com" 
                      defaultValue={profile?.savedBkashNumber || profile?.savedFaucetPayEmail || ''}
                      className="w-full px-4 py-2 rounded-lg border" 
                    />
                  </div>
                  <Button type="submit" className="w-full py-3">Submit Payment Proof</Button>
                </form>
              </Card>
            </motion.div>
          )}

          {view === 'withdraw' && (
            <motion.div key="withdraw" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              <header className="text-center max-w-2xl mx-auto space-y-4">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto">
                  <Coins size={40} />
                </div>
                <h2 className="text-4xl font-black text-zinc-900">Withdraw Pepe Coins</h2>
                <p className="text-zinc-500">Convert your earned credits into Pepe coins and withdraw to your FaucetPay account.</p>
              </header>
              <AdSpace code={config.adWithdraw} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                <Card className="p-8 space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-zinc-900">Conversion Info</h3>
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-emerald-700">Conversion Rate</span>
                        <span className="font-bold text-emerald-800">1 Credit = {config.creditToPepeRate} Pepe</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-emerald-700">Min Withdrawal</span>
                        <span className="font-bold text-emerald-800">2,000 Pepe</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-emerald-700">Max Withdrawal</span>
                        <span className="font-bold text-emerald-800">1,000,000 Pepe</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-emerald-700">Daily Limit</span>
                        <span className="font-bold text-emerald-800">1 Payout</span>
                      </div>
                      <div className="h-px bg-emerald-200" />
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-emerald-700">Earned Credits</span>
                        <span className="font-bold text-emerald-800">{profile?.earnedPoints || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-emerald-700">Pepe Bonus Balance</span>
                        <span className="font-bold text-emerald-800">{profile?.pepeBalance || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-emerald-700">Total Pepe Value</span>
                        <span className="text-xl font-black text-emerald-900">{((profile?.earnedPoints || 0) * config.creditToPepeRate) + (profile?.pepeBalance || 0)} Pepe</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-4 bg-zinc-50 rounded-2xl border">
                      <Clock className="text-zinc-400 mt-1" size={18} />
                      <div>
                        <p className="text-sm font-bold text-zinc-900">Processing Time</p>
                        <p className="text-xs text-zinc-500">Withdrawals are processed within 1-2 business days.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-zinc-50 rounded-2xl border">
                      <AlertCircle className="text-zinc-400 mt-1" size={18} />
                      <div>
                        <p className="text-sm font-bold text-zinc-900">FaucetPay Only</p>
                        <p className="text-xs text-zinc-500">We only support withdrawals to FaucetPay email addresses.</p>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="p-8">
                  <form onSubmit={handleWithdraw} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-zinc-700">Withdrawal Method</label>
                      <div className="grid grid-cols-2 gap-4">
                        <label className="flex items-center gap-2 p-3 border rounded-xl cursor-pointer hover:bg-zinc-50">
                          <input type="radio" name="method" value="faucetpay" defaultChecked />
                          <span className="text-sm font-medium">FaucetPay</span>
                        </label>
                        <label className="flex items-center gap-2 p-3 border rounded-xl cursor-pointer hover:bg-zinc-50">
                          <input type="radio" name="method" value="bkash" />
                          <span className="text-sm font-medium">bKash</span>
                        </label>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-zinc-700">Account Detail (Email or bKash Number)</label>
                      <input 
                        name="accountNumber" 
                        required 
                        placeholder="your-email@example.com or 01XXX-XXXXXX"
                        defaultValue={profile?.savedFaucetPayEmail || profile?.savedBkashNumber || ''}
                        className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-zinc-700">Credits to Convert</label>
                      <input 
                        name="points" 
                        type="number" 
                        min="0"
                        max={profile?.earnedPoints || 0}
                        placeholder={`Max: ${profile?.earnedPoints || 0}`}
                        className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                      />
                      <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Only earned credits can be converted</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-zinc-700">Pepe Bonus to Withdraw</label>
                      <input 
                        name="pepeBonus" 
                        type="number" 
                        min="0"
                        max={profile?.pepeBalance || 0}
                        placeholder={`Max: ${profile?.pepeBalance || 0}`}
                        className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                      />
                      <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Withdraw from your referral Pepe bonus</p>
                    </div>
                    <Button type="submit" className="w-full py-4 text-lg font-bold shadow-lg shadow-emerald-200">
                      Submit Withdrawal Request
                    </Button>
                  </form>
                </Card>
              </div>
            </motion.div>
          )}

          {view === 'daily-jobs' && (
            <motion.div key="daily-jobs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              <header className="text-center max-w-2xl mx-auto space-y-4">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto">
                  <Clock size={40} />
                </div>
                <h2 className="text-4xl font-black text-zinc-900">Daily Jobs</h2>
                <p className="text-zinc-500">Complete these simple tasks every day to earn extra credits!</p>
              </header>
              <AdSpace code={config.adDailyJob} />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {dailyJobs.length === 0 ? (
                  <div className="col-span-full text-center py-20 text-zinc-400">
                    No daily jobs available at the moment.
                  </div>
                ) : (
                  dailyJobs.map(job => {
                    const isCompleted = myDailyJobCompletions.some(c => c.jobId === job.id);
                    return (
                      <Card key={job.id} className={cn("p-6 flex flex-col justify-between", isCompleted && "opacity-60 grayscale")}>
                        <div className="space-y-4">
                          <div className="flex justify-between items-start">
                            <Badge variant={isCompleted ? 'success' : 'primary'}>
                              {isCompleted ? 'Completed' : 'Available'}
                            </Badge>
                            <span className="text-emerald-600 font-black text-xl">+{job.rewardPoints}</span>
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-zinc-900">{job.title}</h3>
                            <p className="text-sm text-zinc-500 mt-1">{job.description}</p>
                          </div>
                        </div>
                        <div className="mt-6">
                          {isCompleted ? (
                            <Button disabled className="w-full">Already Done Today</Button>
                          ) : (
                            <Button onClick={() => handleCompleteDailyJob(job)} className="w-full">
                              Complete Job <ArrowUpRight size={16} className="ml-2" />
                            </Button>
                          )}
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}

          {view === 'admin' && isAdmin && (
            <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col lg:flex-row gap-8">
              {/* Admin Sidebar - Glassmorphism style */}
              <aside className="lg:w-64 flex-shrink-0">
                <div className="sticky top-24 space-y-1 bg-white/80 backdrop-blur-md p-2 rounded-2xl border border-zinc-200/50 shadow-sm">
                  {[
                    { id: 'offers', label: 'Offers', icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { id: 'payments', label: 'Payments', icon: CreditCard, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { id: 'withdrawals', label: 'Withdrawals', icon: Wallet, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { id: 'daily-jobs', label: 'Daily Jobs', icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50' },
                    { id: 'users', label: 'Users', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { id: 'credit-logs', label: 'Credit Logs', icon: HistoryIcon, color: 'text-rose-600', bg: 'bg-rose-50' },
                    { id: 'settings', label: 'Settings', icon: Settings, color: 'text-zinc-600', bg: 'bg-zinc-50' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setAdminTab(tab.id as any)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all relative group",
                        adminTab === tab.id 
                          ? `${tab.bg} ${tab.color} shadow-sm` 
                          : "text-zinc-500 hover:bg-zinc-50/80 hover:text-zinc-900"
                      )}
                    >
                      <tab.icon size={18} className={cn("transition-transform group-hover:scale-110", adminTab === tab.id && "scale-110")} />
                      {tab.label}
                      {adminTab === tab.id && (
                        <motion.div 
                          layoutId="activeTabIndicator" 
                          className="absolute left-0 w-1 h-6 bg-current rounded-r-full" 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </aside>

              {/* Admin Content Area */}
              <div className="flex-1 space-y-8">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-black text-zinc-900 tracking-tight flex items-center gap-3">
                      Admin Panel
                      <Badge variant="primary" className="normal-case tracking-normal px-3 py-1 bg-indigo-50 text-indigo-600 border-indigo-100">v2.0 Premium</Badge>
                    </h2>
                    <p className="text-zinc-500 text-sm">Real-time platform management and analytics.</p>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100 shadow-sm">
                    <div className="relative">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping absolute inset-0" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 relative" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest">System Live</span>
                  </div>
                </header>

                {/* Admin Summary Metrics - Bento Grid Style */}
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                  {[
                    { label: 'Total Users', value: allUsers.length, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
                    { label: 'Active Offers', value: offers.filter(o => o.status === 'active').length, icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
                    { label: 'Pending Swaps', value: allPendingSwaps.length, icon: HistoryIcon, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
                    { label: 'Pending Payments', value: allPendingPayments.length, icon: CreditCard, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
                    { label: 'Pending Withdraws', value: allPendingWithdrawals.length, icon: Wallet, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
                    { label: 'Total Credits', value: allUsers.reduce((sum, u) => sum + (u.points || 0), 0).toLocaleString(), icon: Coins, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
                  ].map((stat, i) => (
                    <Card key={i} className={cn("p-5 border-2 transition-all hover:scale-[1.02] hover:shadow-lg", stat.bg, stat.border)}>
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4 shadow-sm bg-white", stat.color)}>
                        <stat.icon size={20} />
                      </div>
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">{stat.label}</p>
                      <p className="text-2xl font-black text-zinc-900 mt-2 tracking-tight">{stat.value}</p>
                    </Card>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  {adminTab === 'offers' && (
                    <motion.div key="admin-offers" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <h3 className="text-xl font-black text-zinc-900 flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                            <ShieldCheck size={18} />
                          </div>
                          Manage Offers
                        </h3>
                        <div className="flex flex-wrap bg-zinc-100 p-1 rounded-xl gap-1">
                          {(['pending_admin', 'active', 'rejected', 'paused'] as const).map(status => (
                            <button
                              key={status}
                              onClick={() => setAdminOfferFilter(status)}
                              className={cn(
                                "px-3 py-1.5 text-xs font-bold rounded-lg transition-all capitalize",
                                adminOfferFilter === status ? "bg-white text-emerald-600 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                              )}
                            >
                              {status.replace('_admin', '')}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      {allAdminOffers.filter(o => o.status === adminOfferFilter).length === 0 ? (
                        <Card className="p-12 text-center border-dashed border-2">
                          <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ShieldCheck className="text-zinc-300" size={32} />
                          </div>
                          <p className="text-zinc-500 font-medium">No {adminOfferFilter.replace('_admin', '')} offers found.</p>
                        </Card>
                      ) : (
                        <div className="grid gap-4">
                          {allAdminOffers.filter(o => o.status === adminOfferFilter).map(offer => (
                            <Card key={offer.id} className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-emerald-200 transition-colors">
                              <div className="space-y-1">
                                <p className="font-bold text-zinc-900">{offer.title}</p>
                                <p className="text-xs text-zinc-500 font-mono truncate max-w-[200px] sm:max-w-md">{offer.landingPageUrl}</p>
                              </div>
                              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                                <Button variant="outline" size="sm" onClick={() => window.open(offer.landingPageUrl, '_blank')} className="flex-1 sm:flex-none rounded-xl">
                                  <Eye size={14} className="mr-2" /> View
                                </Button>
                                {offer.status === 'pending_admin' && (
                                  <>
                                    <Button size="sm" onClick={() => handleAdminApproveOffer(offer.id)} className="flex-1 sm:flex-none rounded-xl">Approve</Button>
                                    <Button size="sm" variant="danger" onClick={() => handleAdminRejectOffer(offer.id)} className="flex-1 sm:flex-none rounded-xl">Reject</Button>
                                  </>
                                )}
                                {offer.status === 'active' && (
                                  <Button size="sm" variant="danger" onClick={() => handleAdminPauseOffer(offer.id)} className="flex-1 sm:flex-none rounded-xl">Pause</Button>
                                )}
                                {offer.status === 'paused' && (
                                  <Button size="sm" onClick={() => handleAdminApproveOffer(offer.id)} className="flex-1 sm:flex-none rounded-xl">Activate</Button>
                                )}
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {adminTab === 'payments' && (
                    <motion.div key="admin-payments" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                      <h3 className="text-xl font-black text-zinc-900 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                          <CreditCard size={18} />
                        </div>
                        Pending Payments
                      </h3>
                      {allPendingPayments.length === 0 ? (
                        <Card className="p-12 text-center border-dashed border-2">
                          <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CreditCard className="text-zinc-300" size={32} />
                          </div>
                          <p className="text-zinc-500 font-medium">No pending payments.</p>
                        </Card>
                      ) : (
                        <div className="grid gap-4">
                          {allPendingPayments.map(payment => (
                            <Card key={payment.id} className="p-5 flex items-center justify-between hover:border-blue-200 transition-colors">
                              <div className="space-y-1">
                                <p className="font-black text-zinc-900 text-lg">৳{payment.amount}</p>
                                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{payment.credits} Credits</p>
                                <p className="text-xs text-zinc-400 capitalize">{payment.method}: {payment.accountNumber}</p>
                              </div>
                              <Button size="sm" onClick={() => handleAdminApprovePayment(payment)} className="rounded-xl px-6">Approve</Button>
                            </Card>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {adminTab === 'withdrawals' && (
                    <motion.div key="admin-withdrawals" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                      <h3 className="text-xl font-black text-zinc-900 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                          <Wallet size={18} />
                        </div>
                        Pending Withdrawals
                      </h3>
                      {allPendingWithdrawals.length === 0 ? (
                        <Card className="p-12 text-center border-dashed border-2">
                          <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Wallet className="text-zinc-300" size={32} />
                          </div>
                          <p className="text-zinc-500 font-medium">No pending withdrawals.</p>
                        </Card>
                      ) : (
                        <div className="grid gap-4">
                          {allPendingWithdrawals.map(withdrawal => (
                            <Card key={withdrawal.id} className="p-5 flex items-center justify-between hover:border-amber-200 transition-colors">
                              <div className="space-y-1">
                                <p className="font-black text-zinc-900 text-lg">{withdrawal.pepeAmount} Pepe Coins</p>
                                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{withdrawal.points} Credits</p>
                                <p className="text-xs text-zinc-400 capitalize">{withdrawal.method}: {withdrawal.accountNumber}</p>
                              </div>
                              <Button size="sm" onClick={() => handleAdminApproveWithdrawal(withdrawal)} className="rounded-xl px-6">Complete</Button>
                            </Card>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {adminTab === 'settings' && (
                    <motion.div key="admin-settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                      <h3 className="text-xl font-black text-zinc-900 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-600 flex items-center justify-center">
                          <Settings size={18} />
                        </div>
                        Platform Settings
                      </h3>
                      <Card className="p-8 max-w-2xl">
                        <form onSubmit={handleUpdateSettings} className="space-y-6">
                          <div className="space-y-2">
                            <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">Admin bKash Number</label>
                            <input 
                              name="adminBkashNumber" 
                              defaultValue={config.adminBkashNumber} 
                              required 
                              className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-mono" 
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">Admin FaucetPay Email</label>
                            <input 
                              name="adminFaucetPayEmail" 
                              type="email"
                              defaultValue={config.adminFaucetPayEmail} 
                              required 
                              className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-mono" 
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">Facebook Page URL</label>
                            <input 
                              name="facebookPageUrl" 
                              type="url"
                              defaultValue={config.facebookPageUrl} 
                              required 
                              className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-mono" 
                              placeholder="https://facebook.com/yourpage"
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">Referral Credit Bonus</label>
                              <input name="referralCreditBonus" type="number" defaultValue={config.referralCreditBonus} required className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none" />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">Referral Pepe Bonus</label>
                              <input name="referralPepeBonus" type="number" defaultValue={config.referralPepeBonus} required className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none" />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">Credit to Pepe Rate</label>
                              <input name="creditToPepeRate" type="number" step="0.01" defaultValue={config.creditToPepeRate} required className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none" />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">Base Signup Bonus</label>
                              <input name="signupBonus" type="number" defaultValue={config.signupBonus} required className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none" />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">Referred User Extra Bonus</label>
                              <input name="signupReferralBonus" type="number" defaultValue={config.signupReferralBonus} required className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none" />
                            </div>
                          </div>

                          <div className="space-y-6 pt-6 border-t border-zinc-100">
                            <h4 className="text-sm font-black text-zinc-900 uppercase tracking-widest">Platform Statistics (Manual Override)</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">Total Users</label>
                                <input name="totalUsers" type="number" defaultValue={config.totalUsers} required className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none" />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">Total Offers</label>
                                <input name="totalOffers" type="number" defaultValue={config.totalOffers} required className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none" />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">Total Withdrawals</label>
                                <input name="totalWithdrawals" type="number" defaultValue={config.totalWithdrawals} required className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none" />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-6 pt-6 border-t border-zinc-100">
                            <h4 className="text-sm font-black text-zinc-900 uppercase tracking-widest">Advertisement Management</h4>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">Daily Job Page Ad Code</label>
                                <textarea name="adDailyJob" defaultValue={config.adDailyJob} className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-xs h-24" placeholder="Paste HTML/Script code here..." />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">Browse Offers Page Ad Code</label>
                                <textarea name="adBrowseOffer" defaultValue={config.adBrowseOffer} className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-xs h-24" placeholder="Paste HTML/Script code here..." />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">My Offers Page Ad Code</label>
                                <textarea name="adMyOffer" defaultValue={config.adMyOffer} className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-xs h-24" placeholder="Paste HTML/Script code here..." />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">Withdraw Page Ad Code</label>
                                <textarea name="adWithdraw" defaultValue={config.adWithdraw} className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-xs h-24" placeholder="Paste HTML/Script code here..." />
                              </div>
                            </div>
                          </div>

                          <Button type="submit" className="w-full py-4 text-lg font-bold rounded-xl shadow-lg shadow-emerald-100">
                            Save Configuration
                          </Button>
                        </form>
                      </Card>
                    </motion.div>
                  )}

                  {adminTab === 'daily-jobs' && (
                    <motion.div key="admin-daily-jobs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                      <Card className="p-8 border-purple-100 bg-purple-50/30">
                        <div className="flex justify-between items-center mb-6">
                          <h3 className="text-xl font-black text-zinc-900 flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                              <Plus size={18} />
                            </div>
                            Create Daily Job
                          </h3>
                          <Badge variant={dailyJobs.filter(j => {
                            const today = getTodayDate();
                            const jobDate = j.createdAt instanceof Timestamp ? 
                              new Date(j.createdAt.seconds * 1000).toISOString().split('T')[0] : 
                              new Date().toISOString().split('T')[0];
                            return jobDate === today;
                          }).length >= 4 ? 'error' : 'primary'}>
                            {dailyJobs.filter(j => {
                              const today = getTodayDate();
                              const jobDate = j.createdAt instanceof Timestamp ? 
                                new Date(j.createdAt.seconds * 1000).toISOString().split('T')[0] : 
                                new Date().toISOString().split('T')[0];
                              return jobDate === today;
                            }).length}/4 Posted Today
                          </Badge>
                        </div>
                        <form onSubmit={handleCreateDailyJob} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">Job Title</label>
                            <input name="title" required placeholder="e.g., Visit our Telegram" className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-purple-500 outline-none" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">Reward Points</label>
                            <input name="points" type="number" required placeholder="e.g., 20" className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-purple-500 outline-none" />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">Target URL</label>
                            <input name="url" type="url" required placeholder="https://..." className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-purple-500 outline-none" />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">Description</label>
                            <textarea name="description" required placeholder="What should the user do?" className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-purple-500 outline-none h-24" />
                          </div>
                          <div className="md:col-span-2">
                            <Button type="submit" className="w-full py-4 font-bold rounded-xl shadow-lg shadow-purple-100">Create Daily Job</Button>
                          </div>
                        </form>
                      </Card>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {dailyJobs.map(job => (
                          <Card key={job.id} className="p-5 flex justify-between items-center hover:border-purple-200 transition-colors">
                            <div>
                              <h4 className="font-bold text-zinc-900">{job.title}</h4>
                              <p className="text-xs font-bold text-purple-600 uppercase tracking-wider">{job.rewardPoints} Points</p>
                            </div>
                            <Button variant="danger" size="sm" onClick={() => handleDeleteDailyJob(job.id)} className="rounded-xl w-10 h-10 p-0">
                              <X size={16} />
                            </Button>
                          </Card>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {adminTab === 'users' && (
                    <motion.div key="admin-users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h3 className="text-xl font-black text-zinc-900 flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                            <Users size={18} />
                          </div>
                          User Management
                        </h3>
                        <div className="relative w-full md:w-72">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                          <input 
                            type="text" 
                            placeholder="Search users..." 
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                          />
                        </div>
                      </div>
                      <div className="grid gap-4">
                        {allUsers.filter(u => 
                          u.displayName.toLowerCase().includes(userSearch.toLowerCase()) || 
                          u.email.toLowerCase().includes(userSearch.toLowerCase())
                        ).length === 0 ? (
                          <Card className="p-12 text-center border-dashed border-2">
                            <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4">
                              <Users className="text-zinc-300" size={32} />
                            </div>
                            <p className="text-zinc-500 font-medium">No users found matching your search.</p>
                          </Card>
                        ) : (
                          allUsers.filter(u => 
                            u.displayName.toLowerCase().includes(userSearch.toLowerCase()) || 
                            u.email.toLowerCase().includes(userSearch.toLowerCase())
                          ).map(u => (
                            <Card key={u.uid} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-indigo-200 transition-all hover:shadow-md">
                              <div className="flex items-center gap-4">
                                <div className="relative">
                                  <img src={u.photoURL} alt={u.displayName} className="w-14 h-14 rounded-2xl border-2 border-white shadow-sm object-cover" />
                                  {u.role === 'admin' && (
                                    <div className="absolute -top-2 -right-2 bg-emerald-500 text-white p-1 rounded-lg shadow-sm">
                                      <ShieldCheck size={12} />
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <p className="font-black text-zinc-900 text-lg leading-tight">{u.displayName}</p>
                                  <p className="text-xs text-zinc-400 font-medium">{u.email}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="success" className="text-[10px] py-0 px-2">{u.points} Credits</Badge>
                                    <Badge variant="primary" className="text-[10px] py-0 px-2">{u.earnedPoints} Earned</Badge>
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button variant="outline" size="sm" onClick={() => setAdminAction({ type: 'add', user: u })} className="rounded-xl text-xs font-bold">Add Credits</Button>
                                <Button variant="outline" size="sm" onClick={() => setAdminAction({ type: 'deduct', user: u })} className="rounded-xl text-xs font-bold">Deduct</Button>
                                <Button variant="outline" size="sm" onClick={() => setAdminAction({ type: 'password', user: u })} className="rounded-xl text-xs font-bold">Password</Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  disabled={u.email === 'monnajamal2000@gmail.com'}
                                  onClick={() => {
                                    setAdminAction({ type: 'role', user: u });
                                    setAdminActionValue(u.role);
                                  }} 
                                  className="rounded-xl text-xs font-bold"
                                >
                                  Role
                                </Button>
                                <Button 
                                  variant="danger" 
                                  size="sm" 
                                  disabled={u.email === 'monnajamal2000@gmail.com'}
                                  onClick={() => setAdminAction({ type: 'delete', user: u })} 
                                  className="rounded-xl text-xs font-bold"
                                >
                                  Delete
                                </Button>
                              </div>
                            </Card>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}

                  {adminTab === 'credit-logs' && (
                    <motion.div key="admin-credit-logs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h3 className="text-xl font-black text-zinc-900 flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                            <HistoryIcon size={18} />
                          </div>
                          Audit Logs
                        </h3>
                        <div className="relative w-full md:w-72">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                          <input 
                            type="text" 
                            placeholder="Search logs..." 
                            value={logSearch}
                            onChange={(e) => setLogSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-rose-500 outline-none transition-all text-sm"
                          />
                        </div>
                      </div>
                      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-zinc-50/50 border-b border-zinc-100">
                              <tr>
                                <th className="px-6 py-4 font-black text-zinc-400 uppercase tracking-widest text-[10px]">Date</th>
                                <th className="px-6 py-4 font-black text-zinc-400 uppercase tracking-widest text-[10px]">Admin</th>
                                <th className="px-6 py-4 font-black text-zinc-400 uppercase tracking-widest text-[10px]">User</th>
                                <th className="px-6 py-4 font-black text-zinc-400 uppercase tracking-widest text-[10px]">Amount</th>
                                <th className="px-6 py-4 font-black text-zinc-400 uppercase tracking-widest text-[10px]">Reason</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-50">
                              {allCreditLogs.filter(log => {
                                const targetUser = allUsers.find(u => u.uid === log.userId);
                                return targetUser?.displayName.toLowerCase().includes(logSearch.toLowerCase()) || 
                                       targetUser?.email.toLowerCase().includes(logSearch.toLowerCase()) ||
                                       log.reason.toLowerCase().includes(logSearch.toLowerCase());
                              }).length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-400 italic">No logs found matching your search.</td>
                                </tr>
                              ) : (
                                allCreditLogs.filter(log => {
                                  const targetUser = allUsers.find(u => u.uid === log.userId);
                                  return targetUser?.displayName.toLowerCase().includes(logSearch.toLowerCase()) || 
                                         targetUser?.email.toLowerCase().includes(logSearch.toLowerCase()) ||
                                         log.reason.toLowerCase().includes(logSearch.toLowerCase());
                                }).map(log => {
                                  const admin = allUsers.find(u => u.uid === log.adminId);
                                  const targetUser = allUsers.find(u => u.uid === log.userId);
                                  return (
                                    <tr key={log.id} className="hover:bg-zinc-50/50 transition-colors">
                                      <td className="px-6 py-4 text-zinc-500 font-mono text-xs whitespace-nowrap">
                                        {log.timestamp?.toDate().toLocaleString()}
                                      </td>
                                      <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                          <img src={admin?.photoURL || 'https://picsum.photos/seed/admin/40/40'} className="w-6 h-6 rounded-lg border shadow-sm object-cover" />
                                          <span className="font-bold text-zinc-900">{admin?.displayName || 'Admin'}</span>
                                        </div>
                                      </td>
                                      <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                          <img src={targetUser?.photoURL || 'https://picsum.photos/seed/user/40/40'} className="w-6 h-6 rounded-lg border shadow-sm object-cover" />
                                          <span className="text-zinc-600 font-medium">{targetUser?.displayName || 'User'}</span>
                                        </div>
                                      </td>
                                      <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                          <span className={cn("font-black text-sm", log.amount > 0 ? "text-emerald-600" : "text-rose-600")}>
                                            {log.amount > 0 ? '+' : ''}{log.amount}
                                          </span>
                                          <Badge variant={log.amount > 0 ? 'success' : 'error'} className="text-[8px] py-0 px-1">
                                            {log.amount > 0 ? 'CREDIT' : 'DEBIT'}
                                          </Badge>
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 text-zinc-500 italic text-xs max-w-xs truncate">
                                        {log.reason}
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {view === 'referrals' && (
            <motion.div key="referrals" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
              <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                  <h2 className="text-4xl font-black text-zinc-900 tracking-tight">Referral Program</h2>
                  <p className="text-zinc-500 font-medium">Invite your friends and earn bonus credits for every successful referral.</p>
                </div>
                <div className="flex items-center gap-4 bg-emerald-50 px-6 py-4 rounded-2xl border border-emerald-100">
                  <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-200">
                    <Trophy size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-emerald-600 uppercase tracking-widest">Total Earned</p>
                    <p className="text-2xl font-black text-zinc-900">{(profile?.referralCount || 0) * 50} Credits</p>
                  </div>
                </div>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  <Card className="p-8 space-y-8 border-2 border-emerald-100 bg-emerald-50/20">
                    <div className="space-y-4">
                      <h3 className="text-2xl font-black text-zinc-900">Your Referral Link</h3>
                      <p className="text-zinc-600">Share this link with your friends. When they sign up, you'll get <span className="font-bold text-emerald-600">50 credits</span> and they'll get <span className="font-bold text-emerald-600">20 bonus credits</span>!</p>
                      
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-grow relative">
                          <input 
                            readOnly 
                            value={`${window.location.origin}?ref=${profile?.referralCode}`}
                            className="w-full pl-4 pr-12 py-4 rounded-xl border-2 border-emerald-200 bg-white font-mono text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-600">
                            <Share2 size={18} />
                          </div>
                        </div>
                        <Button 
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}?ref=${profile?.referralCode}`);
                            notify('Referral link copied!', 'success');
                          }}
                          className="py-4 px-8 rounded-xl shadow-lg shadow-emerald-200 text-lg font-bold"
                        >
                          Copy Link
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8 border-t border-emerald-100">
                      <div className="space-y-1">
                        <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Successful Invites</p>
                        <p className="text-3xl font-black text-zinc-900">{profile?.referralCount || 0}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Bonus per Referral</p>
                        <p className="text-2xl font-black text-emerald-600">{config.referralCreditBonus} Credits + {config.referralPepeBonus} Pepe</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">New User Bonus</p>
                        <p className="text-2xl font-black text-emerald-600">+{config.signupReferralBonus} Credits</p>
                      </div>
                    </div>
                  </Card>

                  <div className="space-y-6">
                    <h3 className="text-2xl font-black text-zinc-900 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-100 text-zinc-600 flex items-center justify-center">
                        <Users size={20} />
                      </div>
                      Recent Referrals
                    </h3>
                    
                    {myReferrals.length === 0 ? (
                      <Card className="p-12 text-center border-dashed border-2">
                        <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Users className="text-zinc-300" size={32} />
                        </div>
                        <p className="text-zinc-500 font-medium">No referrals yet. Start sharing your link!</p>
                      </Card>
                    ) : (
                      <div className="grid gap-4">
                        {myReferrals.map(referral => (
                          <Card key={referral.id} className="p-5 flex items-center justify-between hover:border-emerald-200 transition-colors">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                                {referral.referredUserId.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-zinc-900">User ID: {referral.referredUserId.substring(0, 8)}...</p>
                                <p className="text-xs text-zinc-400">Joined on {referral.createdAt instanceof Timestamp ? new Date(referral.createdAt.seconds * 1000).toLocaleDateString() : 'Recently'}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-black text-emerald-600">+{referral.bonusAmount} Credits</p>
                              {referral.pepeBonusAmount && <p className="text-[10px] font-bold text-emerald-500">+{referral.pepeBonusAmount} Pepe</p>}
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-8">
                  <Card className="p-6 bg-zinc-900 text-white border-none shadow-xl">
                    <h4 className="text-lg font-black mb-6 flex items-center gap-2">
                      <Zap size={18} className="text-yellow-400" />
                      How it works
                    </h4>
                    <div className="space-y-6">
                      <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-black text-xs shrink-0">1</div>
                        <p className="text-sm text-zinc-400"><span className="text-white font-bold">Share your link</span> with friends, family, or on social media.</p>
                      </div>
                      <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-black text-xs shrink-0">2</div>
                        <p className="text-sm text-zinc-400">They <span className="text-white font-bold">sign up</span> using your unique referral link.</p>
                      </div>
                      <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-black text-xs shrink-0">3</div>
                        <p className="text-sm text-zinc-400">You instantly get <span className="text-emerald-400 font-bold">{config.referralCreditBonus} credits + {config.referralPepeBonus} Pepe</span> and they get <span className="text-emerald-400 font-bold">{config.signupReferralBonus} extra credits</span>.</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6 space-y-4">
                    <h4 className="font-black text-zinc-900 flex items-center gap-2">
                      <ShieldCheck size={18} className="text-emerald-600" />
                      Program Rules
                    </h4>
                    <ul className="space-y-3 text-xs text-zinc-500 font-medium">
                      <li className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
                        No self-referrals or multiple accounts.
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
                        Referrals must be new users to the platform.
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
                        Abuse of the system will result in account suspension.
                      </li>
                    </ul>
                  </Card>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'about' && (
            <motion.div key="about" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-4xl mx-auto py-12 px-6">
              <div className="text-center mb-16">
                <Badge variant="primary" className="mb-4">Our Story</Badge>
                <h2 className="text-4xl md:text-5xl font-black text-zinc-900 mb-6 tracking-tight">About AdSwaptop</h2>
                <p className="text-xl text-zinc-600 leading-relaxed">We're on a mission to democratize digital advertising through community-driven credit swapping.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20">
                <div className="space-y-6">
                  <h3 className="text-2xl font-black text-zinc-900">Our Vision</h3>
                  <p className="text-zinc-600 leading-relaxed">AdSwaptop was born from a simple idea: that every content creator and small business owner should have access to high-quality traffic without breaking the bank. By leveraging the power of community, we've created a platform where users can swap ad credits fairly and transparently.</p>
                </div>
                <div className="space-y-6">
                  <h3 className="text-2xl font-black text-zinc-900">Why Choose Us?</h3>
                  <div className="space-y-4">
                    {[
                      { icon: <Zap size={18} />, title: "Lightning Fast", desc: "Swap credits in seconds with our automated matching system." },
                      { icon: <ShieldCheck size={18} />, title: "Secure & Trusted", desc: "Every transaction is protected by our advanced fraud detection." },
                      { icon: <Users size={18} />, title: "Global Community", desc: "Connect with thousands of advertisers from around the world." }
                    ].map((item, i) => (
                      <div key={i} className="flex gap-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                          {item.icon}
                        </div>
                        <div>
                          <h4 className="font-bold text-zinc-900">{item.title}</h4>
                          <p className="text-sm text-zinc-500">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'contact' && (
            <motion.div key="contact" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-5xl mx-auto py-12 px-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                <div className="space-y-8">
                  <div>
                    <Badge variant="success" className="mb-4">Get in Touch</Badge>
                    <h2 className="text-4xl font-black text-zinc-900 mb-6 tracking-tight">How can we help?</h2>
                    <p className="text-lg text-zinc-600 leading-relaxed">Have questions about our platform or need technical support? Our team is here to help you 24/7.</p>
                  </div>
                  <div className="space-y-6">
                    <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-zinc-100 shadow-sm">
                      <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                        <Mail size={24} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Email Us</p>
                        <p className="font-bold text-zinc-900">support@adswaptop.com</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-zinc-100 shadow-sm">
                      <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <HelpCircle size={24} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Help Center</p>
                        <p className="font-bold text-zinc-900">docs.adswaptop.com</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-xl shadow-zinc-200/50">
                  <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); setNotification({ message: "Message sent! We'll get back to you soon.", type: 'success' }); }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Full Name</label>
                        <input type="text" required className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm" placeholder="John Doe" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Email Address</label>
                        <input type="email" required className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm" placeholder="john@example.com" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Subject</label>
                      <input type="text" required className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm" placeholder="How can we help?" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Message</label>
                      <textarea required rows={4} className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm resize-none" placeholder="Tell us more about your inquiry..."></textarea>
                    </div>
                    <Button type="submit" className="w-full py-4 rounded-xl font-bold shadow-lg shadow-emerald-100">Send Message</Button>
                  </form>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'privacy' && (
            <motion.div key="privacy" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-4xl mx-auto py-12 px-6">
              <div className="bg-white p-8 md:p-12 rounded-3xl border border-zinc-100 shadow-sm">
                <h2 className="text-3xl font-black text-zinc-900 mb-8">Privacy Policy</h2>
                <div className="prose prose-zinc max-w-none space-y-6 text-zinc-600">
                  <p>Last updated: March 21, 2026</p>
                  <section className="space-y-4">
                    <h3 className="text-xl font-bold text-zinc-900">1. Information We Collect</h3>
                    <p>We collect information you provide directly to us, such as when you create an account, update your profile, or communicate with us. This may include your name, email address, and any other information you choose to provide.</p>
                  </section>
                  <section className="space-y-4">
                    <h3 className="text-xl font-bold text-zinc-900">2. How We Use Your Information</h3>
                    <p>We use the information we collect to provide, maintain, and improve our services, to communicate with you, and to protect AdSwaptop and our users.</p>
                  </section>
                  <section className="space-y-4">
                    <h3 className="text-xl font-bold text-zinc-900">3. Data Security</h3>
                    <p>We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction.</p>
                  </section>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'terms' && (
            <motion.div key="terms" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-4xl mx-auto py-12 px-6">
              <div className="bg-white p-8 md:p-12 rounded-3xl border border-zinc-100 shadow-sm">
                <h2 className="text-3xl font-black text-zinc-900 mb-8">Terms of Service</h2>
                <div className="prose prose-zinc max-w-none space-y-6 text-zinc-600">
                  <p>Last updated: March 21, 2026</p>
                  <section className="space-y-4">
                    <h3 className="text-xl font-bold text-zinc-900">1. Acceptance of Terms</h3>
                    <p>By accessing or using AdSwaptop, you agree to be bound by these Terms of Service and all applicable laws and regulations.</p>
                  </section>
                  <section className="space-y-4">
                    <h3 className="text-xl font-bold text-zinc-900">2. User Conduct</h3>
                    <p>You are responsible for your use of the services and for any content you provide. You agree not to engage in any activity that interferes with or disrupts the services.</p>
                  </section>
                  <section className="space-y-4">
                    <h3 className="text-xl font-bold text-zinc-900">3. Termination</h3>
                    <p>We reserve the right to terminate or suspend your access to the services at any time, without notice, for conduct that we believe violates these Terms or is harmful to other users of the services, us, or third parties, or for any other reason.</p>
                  </section>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer setView={setView} />
    </div>
  )}

  <Modal 
    isOpen={!!adminAction} 
        onClose={() => {
          setAdminAction(null);
          setAdminActionValue('');
          setAdminActionReason('');
        }} 
        title={
          adminAction?.type === 'add' ? 'Add Credits' :
          adminAction?.type === 'deduct' ? 'Deduct Credits' :
          adminAction?.type === 'password' ? 'Change Password' :
          adminAction?.type === 'role' ? 'Change Role' :
          'Delete User'
        }
      >
        <div className="space-y-6">
          {adminAction && (
            <div className="flex items-center gap-4 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
              <img src={adminAction.user.photoURL} alt="" className="w-12 h-12 rounded-xl object-cover shadow-sm" />
              <div>
                <p className="font-black text-zinc-900 leading-tight">{adminAction.user.displayName}</p>
                <p className="text-xs text-zinc-500 font-medium">{adminAction.user.email}</p>
                <div className="flex gap-2 mt-1">
                  <Badge variant="success" className="text-[8px] px-1.5">{adminAction.user.points} Bal</Badge>
                  <Badge variant="primary" className="text-[8px] px-1.5">{adminAction.user.earnedPoints} Earned</Badge>
                </div>
              </div>
            </div>
          )}

          {adminAction?.type === 'delete' ? (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
                <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={18} />
                <p className="text-sm text-red-800 font-medium leading-relaxed">
                  Are you sure you want to delete this user? This will permanently remove their account and all associated data. This action cannot be undone.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                  {adminAction?.type === 'password' ? 'New Password' : 
                   adminAction?.type === 'role' ? 'Select Role' : 
                   'Amount of Credits'}
                </label>
                <div className="relative">
                  {adminAction?.type !== 'password' && adminAction?.type !== 'role' && <Coins className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />}
                  {adminAction?.type === 'role' ? (
                    <select
                      value={adminActionValue}
                      onChange={(e) => setAdminActionValue(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-bold appearance-none bg-white"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                      <option value="advertiser">Advertiser</option>
                      <option value="publisher">Publisher</option>
                    </select>
                  ) : (
                    <input 
                      type={adminAction?.type === 'password' ? 'text' : 'number'}
                      value={adminActionValue}
                      onChange={(e) => setAdminActionValue(e.target.value)}
                      placeholder={adminAction?.type === 'password' ? 'Enter new password' : '0'}
                      className={cn(
                        "w-full py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-bold",
                        adminAction?.type === 'password' ? "px-4" : "pl-12 pr-4"
                      )}
                    />
                  )}
                </div>
              </div>
              {(adminAction?.type === 'add' || adminAction?.type === 'deduct') && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Reason for Adjustment</label>
                  <input 
                    type="text"
                    value={adminActionReason}
                    onChange={(e) => setAdminActionReason(e.target.value)}
                    placeholder="e.g., Bonus, Correction, Refund"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
                  />
                </div>
              )}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setAdminAction(null)} className="flex-1 py-3 rounded-xl font-bold">Cancel</Button>
            <Button 
              variant={adminAction?.type === 'delete' ? 'danger' : 'primary'}
              className="flex-1 py-3 rounded-xl font-bold shadow-lg shadow-emerald-100"
              onClick={() => {
                if (!adminAction) return;
                if (adminAction.type === 'add') {
                  if (isNaN(Number(adminActionValue)) || Number(adminActionValue) <= 0) {
                    notify('Please enter a valid positive number', 'error');
                    return;
                  }
                  handleAdminAddCredits(adminAction.user.uid, Number(adminActionValue), adminActionReason);
                } else if (adminAction.type === 'deduct') {
                  if (isNaN(Number(adminActionValue)) || Number(adminActionValue) <= 0) {
                    notify('Please enter a valid positive number', 'error');
                    return;
                  }
                  handleAdminDeductCredits(adminAction.user.uid, Number(adminActionValue), adminActionReason);
                } else if (adminAction.type === 'password') {
                  if (adminActionValue.length < 6) {
                    notify('Password must be at least 6 characters long', 'error');
                    return;
                  }
                  handleAdminChangePassword(adminAction.user.uid, adminActionValue);
                } else if (adminAction.type === 'role') {
                  handleAdminChangeRole(adminAction.user.uid, adminActionValue);
                } else if (adminAction.type === 'delete') {
                  handleAdminDeleteUser(adminAction.user.uid);
                }
                setAdminAction(null);
                setAdminActionValue('');
                setAdminActionReason('');
              }}
            >
              {adminAction?.type === 'delete' ? 'Delete Account' : 'Confirm Action'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={showForgotPasswordModal} 
        onClose={() => setShowForgotPasswordModal(false)} 
        title="পাসওয়ার্ড ভুলে গেছেন?"
      >
        <form onSubmit={(e) => {
          e.preventDefault();
          const email = (e.target as any).email.value;
          handleRequestPasswordReset(email);
        }} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">আপনার ইমেইল এড্রেস দিন</label>
            <input 
              name="email" 
              type="email" 
              required 
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" 
              placeholder="example@gmail.com"
            />
          </div>
          <p className="text-sm text-zinc-500 bg-zinc-50 p-4 rounded-xl border border-zinc-100 italic">
            পাসওয়ার্ড রিসেট করার জন্য আপনার ইমেইলে একটি লিঙ্ক পাঠানো হবে।
          </p>
          <Button type="submit" className="w-full py-4 font-bold rounded-xl shadow-lg shadow-emerald-100">
            রিসেট লিঙ্ক পাঠান
          </Button>
        </form>
      </Modal>

      <Modal 
        isOpen={!!confirmAction} 
        onClose={() => setConfirmAction(null)} 
        title={confirmAction?.title || 'Confirm'}
      >
        <div className="space-y-4">
          <p className="text-zinc-600">{confirmAction?.message}</p>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setConfirmAction(null)}>Cancel</Button>
            <Button onClick={() => {
              confirmAction?.onConfirm();
              setConfirmAction(null);
            }}>Confirm</Button>
          </div>
        </div>
      </Modal>

      <AnimatePresence>
        {notification && (
          <Notification 
            message={notification.message} 
            type={notification.type} 
            onClose={() => setNotification(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
