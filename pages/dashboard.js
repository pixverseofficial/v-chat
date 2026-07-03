import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/router';
import { 
  collection, query, where, getDocs, addDoc, doc, updateDoc, 
  serverTimestamp, onSnapshot, orderBy 
} from 'firebase/firestore';
import { 
  Search, LogOut, MessageCircle, User, Settings, PlusCircle, UserPlus, Check, Send, Users, Paperclip, Mic, MoreVertical
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('chats');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef();

  useEffect(() => { if (!user) router.push('/login'); }, [user, router]);
  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // --- All Logic (Search, Friends, Requests) Restored ---
  useEffect(() => {
    if (!user) return;
    const unsubReq = onSnapshot(query(collection(db, "friendRequests"), where("receiverId", "==", user.uid), where("status", "==", "pending")), (snap) => setPendingRequests(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    
    const q1 = query(collection(db, "friends"), where("user1", "==", user.uid));
    const q2 = query(collection(db, "friends"), where("user2", "==", user.uid));
    const unsub1 = onSnapshot(q1, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setFriends(prev => {
        const otherFriends = prev.filter(f => !list.find(l => l.id === f.id));
        return [...list, ...otherFriends];
      });
    });
    const unsub2 = onSnapshot(q2, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setFriends(prev => {
        const otherFriends = prev.filter(f => !list.find(l => l.id === f.id));
        return [...list, ...otherFriends];
      });
    });
    return () => { unsubReq(); unsub1(); unsub2(); };
  }, [user]);

  // Real-time Chat
  useEffect(() => {
    if (!selectedChat || !user) return;
    const chatId = [user.uid, selectedChat.user1 === user.uid ? selectedChat.user2 : selectedChat.user1].sort().join('_');
    const q = query(collection(db, "chats", chatId, "messages"), orderBy("timestamp", "asc"));
    return onSnapshot(q, (snap) => setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [selectedChat, user]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;
    const q = query(collection(db, "users"), where("username", "==", searchQuery));
    const snap = await getDocs(q);
    const results = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.id !== user.uid);
    setSearchResults(results);
  };

  const sendRequest = async (target) => {
    try {
      await addDoc(collection(db, "friendRequests"), {
        senderId: user.uid, senderName: user.displayName,
        receiverId: target.id, receiverName: target.username,
        status: "pending", timestamp: serverTimestamp()
      });
      toast.success("Request sent!");
      setSearchResults([]);
      setSearchQuery('');
    } catch { toast.error("Failed to send request"); }
  };

  const acceptRequest = async (req) => {
    try {
      await updateDoc(doc(db, "friendRequests", req.id), { status: "accepted" });
      await addDoc(collection(db, "friends"), {
        user1: req.senderId, user2: req.receiverId,
        user1Name: req.senderName, user2Name: req.receiverName,
        timestamp: serverTimestamp()
      });
      toast.success("You're now friends! 🤝");
    } catch { toast.error("Error accepting"); }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;
    const chatId = [user.uid, selectedChat.user1 === user.uid ? selectedChat.user2 : selectedChat.user1].sort().join('_');
    const msg = newMessage; setNewMessage('');
    await addDoc(collection(db, "chats", chatId, "messages"), {
      text: msg, senderId: user.uid, timestamp: serverTimestamp(),
    });
  };

  const getFriendName = (f) => (f.user1 === user.uid ? f.user2Name : f.user1Name);

  if (!user) return null;

  return (
    <div className="h-screen w-full bg-gradient-to-tr from-[#E0E7FF] via-[#F3E8FF] to-[#D1FAE5] flex overflow-hidden font-sans text-gray-800">
      <Head><title>V Chat | Premium Experience</title></Head>
      <Toaster position="top-center" />

      {/* --- SIDEBAR LEFT (Glass UI) --- */}
      <div className="w-20 md:w-80 bg-white/30 backdrop-blur-xl border-r border-white/40 flex flex-col">
        <div className="p-8 pb-4">
          <h1 className="text-2xl font-black tracking-tighter text-gray-900 mb-8 hidden md:block">VChat</h1>
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
            <form onSubmit={handleSearch}>
              <input 
                type="text" placeholder="Explore users..." 
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/40 border border-white/50 py-2.5 pl-10 pr-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-400 transition-all hidden md:block"
              />
            </form>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button onClick={() => setActiveTab('chats')} className={`w-full flex items-center p-4 rounded-2xl transition-all ${activeTab === 'chats' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'hover:bg-white/40 text-gray-600'}`}>
            <MessageCircle className="w-6 h-6 md:mr-4 mx-auto md:mx-0" />
            <span className="hidden md:block font-bold">Messages</span>
          </button>
          <button onClick={() => setActiveTab('friends')} className={`w-full flex items-center p-4 rounded-2xl transition-all ${activeTab === 'friends' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'hover:bg-white/40 text-gray-600'}`}>
            <Users className="w-6 h-6 md:mr-4 mx-auto md:mx-0" />
            <span className="hidden md:block font-bold">Friends</span>
            {pendingRequests.length > 0 && <span className="ml-auto bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full hidden md:block">{pendingRequests.length}</span>}
          </button>
        </nav>

        {/* User Info */}
        <div className="p-6">
          <div className="bg-white/40 backdrop-blur-md p-4 rounded-[2rem] border border-white/50 flex items-center gap-3">
             <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white font-bold">{user.displayName?.charAt(0)}</div>
             <div className="flex-1 hidden md:block">
                <p className="text-xs font-bold truncate">{user.displayName}</p>
                <p className="text-[10px] text-green-500 font-black">ONLINE</p>
             </div>
             <button onClick={() => signOut(auth)} className="text-gray-400 hover:text-red-500 transition-all hidden md:block">
               <LogOut className="w-5 h-5" />
             </button>
          </div>
        </div>
      </div>

      {/* --- MAIN AREA (The Chat Image Look) --- */}
      <div className="flex-1 flex flex-col bg-white/10 backdrop-blur-sm relative">
        
        {/* Header */}
        <div className="h-24 px-10 flex items-center justify-between border-b border-white/20">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {selectedChat && activeTab === 'chats' ? getFriendName(selectedChat) : activeTab.toUpperCase()}
            </h2>
            <p className="text-xs text-gray-500 font-medium tracking-wide">
              {selectedChat && activeTab === 'chats' ? 'Active conversation' : 'Select a person to start'}
            </p>
          </div>
          <div className="flex gap-4">
             <button className="p-3 bg-white/60 backdrop-blur-md rounded-2xl border border-white/50 shadow-sm"><Settings className="w-5 h-5 text-gray-600" /></button>
          </div>
        </div>
