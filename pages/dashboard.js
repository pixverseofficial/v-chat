import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/router';
import { 
  Search, 
  LogOut, 
  MessageCircle, 
  User, 
  Settings, 
  MoreVertical,
  PlusCircle
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('chats');

  // ലോഗിൻ ചെയ്തിട്ടില്ലെങ്കിൽ തിരിച്ചയക്കുക
  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  if (!user) return <div className="h-screen w-screen bg-[#F5F5F7]" />;

  return (
    <div className="flex h-screen bg-[#F5F5F7] overflow-hidden text-black font-sans">
      <Head>
        <title>V Chat | Dashboard</title>
      </Head>

      {/* --- Sidebar (Apple Style) --- */}
      <div className="w-20 md:w-80 border-r border-gray-200 bg-white/60 backdrop-blur-xl flex flex-col">
        
        {/* Top Header */}
        <div className="p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold hidden md:block tracking-tight text-[#007AFF]">V Chat</h1>
            <div className="w-10 h-10 bg-[#007AFF]/10 rounded-full flex items-center justify-center md:hidden">
                <span className="text-[#007AFF] font-bold">V</span>
            </div>
            <button className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-500">
               <PlusCircle className="w-6 h-6" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="mt-6 relative hidden md:block">
            <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search chats" 
              className="w-full bg-gray-200/50 border-none py-2.5 pl-10 pr-4 rounded-xl focus:ring-2 focus:ring-[#007AFF] outline-none"
            />
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex-1 px-3 space-y-1">
          <button 
            onClick={() => setActiveTab('chats')}
            className={`w-full flex items-center p-3.5 rounded-2xl transition-all ${activeTab === 'chats' ? 'bg-[#007AFF] text-white shadow-lg shadow-blue-500/20' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <MessageCircle className="w-6 h-6 mx-auto md:mx-0 md:mr-3" />
            <span className="hidden md:block font-semibold">Messages</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('friends')}
            className={`w-full flex items-center p-3.5 rounded-2xl transition-all ${activeTab === 'friends' ? 'bg-[#007AFF] text-white shadow-lg shadow-blue-500/20' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <User className="w-6 h-6 mx-auto md:mx-0 md:mr-3" />
            <span className="hidden md:block font-semibold">Friends</span>
          </button>

          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center p-3.5 rounded-2xl transition-all ${activeTab === 'settings' ? 'bg-[#007AFF] text-white shadow-lg shadow-blue-500/20' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <Settings className="w-6 h-6 mx-auto md:mx-0 md:mr-3" />
            <span className="hidden md:block font-semibold">Settings</span>
          </button>
        </nav>

        {/* User Profile Card */}
        <div className="p-4 mb-2">
          <div className="flex items-center p-3 rounded-2xl bg-white/80 border border-white shadow-sm overflow-hidden">
            <div className="w-10 h-10 min-w-[40px] bg-gradient-to-tr from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-inner">
              {user?.displayName?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="ml-3 flex-1 overflow-hidden hidden md:block">
              <p className="text-sm font-bold truncate text-black">{user?.displayName || 'User'}</p>
              <p className="text-[10px] text-green-500 font-semibold uppercase tracking-wider">Online</p>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 hover:bg-red-50 text-red-500 rounded-xl transition-all hidden md:block"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* --- Main Content Area --- */}
      <div className="flex-1 flex flex-col bg-white/40">
        
        {/* Header of Content Area */}
        <div className="h-20 border-b border-gray-100 flex items-center justify-between px-8 bg-white/30 backdrop-blur-md">
            <h2 className="text-xl font-bold text-gray-800 uppercase tracking-wide">
                {activeTab}
            </h2>
            <button className="p-2 hover:bg-gray-100 rounded-full text-gray-400">
                <MoreVertical className="w-6 h-6" />
            </button>
        </div>

        {/* Empty State / Welcome Screen */}
        <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
          <div className="w-24 h-24 bg-gray-100/80 rounded-[30px] flex items-center justify-center mb-6 shadow-sm border border-white">
             <MessageCircle className="w-12 h-12 text-gray-300" />
          </div>
          <h2 className="text-2xl font-bold text-black tracking-tight">Select a Chat</h2>
          <p className="text-gray-500 mt-2 max-w-xs mx-auto leading-relaxed">
            Choose a friend from the left sidebar or search to start a new conversation.
          </p>
          <button className="mt-8 px-6 py-2.5 bg-white border border-gray-200 rounded-full text-sm font-semibold text-gray-600 shadow-sm hover:shadow-md transition-all">
            Find People
          </button>
        </div>
      </div>
    </div>
  );
}
