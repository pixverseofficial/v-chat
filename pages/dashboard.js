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
  Search, LogOut, MessageSquare, Users, Settings, PlusCircle, UserPlus, Check, Send, MoreVertical, Phone, Video, Info, LayoutDashboard
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('chats'); // chats, friends, explore
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

  // Firebase Listeners
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

  // Messages Listener
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
    <div className="h-screen w-full bg-[#f4f7fb] flex overflow-hidden font-sans text-slate-700">
      <Head><title>V Chat | Dashboard</title></Head>
      <Toaster position="top-right" />

      {/* --- COLUMN 1: SLIM NAVBAR (Left) --- */}
      <div className="w-20 bg-white border-r border-slate-200 flex flex-col items-center py-8 gap-10">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
          <span className="text-white font-bold text-xl italic">V</span>
        </div>
        
        <div className="flex flex-col gap-6 flex-1">
          <button onClick={() => setActiveTab('chats')} className={`p-3 rounded-xl transition-all ${activeTab === 'chats' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-blue-600'}`}>
            <MessageSquare className="w-6 h-6" />
          </button>
          <button onClick={() => setActiveTab('friends')} className={`p-3 rounded-xl transition-all ${activeTab === 'friends' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-blue-600'}`}>
            <Users className="w-6 h-6" />
          </button>
          <button className="p-3 rounded-xl text-slate-400 hover:text-blue-600">
            <LayoutDashboard className="w-6 h-6" />
          </button>
          <button className="p-3 rounded-xl text-slate-400 hover:text-blue-600">
            <Settings className="w-6 h-6" />
          </button>
        </div>

        <button onClick={() => signOut(auth)} className="p-3 text-slate-400 hover:text-red-500 transition-all">
          <LogOut className="w-6 h-6" />
        </button>
      </div>

      {/* --- COLUMN 2: LIST AREA (Middle) --- */}
      <div className="w-full md:w-96 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-6">
            {activeTab === 'chats' ? 'Recent Chats' : activeTab === 'friends' ? 'Friends' : 'Search'}
          </h2>
          
          <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
            <form onSubmit={handleSearch}>
              <input 
                type="text" placeholder="Search people..." 
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-100 border-none py-2.5 pl-10 pr-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </form>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 space-y-2">
          {/* SEARCH RESULTS */}
          {searchResults.length > 0 && (
            <div className="mb-6">
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2 mb-2">Search Results</p>
               {searchResults.map(res => (
                 <div key={res.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-all cursor-pointer border border-transparent hover:border-slate-100">
                    <span className="font-semibold text-sm">{res.username}</span>
                    <button onClick={() => {
                        addDoc(collection(db, "friendRequests"), {
                          senderId: user.uid, senderName: user.displayName,
                          receiverId: res.id, receiverName: res.username,
                          status: "pending", timestamp: serverTimestamp()
                        });
                        toast.success("Request sent!");
                        setSearchResults([]);
                    }} className="text-blue-600 p-2 hover:bg-blue-100 rounded-lg"><UserPlus className="w-4 h-4"/></button>
                 </div>
               ))}
            </div>
          )}

          {/* CHAT/FRIENDS LIST */}
          {activeTab === 'chats' || activeTab === 'friends' ? (
            friends.map(f => (
              <div 
                key={f.id} 
                onClick={() => { setSelectedChat(f); setActiveTab('chats'); }}
                className={`flex items-center p-3 rounded-2xl cursor-pointer transition-all ${selectedChat?.id === f.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'hover:bg-slate-50'}`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-sm ${selectedChat?.id === f.id ? 'bg-white/20' : 'bg-blue-100 text-blue-600'}`}>
                  {getFriendName(f).charAt(0)}
                </div>
                <div className="ml-4 flex-1">
                  <p className="font-bold text-sm">{getFriendName(f)}</p>
                  <p className={`text-xs ${selectedChat?.id === f.id ? 'text-blue-100' : 'text-slate-400'}`}>Online</p>
                </div>
              </div>
            ))
          ) : null}

          {/* PENDING REQUESTS IN FRIENDS TAB */}
          {activeTab === 'friends' && pendingRequests.length > 0 && (
             <div className="mt-8">
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2 mb-2">Friend Requests</p>
               {pendingRequests.map(r => (
                 <div key={r.id} className="bg-slate-50 p-3 rounded-xl flex items-center justify-between mb-2">
                    <span className="font-bold text-xs">{r.senderName}</span>
                    <button onClick={() => {
                        updateDoc(doc(db, "friendRequests", r.id), { status: "accepted" });
                        addDoc(collection(db, "friends"), {
                          user1: r.senderId, user2: r.receiverId,
                          user1Name: r.senderName, user2Name: r.receiverName,
                          timestamp: serverTimestamp()
                        });
                        toast.success("Accepted!");
                    }} className="bg-blue-600 text-white px-3 py-1 rounded-lg text-[10px] font-bold">Accept</button>
                 </div>
               ))}
             </div>
          )}
        </div>
      </div>

      {/* --- COLUMN 3: CHAT AREA (Main) --- */}
      <div className="flex-1 bg-white flex flex-col relative">
        {selectedChat ? (
          <>
            {/* Header */}
            <div className="h-20 border-b border-slate-100 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                  {getFriendName(selectedChat).charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{getFriendName(selectedChat)}</h3>
                  <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Active Now</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-slate-400">
                <button className="p-2 hover:bg-slate-100 rounded-full transition-all"><Phone className="w-5 h-5" /></button>
                <button className="p-2 hover:bg-slate-100 rounded-full transition-all"><Video className="w-5 h-5" /></button>
                <button className="p-2 hover:bg-slate-100 rounded-full transition-all"><Info className="w-5 h-5" /></button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-10 space-y-6 bg-[#fcfdfe]">
              {messages.map((msg) => {
                const isMe = msg.senderId === user.uid;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[65%] px-5 py-3 rounded-2xl shadow-sm text-sm font-medium leading-relaxed ${
                      isMe 
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                );
              })}
              <div ref={scrollRef} />
            </div>

            {/* Input Bar */}
            <div className="p-6 bg-white border-t border-slate-100">
              <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                <button className="p-2 text-slate-400 hover:text-blue-600"><PlusCircle className="w-6 h-6" /></button>
                <form onSubmit={sendMessage} className="flex-1 flex items-center gap-4">
                  <input 
                    type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message here..." 
                    className="flex-1 bg-transparent border-none py-2 text-sm outline-none"
                  />
                  <button type="submit" className="bg-blue-600 p-3 rounded-xl text-white shadow-lg shadow-blue-200 hover:scale-105 transition-all">
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-50">
             <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-xl mb-6">
               <MessageSquare className="w-10 h-10 text-blue-600" />
             </div>
             <h2 className="text-xl font-bold text-slate-800">Select a Conversation</h2>
             <p className="text-slate-400 text-sm mt-2">Pick a chat from the left side to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}
