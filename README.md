# تطبيق متابعة المهام اليومية

تطبيق ويب لمتابعة المهام اليومية لمجموعة من الأفراد، يعمل بـ React + Firebase Firestore.

## التشغيل المحلي

```bash
npm install
npm run dev
```

## النشر

راجع `دليل-الإعداد.md` للخطوات الكاملة.

## ملاحظات هامة قبل النشر

1. عدّل ملف `src/firebase.js` وضع مفاتيح Firebase الخاصة بك
2. غيّر كلمة المرور `ADMIN_PASSWORD` في أول `src/App.jsx` من `admin123` إلى كلمة سر قوية
3. اضبط قواعد Firestore Security Rules (راجع الدليل)
