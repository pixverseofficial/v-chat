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
  Search, LogOut, MessageCircle, User, Settings, PlusCircle, UserPlus, Check, Send, Users, Paperclip, Mic, Sparkles, History
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

  useEffect(() => {
    if (!user) return;
    const unsubReq = onSnapshot(query(collection(db, "friendRequests"), where("receiverId", "==", user.uid), where("status", "==", "pending")), (snap) => setPendingRequests(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsub1 = onSnapshot(query(collection(db, "friends"), where("user1", "==", user.uid)), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setFriends(prev => [...list, ...prev.filter(p => !list.find(l => l.id === p.id))]);
    });
    const unsub2 = onSnapshot(query(collection(db, "friends"), where("user2", "==", user.uid)), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setFriends(prev => [...prev, ...list.filter(p => !prev.find(l => l.id === p.id))]);
    });
    return () => { unsubReq(); unsub1(); unsub2(); };
  }, [user]);

  useEffect(() => {
    if (!selectedChat || !user) return;
    const chatId = [user.uid, selectedChat.user1 === user.uid ? selectedChat.user2 : selectedChat.user1].sort().join('_');
    return onSnapshot(query(collection(db, "chats", chatId, "messages"), orderBy("timestamp", "asc")), (snap) => setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [selectedChat, user]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;
    const chatId = [user.uid, selectedChat.user1 === user.uid ? selectedChat.user2 : selectedChat.user1].sort().join('_');
    const msg = newMessage; setNewMessage('');
    await addDoc(collection(db, "chats", chatId, "messages"), { text: msg, senderId: user.uid, timestamp: serverTimestamp() });
  };

  const getFriendName = (f) => (f.user1 === user.uid ? f.user2Name : f.user1Name);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#DDE1F5] flex items-center justify-center p-4 md:p-8 font-sans overflow-hidden">
      <Head><title>V Chat | Experience</title></Head>
      <Toaster position="top-right" />

      {/* --- Main App Container --- */}
      <div className="w-full max-w-[1400px] h-[90vh] bg-white/40 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/40 flex overflow-hidden">
        
        {/* --- Sidebar Left --- */}
        <div className="w-20 md:w-64 bg-white/20 border-r border-white/30 flex flex-col items-center md:items-stretch p-6">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
              <span className="text-white font-bold italic">V</span>
            </div>
            <h1 className="text-xl font-bold hidden md:block">VChat</h1>
          </div>

          <nav className="flex-1 space-y-6">
            <button onClick={() => setActiveTab('chats')} className={`flex items-center gap-4 w-full p-2 rounded-xl transition-all ${activeTab === 'chats' ? 'text-blue-600 font-bold' : 'text-gray-500 hover:text-black'}`}>
              <MessageCircle className="w-6 h-6" /> <span className="hidden md:block">Explore</span>
            </button>
            <button onClick={() => setActiveTab('friends')} className={`flex items-center gap-4 w-full p-2 rounded-xl transition-all ${activeTab === 'friends' ? 'text-blue-600 font-bold' : 'text-gray-500 hover:text-black'}`}>
              <Users className="w-6 h-6" /> <span className="hidden md:block">Friends</span>
            </button>
            <button className="flex items-center gap-4 w-full p-2 text-gray-500 hover:text-black transition-all">
              <Settings className="w-6 h-6" /> <span className="hidden md:block">Settings</span>
            </button>
          </nav>

          <div className="bg-blue-500/90 p-4 rounded-3xl text-white hidden md:block shadow-lg shadow-blue-400/30">
            <h4 className="font-bold text-sm">Premium Plan</h4>
            <p className="text-[10px] mt-1 opacity-80">Unlock all premium features</p>
            <button className="mt-4 bg-white/20 w-full py-2 rounded-xl text-xs font-bold hover:bg-white/30 transition-all border border-white/30">Upgrade now ↗</button>
          </div>

          <button onClick={() => signOut(auth)} className="mt-8 flex items-center gap-4 p-2 text-gray-500 hover:text-red-500 transition-all">
            <LogOut className="w-6 h-6" /> <span className="hidden md:block">Log out</span>
          </button>
        </div>

        {/* --- Chat Content (Middle) --- */}
        <div className="flex-1 flex flex-col bg-gradient-to-br from-white/10 to-purple-100/30">
          {selectedChat ? (
            <>
              {/* Header */}
              <div className="p-8 flex justify-between items-center">
                <div className="bg-white/60 backdrop-blur-md px-6 py-3 rounded-2xl shadow-sm border border-white/50 flex items-center gap-4">
                  <h2 className="font-bold text-gray-800">{getFriendName(selectedChat)}</h2>
                  <div className="flex gap-2">
                    <button className="p-2 hover:bg-gray-200/50 rounded-lg"><Sparkles className="w-4 h-4 text-blue-500"/></button>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button className="bg-white/60 p-3 rounded-xl border border-white/50 shadow-sm"><Settings className="w-5 h-5"/></button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto px-10 space-y-6">
                {messages.map((msg, i) => {
                  const isMe = msg.senderId === user.uid;
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                        isMe ? 'bg-white/80 border border-white/50 text-black rounded-tr-none' : 'bg-white text-black border border-gray-100 rounded-tl-none'
                      }`}>
                        {msg.text}
                      </div>
                      {/* Optional: Add avatars like the image */}
                      <span className="text-[10px] mt-1 text-gray-400">{isMe ? 'You' : getFriendName(selectedChat)}</span>
                    </div>
                  );
                })}
                <div ref={scrollRef} />
              </div>

              {/* Advanced Input Bar */}
              <div className="p-8">
                <div className="bg-white/70 backdrop-blur-md p-2 rounded-3xl shadow-xl border border-white/50 flex items-center">
                  <div className="flex px-4 gap-4">
                    <Paperclip className="w-5 h-5 text-gray-400 cursor-pointer" />
                    <Mic className="w-5 h-5 text-gray-400 cursor-pointer" />
                  </div>
                  <form onSubmit={sendMessage} className="flex-1 flex items-center">
                    <input 
                      type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Ask me something....." 
                      className="w-full bg-transparent border-none py-3 outline-none text-sm font-medium"
                    />
                    <button type="submit" className="bg-blue-500 p-3 rounded-2xl text-white shadow-lg shadow-blue-400/40 hover:scale-105 transition-all">
                      <Send className="w-5 h-5" />
                    </button>
                  </form>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-gray-400 font-medium italic">Select a conversation or find friends to start chatting</p>
            </div>
          )}
        </div>

        {/* --- History / Friends List (Right Sidebar) --- */}
        <div className="w-72 bg-white/10 backdrop-blur-sm border-l border-white/30 hidden lg:flex flex-col p-6">
          <h3 className="text-gray-500 font-bold text-xs uppercase tracking-widest mb-6">History</h3>
          <div className="flex-1 space-y-4 overflow-y-auto">
             {friends.map(f => (
               <div 
                 key={f.id} 
                 onClick={() => { setSelectedChat(f); setActiveTab('chats'); }}
                 className="flex items-center gap-3 p-3 hover:bg-white/40 rounded-xl cursor-pointer transition-all border border-transparent hover:border-white/50"
               >
                 <History className="w-4 h-4 text-gray-400" />
                 <p className="text-sm font-medium truncate">{getFriendName(f)}</p>
               </div>
             ))}
          </div>
          <button className="mt-4 flex items-center justify-center gap-2 bg-white/40 border border-white/50 py-3 rounded-2xl text-red-500 font-bold text-xs hover:bg-white/60 transition-all">
            <LogOut className="w-4 h-4" /> Delete history
          </button>
        </div>
      </div>

      {/* --- Animated Background Mesh --- */}
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-200/40 rounded-full blur-[150px] -z-10 animate-pulse" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-100/40 rounded-full blur-[150px] -z-10 animate-pulse" />
    </div>
  );
}
