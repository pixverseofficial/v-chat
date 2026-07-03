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
  Search, LogOut, MessageCircle, User, Settings, PlusCircle, UserPlus, Check, Send, Users, Paperclip, Mic, History, Sparkles, LayoutGrid, Compass
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

  // Logic: Friends and Requests
  useEffect(() => {
    if (!user) return;
    const unsubReq = onSnapshot(query(collection(db, "friendRequests"), where("receiverId", "==", user.uid), where("status", "==", "pending")), (snap) => setPendingRequests(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const q1 = query(collection(db, "friends"), where("user1", "==", user.uid));
    const q2 = query(collection(db, "friends"), where("user2", "==", user.uid));
    const unsub1 = onSnapshot(q1, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setFriends(prev => [...list, ...prev.filter(p => !list.find(l => l.id === p.id))]);
    });
    const unsub2 = onSnapshot(q2, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setFriends(prev => [...prev, ...list.filter(p => !prev.find(l => l.id === p.id))]);
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

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;
    const friendId = selectedChat.user1 === user.uid ? selectedChat.user2 : selectedChat.user1;
    const chatId = [user.uid, friendId].sort().join('_');
    const msg = newMessage; setNewMessage('');
    await addDoc(collection(db, "chats", chatId, "messages"), { text: msg, senderId: user.uid, timestamp: serverTimestamp() });
  };

  const getFriendName = (f) => (f.user1 === user.uid ? f.user2Name : f.user1Name);

  if (!user) return null;

  return (
    <div className="h-screen w-screen flex bg-gradient-to-br from-[#f8f9ff] via-[#fdf2f8] to-[#f0fdfa] overflow-hidden font-sans relative">
      <Head><title>V Chat | Experience</title></Head>
      <Toaster position="top-right" />

      {/* Background Animated Blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-purple-200/40 rounded-full blur-[120px] -z-10 animate-pulse" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-200/40 rounded-full blur-[120px] -z-10 animate-pulse" />

      {/* --- SIDEBAR LEFT --- */}
      <div className="w-20 md:w-64 bg-white/10 backdrop-blur-3xl border-r border-white/20 flex flex-col p-6 z-20">
        <div className="flex items-center gap-3 mb-12 ml-2">
          <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center shadow-lg shadow-black/20">
            <span className="text-white font-bold italic">V</span>
          </div>
          <h1 className="text-xl font-bold hidden md:block tracking-tight text-gray-800">VChat</h1>
        </div>

        <nav className="flex-1 space-y-4">
          <button onClick={() => {setActiveTab('chats'); setSelectedChat(null);}} className={`flex items-center gap-4 w-full p-3 rounded-2xl transition-all ${activeTab === 'chats' ? 'text-blue-600 font-bold bg-white/40 shadow-sm' : 'text-gray-500 hover:bg-white/20'}`}>
            <Compass className="w-6 h-6" /> <span className="hidden md:block">Explore</span>
          </button>
          <button onClick={() => setActiveTab('friends')} className={`flex items-center gap-4 w-full p-3 rounded-2xl transition-all ${activeTab === 'friends' ? 'text-blue-600 font-bold bg-white/40 shadow-sm' : 'text-gray-500 hover:bg-white/20'}`}>
            <Users className="w-6 h-6" /> <span className="hidden md:block">Friends</span>
            {pendingRequests.length > 0 && <span className="ml-auto w-2 h-2 bg-red-500 rounded-full animate-ping"></span>}
          </button>
          <button className="flex items-center gap-4 w-full p-3 text-gray-500 hover:bg-white/20 rounded-2xl transition-all">
            <Settings className="w-6 h-6" /> <span className="hidden md:block">Settings</span>
          </button>
        </nav>

        {/* Sidebar Card */}
        <div className="mt-auto bg-blue-500 p-5 rounded-3xl text-white hidden md:block shadow-2xl shadow-blue-500/20 mb-8">
            <h4 className="font-bold text-sm">Premium Plan</h4>
            <p className="text-[10px] mt-1 opacity-80">Pick the plan and unlock all features</p>
            <button className="mt-4 bg-white/20 w-full py-2.5 rounded-xl text-xs font-bold hover:bg-white/30 border border-white/20">Upgrade now ↗</button>
        </div>

        <button onClick={() => signOut(auth)} className="flex items-center gap-4 p-3 text-gray-500 hover:text-red-500 transition-all ml-2">
          <LogOut className="w-6 h-6" /> <span className="hidden md:block font-bold text-sm">Log out</span>
        </button>
      </div>

      {/* --- MIDDLE CONTENT AREA --- */}
      <div className="flex-1 flex flex-col bg-white/5 backdrop-blur-md relative overflow-hidden">
        
        {/* Top Header */}
        <div className="h-24 px-10 flex items-center justify-between border-b border-white/20 bg-white/10 backdrop-blur-sm">
            <div className="bg-white/40 backdrop-blur-xl px-6 py-3 rounded-2xl border border-white/40 shadow-sm">
              <h2 className="font-bold text-gray-800 tracking-tight">
                {selectedChat ? getFriendName(selectedChat) : activeTab.toUpperCase()}
              </h2>
            </div>
            <div className="flex gap-4">
               <button className="p-3 bg-white/40 rounded-2xl border border-white/40 hover:bg-white/60 transition-all shadow-sm"><Settings className="w-5 h-5 text-gray-600" /></button>
            </div>
        </div>

        {/* Content View */}
        <div className="flex-1 overflow-y-auto p-10">
          
          {/* Explore / Search View */}
          {activeTab === 'chats' && !selectedChat && (
            <div className="max-w-4xl mx-auto">
               <div className="relative mb-12">
                  <Search className="absolute left-4 top-4 text-gray-400 w-5 h-5" />
                  <form onSubmit={handleSearch}>
                    <input 
                      type="text" placeholder="Explore people to chat with..." 
                      value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white/40 border border-white/60 py-4 pl-12 pr-6 rounded-3xl outline-none focus:ring-4 focus:ring-blue-500/10 text-lg transition-all"
                    />
                  </form>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {searchResults.map(res => (
                    <div key={res.id} className="bg-white/60 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/60 flex items-center justify-between shadow-sm hover:scale-[1.02] transition-all">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-gray-200 rounded-2xl flex items-center justify-center font-bold">{res.username.charAt(0)}</div>
                         <span className="font-bold text-lg">{res.username}</span>
                      </div>
                      <button onClick={() => {
                        addDoc(collection(db, "friendRequests"), {
                          senderId: user.uid, senderName: user.displayName,
                          receiverId: res.id, receiverName: res.username,
                          status: "pending", timestamp: serverTimestamp()
                        });
                        toast.success("Request sent!");
                        setSearchResults([]);
                      }} className="p-3 bg-blue-500 text-white rounded-2xl shadow-xl shadow-blue-500/30"><UserPlus className="w-5 h-5"/></button>
                    </div>
                  ))}
               </div>
               {searchResults.length === 0 && <p className="text-center text-gray-400 mt-20 italic">Use the search bar above to find friends</p>}
            </div>
          )}

          {/* Chat Interface */}
          {activeTab === 'chats' && selectedChat && (
            <div className="flex flex-col h-full max-w-5xl mx-auto">
                <div className="flex-1 space-y-6">
                  {messages.map((msg) => {
                    const isMe = msg.senderId === user.uid;
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] p-4 rounded-[1.8rem] shadow-sm text-sm font-medium leading-relaxed border ${
                          isMe ? 'bg-white/80 border-white/60 text-gray-800 rounded-tr-none' : 'bg-white border-white/20 text-gray-600 rounded-tl-none'
                        }`}>
                          {msg.text}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={scrollRef} />
                </div>
            </div>
          )}

          {/* Friends View */}
          {activeTab === 'friends' && (
             <div className="max-w-4xl mx-auto space-y-12">
                <section>
                  <h3 className="text-gray-400 text-xs font-black uppercase tracking-widest mb-6">Pending Requests</h3>
                  {pendingRequests.map(r => (
                    <div key={r.id} className="bg-white/40 p-6 rounded-[2rem] border border-white/60 flex items-center justify-between shadow-sm">
                      <span className="font-bold text-lg">{r.senderName}</span>
                      <button onClick={() => {
                        updateDoc(doc(db, "friendRequests", r.id), { status: "accepted" });
                        addDoc(collection(db, "friends"), {
                          user1: r.senderId, user2: r.receiverId,
                          user1Name: r.senderName, user2Name: r.receiverName,
                          timestamp: serverTimestamp()
                        });
                        toast.success("Accepted!");
                      }} className="px-8 py-3 bg-blue-500 text-white rounded-full text-xs font-bold shadow-xl shadow-blue-500/30">ACCEPT</button>
                    </div>
                  ))}
                </section>
                <section>
                   <h3 className="text-gray-400 text-xs font-black uppercase tracking-widest mb-6">Contacts</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {friends.map(f => (
                        <div key={f.id} className="bg-white/40 p-6 rounded-[2.5rem] border border-white/60 flex items-center justify-between shadow-sm hover:bg-white/60 transition-all cursor-pointer">
                          <span className="font-bold text-lg">{getFriendName(f)}</span>
                          <button onClick={() => { setSelectedChat(f); setActiveTab('chats'); }} className="p-3 bg-white text-blue-500 rounded-2xl shadow-sm"><MessageCircle className="w-5 h-5"/></button>
                        </div>
                      ))}
                   </div>
                </section>
             </div>
          )}
        </div>

        {/* Message Input (Image Style) */}
        {selectedChat && activeTab === 'chats' && (
          <div className="p-10 pt-0 max-w-5xl mx-auto w-full">
            <div className="bg-white/60 backdrop-blur-2xl p-3 rounded-[2.5rem] shadow-[0_10px_40px_rgba(0,0,0,0.05)] border border-white/60 flex items-center gap-4">
              <div className="flex gap-4 ml-6 text-gray-400">
                <Paperclip className="w-5 h-5 cursor-pointer hover:text-blue-500" />
                <Mic className="w-5 h-5 cursor-pointer hover:text-blue-500" />
              </div>
              <form onSubmit={sendMessage} className="flex-1 flex items-center">
                <input 
                  type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Ask me something....." 
                  className="flex-1 bg-transparent border-none py-4 outline-none font-medium text-gray-800"
                />
                <button type="submit" className="bg-blue-500 p-4 rounded-[1.8rem] text-white shadow-xl shadow-blue-500/40 hover:scale-105 transition-all">
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* --- RIGHT SIDEBAR (History) --- */}
      <div className="w-80 bg-white/5 backdrop-blur-3xl border-l border-white/20 hidden lg:flex flex-col p-8 z-10">
        <h3 className="text-gray-400 text-xs font-black uppercase tracking-widest mb-10">History</h3>
        <div className="flex-1 space-y-4 overflow-y-auto pr-2">
          {friends.map(f => (
            <div 
              key={f.id} 
              onClick={() => { setSelectedChat(f); setActiveTab('chats'); }}
              className={`flex items-center gap-3 p-4 rounded-[1.8rem] cursor-pointer transition-all border ${selectedChat?.id === f.id ? 'bg-white/60 border-white/80 shadow-md' : 'border-transparent hover:bg-white/30'}`}
            >
              <History className="w-4 h-4 text-gray-400" />
              <p className="text-sm font-bold text-gray-700 truncate">{getFriendName(f)}</p>
            </div>
          ))}
        </div>
        <button className="mt-8 bg-white/20 border border-white/40 py-4 rounded-[1.8rem] text-red-500 font-bold text-xs uppercase tracking-widest shadow-sm hover:bg-red-50 transition-all flex items-center justify-center gap-2">
           <LogOut className="w-4 h-4" /> Delete history
        </button>
      </div>
    </div>
  );
}
