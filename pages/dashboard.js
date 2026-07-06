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
  Search, LogOut, MessageSquare, Users, Settings, PlusCircle, UserPlus, Check, Send, MoreVertical, Phone, Video, Info, Camera, X, Clock, Compass
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('chats'); // 'chats', 'friends', 'explore'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); 
  const [uploading, setUploading] = useState(false);
  const [currentUserData, setCurrentUserData] = useState(null);

  const scrollRef = useRef();

  useEffect(() => { if (!user) router.push('/login'); }, [user, router]);
  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Fetch current user details in real-time
  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, "users", user.uid), (doc) => {
      setCurrentUserData(doc.data());
    });
  }, [user]);

  // Listen for Friends and Requests
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

  // Message Listener
  useEffect(() => {
    if (!selectedChat || !user) return;
    const friendId = selectedChat.user1 === user.uid ? selectedChat.user2 : selectedChat.user1;
    const chatId = [user.uid, friendId].sort().join('_');
    const q = query(collection(db, "chats", chatId, "messages"), orderBy("timestamp", "asc"));
    return onSnapshot(q, (snap) => setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [selectedChat, user]);

  // Cloudinary Upload
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "aixca7um");
    try {
      const res = await fetch("https://api.cloudinary.com/v1_1/wr25js0c/image/upload", { method: "POST", body: formData });
      const data = await res.json();
      await updateDoc(doc(db, "users", user.uid), { photoURL: data.secure_url });
      toast.success("Profile updated!");
    } catch (err) {
      toast.error("Upload failed!");
    } finally { setUploading(false); }
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
  const formatTime = (ts) => ts ? ts.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  if (!user) return null;

  return (
    <div className="h-screen w-full bg-[#f4f7fb] flex overflow-hidden font-sans text-slate-700">
      <Head><title>V Chat</title></Head>
      <Toaster position="top-right" />

      {/* --- COLUMN 1: SLIM NAVBAR (Left) --- */}
      <div className="w-20 bg-white border-r border-slate-200 flex flex-col items-center py-8 gap-10 z-30">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
          <span className="text-white font-bold text-xl italic">V</span>
        </div>
        
        <div className="flex flex-col gap-6 flex-1 mt-4">
          <button onClick={() => {setActiveTab('chats'); setSelectedChat(null);}} className={`p-3 rounded-xl transition-all ${activeTab === 'chats' && !selectedChat ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-blue-600'}`}>
            <MessageSquare className="w-6 h-6" />
          </button>
          <button onClick={() => {setActiveTab('friends'); setSelectedChat(null);}} className={`p-3 rounded-xl transition-all ${activeTab === 'friends' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-blue-600'}`}>
            <Users className="w-6 h-6" />
            {pendingRequests.length > 0 && <span className="absolute ml-5 -mt-8 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
          </button>
          <button onClick={() => {setActiveTab('explore'); setSelectedChat(null);}} className={`p-3 rounded-xl transition-all ${activeTab === 'explore' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-blue-600'}`}>
            <Compass className="w-6 h-6" />
          </button>
          <button onClick={() => setIsSettingsOpen(true)} className="p-3 rounded-xl text-slate-400 hover:text-blue-600 transition-all">
            <Settings className="w-6 h-6" />
          </button>
        </div>

        <button onClick={() => signOut(auth)} className="p-3 text-slate-400 hover:text-red-500 transition-all mt-auto">
          <LogOut className="w-6 h-6" />
        </button>
      </div>

      {/* --- COLUMN 2: LIST AREA (Middle) --- */}
      <div className="w-full md:w-96 bg-white border-r border-slate-200 flex flex-col z-20">
        <div className="p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-6">
            {activeTab === 'chats' ? 'Recent Chats' : activeTab === 'friends' ? 'Friends' : 'Explore'}
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
            <form onSubmit={async (e) => {
                e.preventDefault();
                const q = query(collection(db, "users"), where("username", "==", searchQuery));
                const snap = await getDocs(q);
                setSearchResults(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.id !== user.uid));
                setActiveTab('explore');
            }}>
              <input type="text" placeholder="Search people..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-100 border-none py-2.5 pl-10 pr-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
            </form>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2">
          {activeTab === 'explore' && searchResults.map(res => (
            <div key={res.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
               <span className="font-bold text-sm text-slate-700">{res.username}</span>
               <button onClick={() => { addDoc(collection(db, "friendRequests"), { senderId: user.uid, senderName: user.displayName, receiverId: res.id, receiverName: res.username, status: "pending", timestamp: serverTimestamp() }); toast.success("Sent!"); setSearchResults([]); }} className="p-2 bg-blue-600 text-white rounded-lg"><UserPlus className="w-4 h-4"/></button>
            </div>
          ))}

          {(activeTab === 'chats' || activeTab === 'friends') && friends.map(f => (
            <div key={f.id} onClick={() => { setSelectedChat(f); setActiveTab('chats'); }} className={`flex items-center p-3 rounded-2xl cursor-pointer transition-all ${selectedChat?.id === f.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'hover:bg-slate-50'}`}>
              <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center font-bold bg-blue-100 text-blue-600 border-2 border-white shadow-sm">
                {f.photoURL ? <img src={f.photoURL} className="w-full h-full object-cover" /> : getFriendName(f).charAt(0)}
              </div>
              <div className="ml-4 flex-1">
                <p className="font-bold text-sm">{getFriendName(f)}</p>
                <p className={`text-[10px] ${selectedChat?.id === f.id ? 'text-blue-100 font-bold' : 'text-slate-400 font-medium'}`}>ACTIVE NOW</p>
              </div>
            </div>
          ))}

          {activeTab === 'friends' && pendingRequests.length > 0 && (
            <div className="pt-6">
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-4">Requests</h3>
               {pendingRequests.map(r => (
                 <div key={r.id} className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between border border-slate-200">
                    <span className="font-bold text-xs">{r.senderName}</span>
                    <button onClick={() => {
                        updateDoc(doc(db, "friendRequests", r.id), { status: "accepted" });
                        addDoc(collection(db, "friends"), { user1: r.senderId, user2: r.receiverId, user1Name: r.senderName, user2Name: r.receiverName, timestamp: serverTimestamp() });
                        toast.success("New friend added!");
                    }} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-bold shadow-md shadow-blue-100">ACCEPT</button>
                 </div>
               ))}
            </div>
          )}
        </div>
      </div>

      {/* --- COLUMN 3: CHAT AREA --- */}
      <div className="flex-1 bg-white flex flex-col relative z-10">
        {selectedChat && activeTab === 'chats' ? (
          <>
            <div className="h-20 border-b border-slate-100 flex items-center justify-between px-8 bg-white/90 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center text-blue-600 font-bold border border-slate-200">
                   {selectedChat.photoURL ? <img src={selectedChat.photoURL} className="w-full h-full object-cover" /> : getFriendName(selectedChat).charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{getFriendName(selectedChat)}</h3>
                  <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div><span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Active</span></div>
                </div>
              </div>
              <div className="flex gap-4 text-slate-400"><Phone className="w-5 h-5"/><Video className="w-5 h-5"/><Info className="w-5 h-5"/></div>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-6 bg-[#fcfdfe]">
              {messages.map((msg) => {
                const isMe = msg.senderId === user.uid;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[65%] px-5 py-3 rounded-2xl shadow-sm text-sm font-medium ${
                      isMe ? 'bg-blue-600 text-white rounded-tr-none shadow-blue-100' : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none'
                    }`}>{msg.text}</div>
                    <div className="flex items-center gap-1 mt-1 px-1">
                        <Clock className="w-2.5 h-2.5 text-slate-300" />
                        <span className="text-[9px] text-slate-300 font-bold">{formatTime(msg.timestamp)}</span>
                    </div>
                  </div>
                );
              })}
              <div ref={scrollRef} />
            </div>

            <div className="p-6 bg-white border-t border-slate-100">
              <form onSubmit={sendMessage} className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                <PlusCircle className="text-slate-400 ml-2 cursor-pointer" />
                <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." className="flex-1 bg-transparent border-none py-2 text-sm outline-none text-slate-700" />
                <button type="submit" className="bg-blue-600 p-3 rounded-xl text-white shadow-lg hover:scale-105 transition-all"><Send className="w-5 h-5" /></button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50">
            <div className="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center shadow-xl mb-6">
              <MessageSquare className="w-12 h-12 text-blue-600" />
            </div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Select a Conversation</h2>
            <p className="text-slate-400 text-xs mt-2 font-bold uppercase tracking-widest">Connect with your friends to chat</p>
          </div>
        )}
      </div>

      {/* --- EDIT PROFILE MODAL --- */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 relative shadow-2xl animate-in zoom-in duration-200">
            <button onClick={() => setIsSettingsOpen(false)} className="absolute right-8 top-8 p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400"><X /></button>
            <h2 className="text-2xl font-black mb-8 text-slate-800 tracking-tight italic uppercase">Profile Settings</h2>
            
            <div className="flex flex-col items-center gap-8">
              <div className="relative group w-40 h-40">
                <div className="w-full h-full rounded-full overflow-hidden bg-slate-100 border-4 border-white shadow-2xl flex items-center justify-center text-5xl font-black text-blue-600 uppercase">
                  {currentUserData?.photoURL ? <img src={currentUserData.photoURL} className="w-full h-full object-cover" /> : user?.displayName?.charAt(0)}
                </div>
                <label className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center cursor-pointer text-white text-[10px] font-bold">
                  <Camera className="w-8 h-8 mb-1" />
                  <span>UPLOAD PHOTO</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                </label>
                {uploading && <div className="absolute inset-0 bg-white/80 rounded-full flex items-center justify-center text-xs font-black text-blue-600 animate-pulse uppercase tracking-widest">Updating...</div>}
              </div>
              
              <div className="text-center">
                <p className="text-2xl font-black text-slate-800 tracking-tight uppercase italic">{user?.displayName}</p>
                <p className="text-slate-400 text-sm font-bold tracking-tight">{user?.email}</p>
              </div>

              <button onClick={() => setIsSettingsOpen(false)} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all uppercase tracking-widest">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
