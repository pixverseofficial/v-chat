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
  Search, LogOut, MessageCircle, User, Settings, PlusCircle, UserPlus, Check, Send, Users, Paperclip, Mic, History, Sparkles
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

  // Listeners for Friends and Requests
  useEffect(() => {
    if (!user) return;
    const unsubReq = onSnapshot(query(collection(db, "friendRequests"), where("receiverId", "==", user.uid), where("status", "==", "pending")), (snap) => setPendingRequests(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    
    const q1 = query(collection(db, "friends"), where("user1", "==", user.uid));
    const q2 = query(collection(db, "friends"), where("user2", "==", user.uid));
    
    const unsub1 = onSnapshot(q1, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setFriends(prev => {
        const others = prev.filter(f => !list.find(l => l.id === f.id));
        return [...list, ...others];
      });
    });

    const unsub2 = onSnapshot(q2, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setFriends(prev => {
        const others = prev.filter(f => !list.find(l => l.id === f.id));
        return [...list, ...others];
      });
    });

    return () => { unsubReq(); unsub1(); unsub2(); };
  }, [user]);

  // Chat Listener
  useEffect(() => {
    if (!selectedChat || !user) return;
    const friendId = selectedChat.user1 === user.uid ? selectedChat.user2 : selectedChat.user1;
    const chatId = [user.uid, friendId].sort().join('_');
    const q = query(collection(db, "chats", chatId, "messages"), orderBy("timestamp", "asc"));
    return onSnapshot(q, (snap) => setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [selectedChat, user]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;
    const q = query(collection(db, "users"), where("username", "==", searchQuery));
    const snap = await getDocs(q);
    setSearchResults(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.id !== user.uid));
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
    } catch { toast.error("Error"); }
  };

  const acceptRequest = async (req) => {
    await updateDoc(doc(db, "friendRequests", req.id), { status: "accepted" });
    await addDoc(collection(db, "friends"), {
      user1: req.senderId, user2: req.receiverId,
      user1Name: req.senderName, user2Name: req.receiverName,
      timestamp: serverTimestamp()
    });
    toast.success("Friend added!");
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;
    const friendId = selectedChat.user1 === user.uid ? selectedChat.user2 : selectedChat.user1;
    const chatId = [user.uid, friendId].sort().join('_');
    const msg = newMessage; setNewMessage('');
    await addDoc(collection(db, "chats", chatId, "messages"), {
      text: msg, senderId: user.uid, timestamp: serverTimestamp(),
    });
  };

  const getFriendName = (f) => (f.user1 === user.uid ? f.user2Name : f.user1Name);

  if (!user) return null;

  return (
    <div className="h-screen w-full bg-[#E5E7EB] flex overflow-hidden font-sans text-gray-900 relative">
      <Head><title>V Chat</title></Head>
      <Toaster position="top-right" />

      {/* Animated Mesh Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-200 via-purple-100 to-teal-100 -z-10" />
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-300/20 blur-[120px] rounded-full -z-10" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-pink-200/20 blur-[120px] rounded-full -z-10" />

      {/* --- SIDEBAR LEFT --- */}
      <div className="w-20 md:w-72 bg-white/20 backdrop-blur-2xl border-r border-white/30 flex flex-col z-10">
        <div className="p-8 pb-4">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-xl">
              <span className="text-white font-bold italic text-xl">V</span>
            </div>
            <h1 className="text-xl font-black hidden md:block tracking-tighter">V CHAT</h1>
          </div>
          
          <div className="relative hidden md:block mb-8">
            <Search className="absolute left-3 top-3 text-gray-500 w-4 h-4" />
            <form onSubmit={handleSearch}>
              <input 
                type="text" placeholder="Explore users..." 
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/40 border border-white/50 py-2.5 pl-10 pr-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
              />
            </form>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-3">
          <button onClick={() => {setActiveTab('chats'); setSelectedChat(null);}} className={`w-full flex items-center p-4 rounded-2xl transition-all ${activeTab === 'chats' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20 font-bold' : 'text-gray-600 hover:bg-white/40'}`}>
            <MessageCircle className="w-6 h-6 md:mr-4 mx-auto md:mx-0" />
            <span className="hidden md:block">Explore</span>
          </button>
          <button onClick={() => setActiveTab('friends')} className={`w-full flex items-center p-4 rounded-2xl transition-all ${activeTab === 'friends' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20 font-bold' : 'text-gray-600 hover:bg-white/40'}`}>
            <Users className="w-6 h-6 md:mr-4 mx-a
