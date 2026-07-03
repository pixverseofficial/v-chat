import React, { useState } from 'react';
import Head from 'next/head';
import { auth, db } from '../lib/firebase'; // db കൂടി ഇംപോർട്ട് ചെയ്തു
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore'; // Firestore ഫങ്ക്ഷനുകൾ
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
        await signInWithEmailAndPassword(auth, email, password);
        router.push('/dashboard'); // ഡാഷ്‌ബോർഡിലേക്ക് പോകും
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await updateProfile(user, { displayName: username });

        // Firestore-ലേക്ക് യൂസർ ഡാറ്റ സേവ് ചെയ്യുന്നു
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          username: username,
          email: email,
          photoURL: "",
          status: "Online",
          createdAt: new Date().toISOString()
        });

        router.push('/dashboard');
      }
    } catch (err) {
      setError(err.message.replace('Firebase:', ''));
    }
  };

  return (
    // ... പഴയ ലോഗിൻ UI കോഡ് മാറ്റമില്ലാതെ ഇവിടെ തുടരും ...
    // (നേരത്തെ തന്ന അതേ UI തന്നെ ഉപയോഗിക്കാം)
  );
}
