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
  Search, LogOut, MessageSquare, Users, Settings, PlusCircle, UserPlus, Check, Send, MoreVertical, Phone, Video, Info, LayoutDashboard, Camera, X
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentUserData, setCurrentUserData] = useState(null);

  const scrollRef = useRef();

  useEffect(() => { if (!user) router.push('/login'); }, [user, router]);
  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (doc) => {
      setCurrentUserData(doc.data());
    });
    return () => unsub();
  }, [user]);

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

  useEffect(() => {
    if (!selectedChat || !user) return;
    const friendId = selectedChat.user1 === user.uid ? selectedChat.user2 : selectedChat.user1;
    const chatId = [user.uid, friendId].sort().join('_');
    const q = query(collection(db, "chats", chatId, "messages"), orderBy("timestamp", "asc"));
    return onSnapshot(q, (snap) => setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [selectedChat, user]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "aixca7um");
    try {
      const res = await fetch("https://api.cloudinary.com/v1_1/wr25js0c/image/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      await updateDoc(doc(db, "users", user.uid), { photoURL: data.secure_url });
      toast.success("Profile picture updated!");
    } catch (err) {
      toast.error("Upload failed!");
    } finally {
      setUploading(false);
    }
  };

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
      <Head><title>V Chat</title></Head>
      <Toaster position="top-right" />

      {/* Sidebar Navigation */}
      <div className="w-20 bg-white border-r border-slate-200 flex flex-col items-center py-8 gap-10">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
          <span className="text-white font-bold text-xl italic">V</span>
        </div>
        <div className="flex flex-col gap-6 flex-1">
          <button onClick={() => setActiveTab('chats')} className={`p-3 rounded-xl ${activeTab === 'chats' ? 'bg-blue-50 text-blue-600' : 'text-slate-400'}`}><MessageSquare /></button>
          <button onClick={() => setActiveTab('friends')} className={`p-3 rounded-xl ${activeTab === 'friends' ? 'bg-blue-50 text-blue-600' : 'text-slate-400'}`}><Users /></button>
          <button onClick={() => setIsSettingsOpen(true)} className="p-3 text-slate-400"><Settings /></button>
        </div>
        <button onClick={() => signOut(auth)} className="p-3 text-slate-400 hover:text-red-500"><LogOut /></button>
      </div>

      {/* List Area */}
      <div className="w-full md:w-96 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-6">{activeTab === 'chats' ? 'Recent Chats' : 'Friends'}</h2>
          <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
            <form onSubmit={handleSearch}>
              <input type="text" placeholder="Search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-100 py-2.5 pl-10 pr-4 rounded-xl outline-none" />
            </form>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4">
          {searchResults.map(res => (
            <div key={res.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl">
              <span className="font-semibold text-sm">{res.username}</span>
              <button onClick={() => { addDoc(collection(db, "friendRequests"), { senderId: user.uid, senderName: user.displayName, receiverId: res.id, receiverName: res.username, status: "pending", timestamp: serverTimestamp() }); toast.success("Sent!"); setSearchResults([]); }} className="text-blue-600"><UserPlus className="w-4 h-4"/></button>
            </div>
          ))}
          {friends.map(f => (
            <div key={f.id} onClick={() => setSelectedChat(f)} className={`flex items-center p-3 rounded-2xl cursor-pointer ${selectedChat?.id === f.id ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-50'}`}>
              <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center font-bold bg-blue-100 text-blue-600">
                {f.photoURL ? <img src={f.photoURL} className="w-full h-full object-cover" /> : getFriendName(f).charAt(0)}
              </div>
              <div className="ml-4">
                <p className="font-bold text-sm">{getFriendName(f)}</p>
                <p className={`text-xs ${selectedChat?.id === f.id ? 'text-blue-100' : 'text-slate-400'}`}>Online</p>
              </div>
            </div>
          ))}
          {activeTab === 'friends' && pendingRequests.map(r => (
             <div key={r.id} className="bg-slate-50 p-3 rounded-xl flex items-center justify-between mt-2">
                <span className="font-bold text-xs">{r.senderName}</span>
                <button onClick={() => { updateDoc(doc(db, "friendRequests", r.id), { status: "accepted" }); addDoc(collection(db, "friends"), { user1: r.senderId, user2: r.receiverId, user1Name: r.senderName, user2Name: r.receiverName, timestamp: serverTimestamp() }); toast.success("Accepted!"); }} className="bg-blue-600 text-white px-3 py-1 rounded-lg text-[10px]">Accept</button>
             </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-white flex flex-col">
        {selectedChat ? (
          <>
            <div className="h-20 border-b flex items-center justify-between px-8">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center font-bold text-blue-600">
                   {selectedChat.photoURL ? <img src={selectedChat.photoURL} className="w-full h-full object-cover" /> : getFriendName(selectedChat).charAt(0)}
                </div>
                <div><h3 className="font-bold">{getFriendName(selectedChat)}</h3><p className="text-[10px] text-green-500">Active</p></div>
              </div>
              <div className="flex gap-4 text-slate-400"><Phone /><Video /><Info /></div>
            </div>
            <div className="flex-1 overflow-y-auto p-10 space-y-6 bg-slate-50/30">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.senderId === user.uid ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[65%] px-5 py-3 rounded-2xl shadow-sm text-sm ${msg.senderId === user.uid ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border text-slate-700 rounded-tl-none'}`}>{msg.text}</div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>
            <div className="p-6 bg-white border-t">
              <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl">
                <PlusCircle className="text-slate-400" />
                <form onSubmit={sendMessage} className="flex-1 flex items-center gap-4">
                  <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." className="flex-1 bg-transparent border-none outline-none text-sm" />
                  <button type="submit" className="bg-blue-600 p-3 rounded-xl text-white shadow-lg"><Send className="w-5 h-5" /></button>
                </form>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-slate-400">
            <MessageSquare className="w-16 h-16 mb-4" /><p>Select a chat to start</p>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="bg-white w-full max-w-md rounded-[2rem] p-8 relative">
            <button onClick={() => setIsSettingsOpen(false)} className="absolute right-6 top-6"><X /></button>
            <h2 className="text-2xl font-bold mb-8">Settings</h2>
            <div className="flex flex-col items-center gap-6">
              <div className="relative group w-32 h-32 rounded-full overflow-hidden bg-slate-100 border-4 border-white shadow-xl flex items-center justify-center text-4xl font-bold text-blue-600">
                  {currentUserData?.photoURL ? <img src={currentUserData.photoURL} className="w-full h-full object-cover" /> : user?.displayName?.charAt(0)}
                  <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                    <Camera className="text-white" /><input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                  </label>
              </div>
              <p className="text-xl font-bold">{user?.displayName}</p>
              <button onClick={() => setIsSettingsOpen(false)} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
