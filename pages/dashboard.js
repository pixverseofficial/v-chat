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
  setDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { 
  Search, LogOut, MessageCircle, User, Settings, MoreVertical, PlusCircle, UserPlus, Check 
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('chats');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);

  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  // --- Real-time Friend Requests Listener ---
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "friendRequests"),
      where("receiverId", "==", user.uid),
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reqs = [];
      snapshot.forEach((doc) => {
        reqs.push({ id: doc.id, ...doc.data() });
      });
      setPendingRequests(reqs);
    });

    return () => unsubscribe();
  }, [user]);

  // --- Search Users Logic ---
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;
    setLoading(true);
    
    try {
      const q = query(
        collection(db, "users"), 
        where("username", "==", searchQuery)
      );
      const querySnapshot = await getDocs(q);
      const users = [];
      querySnapshot.forEach((doc) => {
        if (doc.id !== user.uid) {
          users.push({ id: doc.id, ...doc.data() });
        }
      });
      setSearchResults(users);
    } catch (error) {
      console.error("Search error:", error);
    }
    setLoading(false);
  };

  // --- Send Friend Request Logic ---
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
      alert("Request Sent to " + targetUser.username);
      setSearchResults([]);
      setSearchQuery('');
    } catch (error) {
      alert("Error sending request");
    }
  };

  // --- Accept Friend Request Logic ---
  const acceptRequest = async (request) => {
    try {
      // 1. Update request status to "accepted"
      await updateDoc(doc(db, "friendRequests", request.id), {
        status: "accepted"
      });

      // 2. Add both users to friends collection
      await addDoc(collection(db, "friends"), {
        user1: request.senderId,
        user2: request.receiverId,
        user1Name: request.senderName,
        user2Name: request.receiverName,
        timestamp: serverTimestamp()
      });

      alert("Friend Request Accepted!");
    } catch (error) {
      console.error("Error accepting request:", error);
      alert("Error accepting request");
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

      {/* Sidebar */}
      <div className="w-20 md:w-80 border-r border-gray-200 bg-white/60 backdrop-blur-xl flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold hidden md:block text-[#007AFF]">V Chat</h1>
          
          <form onSubmit={handleSearch} className="mt-6 relative hidden md:block">
            <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search username..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-200/50 border-none py-2.5 pl-10 pr-4 rounded-xl focus:ring-2 focus:ring-[#007AFF] outline-none"
            />
          </form>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          <button onClick={() => setActiveTab('chats')} className={`w-full flex items-center p-3.5 rounded-2xl ${activeTab === 'chats' ? 'bg-[#007AFF] text-white shadow-lg shadow-blue-500/20' : 'text-gray-500 hover:bg-gray-100'}`}>
            <MessageCircle className="w-6 h-6 mx-auto md:mx-0 md:mr-3" />
            <span className="hidden md:block font-semibold">Messages</span>
          </button>
          <button onClick={() => setActiveTab('friends')} className={`w-full flex items-center p-3.5 rounded-2xl ${activeTab === 'friends' ? 'bg-[#007AFF] text-white shadow-lg shadow-blue-500/20' : 'text-gray-500 hover:bg-gray-100'}`}>
            <User className="w-6 h-6 mx-auto md:mx-0 md:mr-3" />
            <span className="hidden md:block font-semibold">Friends</span>
          </button>
        </nav>

        <div className="p-4 mb-2">
          <div className="flex items-center p-3 rounded-2xl bg-white border border-white shadow-sm overflow-hidden">
            <div className="w-10 h-10 min-w-[40px] bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">{user?.displayName?.charAt(0)}</div>
            <div className="ml-3 flex-1 overflow-hidden hidden md:block">
              <p className="text-sm font-bold truncate">{user?.displayName}</p>
              <p className="text-[10px] text-green-500 font-bold uppercase">Online</p>
            </div>
            <button onClick={handleLogout} className="p-2 text-red-500 md:block hidden"><LogOut className="w-5 h-5" /></button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-white/40">
        <div className="h-20 border-b border-gray-100 flex items-center justify-between px-8 bg-white/30 backdrop-blur-md">
            <h2 className="text-xl font-bold text-gray-800 uppercase tracking-wide">{activeTab}</h2>
        </div>

        {/* Search Results Area */}
        <div className="p-8 overflow-y-auto flex-1">
          {/* Pending Requests Section */}
          {pendingRequests.length > 0 && (
            <div className="mb-8">
              <h3 className="text-gray-400 text-sm font-bold mb-4 uppercase">Pending Friend Requests ({pendingRequests.length})</h3>
              <div className="space-y-3">
                {pendingRequests.map((request) => (
                  <div key={request.id} className="glass-card p-4 rounded-3xl flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-purple-200 rounded-full flex items-center justify-center font-bold text-purple-600">
                        {request.senderName?.charAt(0) || '?'}
                      </div>
                      <div className="ml-4 text-left">
                        <p className="font-bold text-black">{request.senderName}</p>
                        <p className="text-xs text-gray-400">Sent you a friend request</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => acceptRequest(request)}
                      className="p-3 bg-green-500 text-white rounded-2xl hover:scale-105 transition-all"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mb-8">
              <h3 className="text-gray-400 text-sm font-bold mb-4 uppercase">Search Results</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {searchResults.map((result) => (
                  <div key={result.id} className="glass-card p-4 rounded-3xl flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center font-bold">{result.username.charAt(0)}</div>
                      <div className="ml-4 text-left">
                        <p className="font-bold text-black">{result.username}</p>
                        <p className="text-xs text-gray-400">V Chat User</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => sendRequest(result)}
                      className="p-3 bg-[#007AFF] text-white rounded-2xl hover:scale-105 transition-all"
                    >
                      <UserPlus className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {searchResults.length === 0 && pendingRequests.length === 0 && (
            <div className="flex flex-col items-center justify-center mt-20 text-center">
              <div className="w-24 h-24 bg-gray-100/80 rounded-[30px] flex items-center justify-center mb-6 shadow-sm">
                <MessageCircle className="w-12 h-12 text-gray-300" />
              </div>
              <h2 className="text-2xl font-bold text-black">Welcome, {user.displayName}!</h2>
              <p className="text-gray-500 mt-2 max-w-xs mx-auto">Search for your friends using their username to start chatting.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
