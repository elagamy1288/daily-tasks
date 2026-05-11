// =====================================================================
// ⚠️ مهم: ضع مفاتيح Firebase الخاصة بك هنا
// =====================================================================
// بعد إنشاء مشروع Firebase، انسخ الإعدادات والصقها هنا
// راجع ملف "دليل الإعداد.md" للتفاصيل
// =====================================================================

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA-BEn4bkR7Kl8D9LVa_5wlovH8B0vxRbQ",
  authDomain: "daily-tasks-b298b.firebaseapp.com",
  projectId: "daily-tasks-b298b",
  storageBucket: "daily-tasks-b298b.firebasestorage.app",
  messagingSenderId: "623585128330",
  appId: "1:623585128330:web:ea189069f5d8793c62a273"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
