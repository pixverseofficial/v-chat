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
  Search, LogOut, MessageCircle, User, Settings, PlusCircle, UserPlus, Check, Send, Users, Paperclip, Mic, MoreVertical, History
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

  // Logic for Friends and Requests
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

  // Chat Listener
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
    toast.success("New friend added!");
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
    <div className="h-screen w-full bg-gradient-to-br from-[#ECE9E6] to-[#FFFFFF] flex overflow-hidden font-sans text-gray-800">
      <Head><title>V Chat</title></Head>
      <Toaster position="top-center" />

      {/* --- SIDEBAR LEFT --- */}
      <div className="w-20 md:w-80 bg-white/40 backdrop-blur-xl border-r border-gray-200 flex flex-col">
        <div className="p-8 pb-4 text-left">
          <h1 className="text-2xl font-black tracking-tight text-black mb-8 hidden md:block italic">V CHAT</h1>
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
            <form onSubmit={handleSearch}>
              <input 
                type="text" placeholder="Explore users..." 
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/60 border border-gray-200 py-2.5 pl-10 pr-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-400"
              />
            </form>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button onClick={() => setActiveTab('chats')} className={`w-full flex items-center p-4 rounded-2xl transition-all ${activeTab === 'chats' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'hover:bg-white/60 text-gray-500 font-semibold'}`}>
            <MessageCircle className="w-6 h-6 md:mr-4 mx-auto md:mx-0" />
            <span className="hidden md:block">Explore</span>
          </button>
          <button onClick={() => setActiveTab('friends')} className={`w-full flex items-center p-4 rounded-2xl transition-all ${activeTab === 'friends' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'hover:bg-white/60 text-gray-500 font-semibold'}`}>
            <Users className="w-6 h-6 md:mr-4 mx-auto md:mx-0" />
            <span className="hidden md:block">Friends</span>
            {pendingRequests.length > 0 && <span className="ml-auto bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full hidden md:block font-bold">{pendingRequests.length}</span>}
          </button>
        </nav>

        <div className="p-6">
          <div className="bg-white/60 backdrop-blur-md p-4 rounded-3xl border border-gray-100 flex items-center gap-3">
             <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white font-bold">{user.displayName?.charAt(0)}</div>
             <div className="flex-1 hidden md:block text-left">
                <p className="text-xs font-bold truncate">{user.displayName}</p>
                <p className="text-[10px] text-green-500 font-black">ONLINE</p>
             </div>
             <button onClick={() => signOut(auth)} className="text-gray-400 hover:text-red-500 transition-all hidden md:block">
               <LogOut className="w-5 h-5" />
             </button>
          </div>
        </div>
      </div>

      {/* --- MAIN CHAT AREA --- */}
      <div className="flex-1 flex flex-col bg-white relative">
        <div className="h-24 px-10 flex items-center justify-between border-b border-gray-100">
          <h2 className="text-2xl font-bold">
            {selectedChat && activeTab === 'chats' ? getFriendName(selectedChat) : activeTab.toUpperCase()}
          </h2>
          <button className="p-3 bg-gray-50 rounded-2xl"><Settings className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-10">
          {activeTab === 'chats' && selectedChat ? (
            <div className="space-y-6">
              {messages.map((msg) => {
                const isMe = msg.senderId === user.uid;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[70%] p-4 rounded-3xl shadow-sm text-sm border font-medium ${
                      isMe ? 'bg-white border-gray-100 text-black rounded-tr-none' : 'bg-gray-50 border-gray-50 text-black rounded-tl-none'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                );
              })}
              <div ref={scrollRef} />
            </div>
          ) : activeTab === 'friends' ? (
            <div className="max-w-4xl space-y-8">
              <section>
                <h3 className="text-gray-400 text-xs font-bold uppercase mb-4 tracking-widest">Pending Requests</h3>
                {pendingRequests.map(r => (
                   <div key={r.id} className="bg-gray-50 p-5 rounded-3xl flex items-center justify-between mb-3">
                     <span className="font-bold">{r.senderName}</span>
                     <button onClick={() => acceptRequest(r)} className="px-6 py-2 bg-blue-600 text-white rounded-full text-xs font-bold">ACCEPT</button>
                   </div>
                ))}
                {pendingRequests.length === 0 && <p className="text-gray-400 text-sm italic">No new requests</p>}
              </section>

              <section>
                <h3 className="text-gray-400 text-xs font-bold uppercase mb-4 tracking-widest">Active Friends</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {friends.map(f => (
                    <div key={f.id} className="bg-white border border-gray-100 p-5 rounded-3xl flex items-center justify-between shadow-sm">
                      <span className="font-bold">{getFriendName(f)}</span>
                      <button onClick={() => { setSelectedChat(f); setActiveTab('chats'); }} className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl"><MessageCircle className="w-5 h-5"/></button>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {searchResults.map(res => (
                    <div key={res.id} className="bg-gray-50 p-5 rounded-3xl flex items-center justify-between">
                        <span className="font-bold">{res.username}</span>
                        <button onClick={() => sendRequest(res)} className="p-2.5 bg-blue-600 text-white rounded-2xl"><UserPlus className="w-5 h-5"/></button>
                    </div>
                ))}
                {searchResults.length === 0 && (
                    <div className="col-span-2 flex flex-col items-center justify-center opacity-20 mt-20">
                        <MessageCircle className="w-20 h-20 mb-4" />
                        <p className="text-xl font-bold">START A CONVERSATION</p>
                    </div>
                )}
            </div>
          )}
        </div>

        {selectedChat && activeTab === 'chats' && (
          <div className="p-10 pt-0">
            <div className="bg-gray-50 p-2 rounded-full border border-gray-100 flex items-center shadow-lg">
               <div className="flex px-4 gap-4">
                 <Paperclip className="w-5 h-5 text-gray-400" />
                 <Mic className="w-5 h-5 text-gray-400" />
               </div>
               <form onSubmit={sendMessage} className="flex-1 flex items-center">
                  <input 
                    type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Ask me something..." 
                    className="flex-1 bg-transparent border-none py-3 outline-none text-sm font-medium"
                  />
                  <button type="submit" className="bg-blue-600 p-3 rounded-full text-white shadow-lg shadow-blue-600/30">
                    <Send className="w-5 h-5" />
                  </button>
               </form>
            </div>
          </div>
        )}
      </div>

      {/* --- RIGHT SIDEBAR (HISTORY) --- */}
      <div className="w-80 bg-gray-50 border-l border-gray-100 hidden lg:flex flex-col p-8">
        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-8 text-left">History</h3>
        <div className="flex-1 space-y-3 overflow-y-auto">
          {friends.map(f => (
            <div 
              key={f.id} 
              onClick={() => { setSelectedChat(f); setActiveTab('chats'); }}
              className={`flex items-center gap-3 p-3 rounded-2xl
