import React from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Head>
        <title>V Chat | Messaging Redefined</title>
      </Head>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="glass-card max-w-md w-full p-10 rounded-[40px] text-center"
      >
        <div className="w-20 h-20 bg-[#007AFF] rounded-[22px] mx-auto mb-6 flex items-center justify-center shadow-lg shadow-blue-500/30">
          <span className="text-white text-4xl font-bold italic">V</span>
        </div>

        <h1 className="text-4xl font-bold tracking-tight text-black mb-3">
          V Chat
        </h1>
        
        <p className="text-gray-500 text-lg mb-10 leading-relaxed">
          The simple, private, and <br/> beautiful way to connect.
        </p>

        <div className="space-y-4">
          <button className="apple-button w-full text-lg py-4">
            Get Started
          </button>
          <p className="text-sm text-gray-400">Secure. Fast. Minimal.</p>
        </div>
      </motion.div>

      {/* Background Decor */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-100/50 blur-[120px] -z-10" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-100/50 blur-[120px] -z-10" />
    </div>
  );
}
