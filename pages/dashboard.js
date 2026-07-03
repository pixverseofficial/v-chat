import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/router';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  doc, 
  updateDoc,
  serverTimestamp,
  onSnapshot,
  orderBy
} from 'firebase/firestore';
import { 
  Search, LogOut, MessageCircle, User, Settings, PlusCircle, UserPlus, Check, Send, Users 
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

  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  // --- Auto scroll to bottom of chat ---
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- Real-time Friend Requests ---
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "friendRequests"),
      where("receiverId", "==", user.uid),
      where("status", "==", "pending")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  // --- Real-time Friends List ---
  useEffect(() => {
    if (!user) return;
    const q1 = query(collection(db, "friends"), where("user1", "==", user.uid));
    const q2 = query(collection(db, "friends"), where("user2", "==", user.uid));

    const unsub1 = onSnapshot(q1, (snapshot) => {
      const list1 = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFriends(prev => {
        const filtered = prev.filter(p => !list1.find(l => l.id === p.id));
        return [...list1, ...filtered];
      });
    });

    const unsub2 = onSnapshot(q2, (snapshot) => {
      const list2 = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFriends(prev => {
        const filtered = prev.filter(p => !list2.find(l => l.id === p.id));
        return [...list2, ...filtered];
      });
    });

    return () => { unsub1(); unsub2(); };
  }, [user]);

  // --- Real-time Messages Listener ---
  useEffect(() => {
    if (!selectedChat || !user) return;

    const chatId = getChatId(selectedChat);
    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [selectedChat, user]);

  const getChatId = (friend) => {
    const friendId = friend.user1 === user.uid ? friend.user2 : friend.user1;
    return [user.uid, friendId].sort().join('_');
  };

  const getFriendName = (f) => (f.user1 === user.uid ? f.user2Name : f.user1Name);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;
    try {
      const q = query(collection(db, "users"), where("username", "==", searchQuery));
      const snapshot = await getDocs(q);
      const results = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(u => u.id !== user.uid);
      setSearchResults(results);
    } catch (error) {
      toast.error("Search failed");
    }
  };

  const sendRequest = async (targetUser) => {
    try {
      await addDoc(collection(db, "friendRequests"), {
        senderId: user.uid,
        senderName: user.displayName,
        receiverId: targetUser.id,
        receiverName: targetUser.username,
        status: "pending",
        timestamp: serverTimestamp()
      });
      toast.success(`Request sent to ${targetUser.username}`);
      setSearchResults([]);
    } catch (error) {
      toast.error("Error sending request");
    }
  };

  const acceptRequest = async (request) => {
    try {
      await updateDoc(doc(db, "friendRequests", request.id), { status: "accepted" });
      await addDoc(collection(db, "friends"), {
        user1: request.senderId,
        user2: request.receiverId,
        user1Name: request.senderName,
        user2Name: request.receiverName,
        timestamp: serverTimestamp()
      });
      toast.success("You're now friends! 🤝");
    } catch (error) {
      toast.error("Accept Error");
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;

    const chatId = getChatId(selectedChat);
    try {
      const msg = newMessage;
      setNewMessage('');
      await addDoc(collection(db, "chats", chatId, "messages"), {
        text: msg,
        senderId: user.uid,
        senderName: user.displayName,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      toast.error("Failed to send message");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  if (!user) return null;

  return (
    <div className="flex h-screen bg-[#F5F5F7] overflow-hidden text-black font-sans">
      <Head><title>V Chat | Dashboard</title></Head>
      
      <Toaster position="top-center" />

      {/* Sidebar */}
      <div className="w-20 md:w-80 border-r border-gray-200 bg-white/60 backdrop-blur-xl flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold hidden md:block text-[#007AFF]">V Chat</h1>
          <form onSubmit={handleSearch} className="mt-6 relative hidden md:block">
            <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search username" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-200/50 border-none py-2.5 pl-10 pr-4 rounded-xl outline-none"
            />
          </form>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          <button onClick={() => setActiveTab('chats')} className={`w-full flex items-center p-3.5 rounded-2xl ${activeTab === 'chats' ? 'bg-[#007AFF] text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100'}`}>
            <MessageCircle className="w-6 h-6 mx-auto md:mx-0 md:mr-3" />
            <span className="hidden md:block font-semibold">Messages</span>
          </button>
          <button onClick={() => setActiveTab('friends')} className={`w-full flex items-center p-3.5 rounded-2xl ${activeTab === 'friends' ? 'bg-[#007AFF] text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100'}`}>
            <User className="w-6 h-6 mx-auto md:mx-0 md:mr-3" />
            <span className="hidden md:block font-semibold">Friends</span>
          </button>
        </nav>

        <div className="p-4 mb-2">
          <div className="flex items-center p-3 rounded-2xl bg-white border border-white shadow-sm">
            <div className="w-10 h-10 min-w-[40px] bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">{user?.displayName?.charAt(0)}</div>
            <div className="ml-3 flex-1 overflow-hidden hidden md:block text-left">
              <p className="text-sm font-bold truncate">{user?.displayName}</p>
              <p className="text-[10px] text-green-500 font-bold uppercase">Online</p>
            </div>
            <button onClick={handleLogout} className="p-2 text-red-500 hidden md:block"><LogOut className="w-5 h-5" /></button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-white/40">
        
        {/* Header */}
        <div className="h-20 border-b border-gray-100 flex items-center justify-between px-8 bg-white/30 backdrop-blur-md">
            <h2 className="text-xl font-bold text-gray-800 uppercase">
                {selectedChat && activeTab === 'chats' ? `Chat: ${getFriendName(selectedChat)}` : activeTab}
            </h2>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'friends' && (
            <div className="p-8 overflow-y-auto space-y-8">
              <section>
                <h3 className="text-gray-400 text-sm font-bold mb-4 uppercase">Requests</h3>
                {pendingRequests.map(req => (
                  <div key={req.id} className="glass-card p-4 rounded-3xl flex items-center justify-between mb-3">
                    <span className="font-bold">{req.senderName}</span>
                    <button onClick={() => acceptRequest(req)} className="p-2 bg-green-500 text-white rounded-xl"><Check /></button>
                  </div>
                ))}
              </section>
              <section>
                <h3 className="text-gray-400 text-sm font-bold mb-4 uppercase">Friends</h3>
                {friends.map(f => (
                  <div key={f.id} className="glass-card p-4 rounded-3xl flex items-center justify-between mb-3">
                    <span className="font-bold">{getFriendName(f)}</span>
                    <button 
                      onClick={() => { setSelectedChat(f); setActiveTab('chats'); }}
                      className="p-2 bg-[#007AFF] text-white rounded-xl"
                    >
                      <MessageCircle className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </section>
            </div>
          )}

          {activeTab === 'chats' && (
            <>
              {selectedChat ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Messages Area */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
                    {messages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.senderId === user.uid ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] px-4 py-2.5 rounded-[22px] shadow-sm text-sm font-medium ${
                          msg.senderId === user.uid 
                          ? 'bg-[#007AFF] text-white rounded-tr-none' 
                          : 'bg-white text-black rounded-tl-none border border-gray-100'
                        }`}>
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    <div ref={scrollRef} />
                  </div>

                  {/* Message Input Area */}
                  <div className="p-6 bg-white/50 backdrop-blur-md border-t border-gray-100">
                    <form onSubmit={sendMessage} className="flex items-center space-x-3">
                      <input 
                        type="text" 
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Message" 
                        className="flex-1 bg-gray-100 border-none py-3 px-5 rounded-full outline-none focus:ring-2 focus:ring-[#007AFF]"
                      />
                      <button type="submit" className="p-3 bg-[#007AFF] text-white rounded-full hover:scale-105 transition-all shadow-lg shadow-blue-500/30">
                        <Send className="w-5 h-5" />
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
                   {/* Search results here if no chat is selected */}
                   {searchResults.length > 0 ? (
                      <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-4">
                        {searchResults.map(res => (
                          <div key={res.id} className="glass-card p-4 rounded-3xl flex items-center justify-between">
                            <span className="font-bold">{res.username}</span>
                            <button onClick={() => sendRequest(res)} className="p-2 bg-[#007AFF] text-white rounded-xl"><UserPlus /></button>
                          </div>
                        ))}
                      </div>
                   ) : (
                      <>
                        <div className="w-20 h-20 bg-gray-100 rounded-[25px] flex items-center justify-center mb-4">
                          <MessageCircle className="w-10 h-10 text-gray-300" />
                        </div>
                        <h2 className="text-xl font-bold">Select a Chat</h2>
                        <p className="text-gray-400 mt-2">Go to Friends and select a person to start chatting.</p>
                      </>
                   )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
