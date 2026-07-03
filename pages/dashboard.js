import React, { useState, useEffect } from 'react';
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
  onSnapshot
} from 'firebase/firestore';
import { 
  Search, LogOut, MessageCircle, User, Settings, PlusCircle, UserPlus, Check, Users 
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
  const [selectedChat, setSelectedChat] = useState(null); // New state for selected chat

  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  // Real-time Friend Requests
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

  // Real-time Friends List
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

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;
    try {
      const q = query(collection(db, "users"), where("username", "==", searchQuery));
      const snapshot = await getDocs(q);
      const results = [];
      snapshot.forEach(doc => {
        if (doc.id !== user.uid) results.push({ id: doc.id, ...doc.data() });
      });
      setSearchResults(results);
    } catch (error) {
      console.error(error);
      toast.error("Search failed");
    }
  };

  // --- Send Friend Request Logic with Toast ---
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
      setSearchQuery('');
    } catch (error) {
      toast.error("Error sending request");
    }
  };

  // --- Accept Friend Request Logic with Toast ---
  const acceptRequest = async (request) => {
    try {
      const requestRef = doc(db, "friendRequests", request.id);
      await updateDoc(requestRef, { status: "accepted" });

      await addDoc(collection(db, "friends"), {
        user1: request.senderId,
        user2: request.receiverId,
        user1Name: request.senderName,
        user2Name: request.receiverName,
        timestamp: serverTimestamp()
      });
      toast.success("You're now friends! 🤝");
    } catch (error) {
      console.error(error);
      toast.error("Accept Error: " + error.message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  const getFriendName = (f) => (f.user1 === user.uid ? f.user2Name : f.user1Name);

  if (!user) return null;

  return (
    <div className="flex h-screen bg-[#F5F5F7] overflow-hidden text-black font-sans">
      <Head><title>V Chat | Dashboard</title></Head>
      
      {/* Toaster Component */}
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
            borderRadius: '12px',
            padding: '16px',
          },
          success: {
            duration: 3000,
            style: {
              background: '#22c55e',
              color: '#fff',
            },
          },
          error: {
            duration: 4000,
            style: {
              background: '#ef4444',
              color: '#fff',
            },
          },
        }}
      />

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
            <div className="ml-3 flex-1 overflow-hidden hidden md:block">
              <p className="text-sm font-bold truncate">{user?.displayName}</p>
              <p className="text-[10px] text-green-500 font-bold uppercase">Online</p>
            </div>
            <button onClick={handleLogout} className="p-2 text-red-500 hidden md:block"><LogOut className="w-5 h-5" /></button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white/40 overflow-y-auto">
        <div className="h-20 border-b border-gray-100 flex items-center px-8 bg-white/30 backdrop-blur-md">
            <h2 className="text-xl font-bold text-gray-800 uppercase">{activeTab}</h2>
            {selectedChat && (
              <span className="ml-4 text-sm text-[#007AFF] font-medium">
                Chatting with {getFriendName(selectedChat)}
              </span>
            )}
        </div>

        <div className="p-8">
          {activeTab === 'friends' && (
            <div className="space-y-8">
              <section>
                <h3 className="text-gray-400 text-sm font-bold mb-4 uppercase">Pending Requests</h3>
                {pendingRequests.length === 0 ? (
                  <p className="text-gray-400 italic">No pending requests</p>
                ) : (
                  pendingRequests.map(req => (
                    <div key={req.id} className="glass-card p-4 rounded-3xl flex items-center justify-between mb-3">
                      <span className="font-bold">{req.senderName}</span>
                      <button onClick={() => acceptRequest(req)} className="p-2 bg-green-500 text-white rounded-xl hover:scale-105 transition-all"><Check /></button>
                    </div>
                  ))
                )}
              </section>
              <section>
                <h3 className="text-gray-400 text-sm font-bold mb-4 uppercase">Friends ({friends.length})</h3>
                {friends.length === 0 ? (
                  <p className="text-gray-400 italic">No friends yet</p>
                ) : (
                  friends.map(f => (
                    <div key={f.id} className="glass-card p-4 rounded-3xl flex items-center justify-between mb-3">
                      <span className="font-bold">{getFriendName(f)}</span>
                      <button 
                        onClick={() => {
                          setSelectedChat(f);
                          setActiveTab('chats');
                        }}
                        className="p-2 bg-[#007AFF] text-white rounded-xl hover:scale-105 transition-all"
                      >
                        <MessageCircle className="w-5 h-5" />
                      </button>
                    </div>
                  ))
                )}
              </section>
            </div>
          )}

          {activeTab === 'chats' && (
            <div>
              {selectedChat ? (
                <div className="glass-card p-6 rounded-3xl">
                  <h3 className="text-xl font-bold mb-4">
                    Chat with {getFriendName(selectedChat)}
                  </h3>
                  <div className="min-h-[300px] flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p>Chat interface coming soon...</p>
                      <p className="text-sm mt-2">Messages will appear here</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="glass-card p-12 rounded-3xl text-center">
                  <MessageCircle className="w-20 h-20 mx-auto text-gray-300 mb-6" />
                  <h3 className="text-2xl font-bold text-gray-700">Select a friend to chat</h3>
                  <p className="text-gray-400 mt-2">Go to Friends tab and click the message icon</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
