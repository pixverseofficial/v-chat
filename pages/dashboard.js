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
  Search, LogOut, MessageCircle, User, Settings, PlusCircle, UserPlus, Check, Send, Users, ChevronLeft, MoreHorizontal
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
    const qReq = query(collection(db, "friendRequests"), where("receiverId", "==", user.uid), where("status", "==", "pending"));
    const unsubReq = onSnapshot(qReq, (snap) => setPendingRequests(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    
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
    <div className="flex h-screen bg-[#F2F2F7] text-black font-sans overflow-hidden">
      <Head><title>V Chat</title></Head>
      <Toaster position="top-center" />

      {/* --- Sidebar --- */}
      <div className="w-20 md:w-80 border-r border-gray-200 bg-white/80 backdrop-blur-xl flex flex-col z-10">
        <div className="p-6 pb-2">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-black">Messages</h1>
            <button className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-all">
                <PlusCircle className="w-5 h-5 text-blue-600" />
            </button>
          </div>
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
            <form onSubmit={handleSearch}>
                <input 
                type="text" placeholder="Search" 
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#E3E3E8] border-none py-2 pl-9 pr-4 rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-400"
                />
            </form>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 mt-4 space-y-1">
          {friends.map(f => (
            <button 
              key={f.id}
              onClick={() => { setSelectedChat(f); setActiveTab('chats'); }}
              className={`w-full flex items-center p-3 rounded-xl transition-all ${selectedChat?.id === f.id ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-sm ${selectedChat?.id === f.id ? 'bg-white/20' : 'bg-gradient-to-br from-gray-200 to-gray-300'}`}>
                {getFriendName(f).charAt(0)}
              </div>
              <div className="ml-3 hidden md:block text-left flex-1">
                <p className="font-semibold text-sm">{getFriendName(f)}</p>
                <p className={`text-xs truncate ${selectedChat?.id === f.id ? 'text-blue-100' : 'text-gray-500'}`}>Click to chat</p>
              </div>
            </button>
          ))}
          {friends.length === 0 && <p className="text-center text-xs text-gray-400 mt-10">No chats yet</p>}
        </div>

        {/* Bottom Profile */}
        <div className="p-4 border-t border-gray-100 bg-white/50 flex items-center justify-between">
           <button onClick={() => setActiveTab('friends')} className="p-2 hover:bg-gray-200 rounded-lg relative">
             <Users className="w-6 h-6 text-gray-600" />
             {pendingRequests.length > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>}
           </button>
           <button onClick={() => signOut(auth)} className="p-2 hover:bg-red-50 text-red-500 rounded-lg">
             <LogOut className="w-6 h-6" />
           </button>
        </div>
      </div>

      {/* --- Main Chat Area --- */}
      <div className="flex-1 flex flex-col bg-white relative">
        {selectedChat && activeTab === 'chats' ? (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b border-gray-200 flex items-center px-6 bg-white/80 backdrop-blur-md sticky top-0 z-10 justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                    {getFriendName(selectedChat).charAt(0)}
                </div>
                <div className="ml-3">
                    <h2 className="font-bold text-sm leading-none">{getFriendName(selectedChat)}</h2>
                    <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Online</span>
                </div>
              </div>
              <MoreHorizontal className="text-gray-400 cursor-pointer" />
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-3 bg-[#FFFFFF]">
              {messages.map((msg, idx) => {
                const isMe = msg.senderId === user.uid;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`px-4 py-2 rounded-2xl max-w-[75%] text-sm shadow-sm transition-all ${
                      isMe ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-[#E9E9EB] text-black rounded-bl-sm'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                );
              })}
              <div ref={scrollRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-100">
                <form onSubmit={sendMessage} className="flex items-center bg-[#F2F2F7] rounded-full px-4 py-1.5 focus-within:ring-1 focus:ring-blue-400">
                    <input 
                        type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="iMessage" 
                        className="flex-1 bg-transparent border-none py-2 text-sm outline-none"
                    />
                    <button type="submit" className={`p-1.5 rounded-full transition-all ${newMessage.trim() ? 'bg-blue-600 text-white' : 'text-gray-300'}`}>
                        <Send className="w-4 h-4" />
                    </button>
                </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#F2F2F7]">
             {activeTab === 'friends' ? (
                <div className="w-full max-w-2xl p-6 overflow-y-auto">
                    <h2 className="text-2xl font-bold mb-6">Friend Requests</h2>
                    {pendingRequests.map(r => (
                        <div key={r.id} className="bg-white p-4 rounded-2xl shadow-sm flex items-center justify-between mb-3 border border-gray-100">
                            <span className="font-bold">{r.senderName}</span>
                            <button onClick={() => acceptRequest(r)} className="px-4 py-1.5 bg-blue-600 text-white rounded-full text-xs font-bold">Accept</button>
                        </div>
                    ))}
                    {pendingRequests.length === 0 && <p className="text-gray-400 text-sm">No new requests</p>}
                    
                    <h2 className="text-2xl font-bold mt-10 mb-6">Search People</h2>
                    {searchResults.map(s => (
                        <div key={s.id} className="bg-white p-4 rounded-2xl shadow-sm flex items-center justify-between mb-3 border border-gray-100">
                            <span className="font-bold">{s.username}</span>
                            <button onClick={() => sendRequest(s)} className="p-2 bg-gray-100 rounded-full"><UserPlus className="w-5 h-5 text-blue-600" /></button>
                        </div>
                    ))}
                </div>
             ) : (
                <div className="text-center animate-pulse">
                    <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MessageCircle className="w-10 h-10 text-gray-400" />
                    </div>
                    <h2 className="text-gray-400 font-medium italic">Select a conversation to start chatting</h2>
                </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
}
