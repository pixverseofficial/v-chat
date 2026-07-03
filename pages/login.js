import React, { useState } from 'react';
import Head from 'next/head';
import { auth } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      if (isLogin) {
        // Login Logic
        await signInWithEmailAndPassword(auth, email, password);
        router.push('/'); // ലോഗിൻ ആയാൽ ഹോം പേജിലേക്ക് പോകും
      } else {
        // Sign Up Logic
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // പ്രൊഫൈലിൽ യൂസർനെയിം കൂടി സെറ്റ് ചെയ്യുന്നു
        await updateProfile(userCredential.user, { displayName: username });
        router.push('/');
      }
    } catch (err) {
      setError(err.message.replace('Firebase:', ''));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Head>
        <title>{isLogin ? 'Login' : 'Sign Up'} | V Chat</title>
      </Head>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card max-w-sm w-full p-8 rounded-[35px]"
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-black">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-gray-500 mt-2">
            {isLogin ? 'Glad to see you again!' : 'Join the V Chat community today.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <input
              type="text"
              placeholder="Username"
              className="w-full px-5 py-3 rounded-2xl bg-gray-100 border-none focus:ring-2 focus:ring-appleBlue outline-none transition-all"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            className="w-full px-5 py-3 rounded-2xl bg-gray-100 border-none focus:ring-2 focus:ring-appleBlue outline-none transition-all"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full px-5 py-3 rounded-2xl bg-gray-100 border-none focus:ring-2 focus:ring-appleBlue outline-none transition-all"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <p className="text-red-500 text-sm ml-2">{error}</p>}

          <button type="submit" className="apple-button w-full py-4 text-lg mt-4">
            {isLogin ? 'Login' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-appleBlue font-medium hover:underline transition-all"
          >
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
