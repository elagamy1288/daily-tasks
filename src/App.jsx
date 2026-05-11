import React, { useState, useEffect } from 'react';
import { Check, Users, Settings, TrendingUp, Award, AlertCircle, Edit3, Save, X, RefreshCw, Calendar, ChevronRight, Sparkles, Plus, Trash2, Lock } from 'lucide-react';
import { db } from './firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

const TODAY_KEY = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ⚠️ مهم: غيّر كلمة المرور دي قبل النشر
const ADMIN_PASSWORD = "quraan";

const DEFAULT_MEMBERS = Array.from({ length: 16 }, (_, i) => `الفرد ${i + 1}`);
const DEFAULT_TASKS = [
  'المهمة الأولى',
  'المهمة الثانية',
  'المهمة الثالثة',
  'المهمة الرابعة',
  'المهمة الخامسة',
];

export default function App() {
  const [view, setView] = useState('home');
  const [selectedMember, setSelectedMember] = useState(null);
  const [members, setMembers] = useState(DEFAULT_MEMBERS);
  const [tasks, setTasks] = useState(DEFAULT_TASKS);
  const [completions, setCompletions] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [pendingAdminView, setPendingAdminView] = useState(null);

  // Real-time listener for config (members + tasks)
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'app', 'config'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.members) setMembers(data.members);
        if (data.tasks) setTasks(data.tasks);
      }
      setLoading(false);
    }, (err) => {
      console.error('Config listener error:', err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Real-time listener for today's completions
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'completions', TODAY_KEY()), (snap) => {
      if (snap.exists()) {
        setCompletions(snap.data().data || {});
      } else {
        setCompletions({});
      }
    }, (err) => {
      console.error('Completions listener error:', err);
    });
    return () => unsub();
  }, []);

  async function saveCompletions(newCompletions) {
    setSaving(true);
    try {
      await setDoc(doc(db, 'completions', TODAY_KEY()), {
        data: newCompletions,
        updatedAt: new Date().toISOString(),
      });
      setLastSaved(new Date());
    } catch (e) {
      console.error('Save error:', e);
      alert('حدث خطأ في الحفظ. تأكد من الاتصال بالإنترنت.');
    } finally {
      setTimeout(() => setSaving(false), 400);
    }
  }

  async function saveConfig(newMembers, newTasks) {
    try {
      await setDoc(doc(db, 'app', 'config'), {
        members: newMembers,
        tasks: newTasks,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error('Config save error:', e);
      alert('حدث خطأ في حفظ الإعدادات.');
    }
  }

  function toggleTask(memberIdx, taskIdx) {
    const current = completions[memberIdx] || Array(tasks.length).fill(false);
    const updated = [...current];
    while (updated.length < tasks.length) updated.push(false);
    updated[taskIdx] = !updated[taskIdx];
    const newCompletions = { ...completions, [memberIdx]: updated };
    setCompletions(newCompletions);
    saveCompletions(newCompletions);
  }

  async function resetDay() {
    if (!confirm('هل أنت متأكد من مسح كل علامات اليوم؟ هذا الإجراء لا يمكن التراجع عنه.')) return;
    setCompletions({});
    await saveCompletions({});
  }

  function requestAdminAccess(targetView) {
    if (isAdmin) {
      setView(targetView);
    } else {
      setPendingAdminView(targetView);
      setShowPasswordPrompt(true);
    }
  }

  function handlePasswordSubmit(password) {
    if (password === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setShowPasswordPrompt(false);
      if (pendingAdminView) {
        setView(pendingAdminView);
        setPendingAdminView(null);
      }
      return true;
    }
    return false;
  }

  const today = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2d1b2e 0%, #3d2438 100%)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-pink-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-pink-100 text-lg font-medium">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" style={{ fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif", background: 'linear-gradient(135deg, #2d1b2e 0%, #3d2438 50%, #2d1b2e 100%)', minHeight: '100vh' }}>
      {showPasswordPrompt && (
        <PasswordPrompt
          onSubmit={handlePasswordSubmit}
          onCancel={() => { setShowPasswordPrompt(false); setPendingAdminView(null); }}
        />
      )}

      {/* Decorative background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #ec4899 0%, transparent 70%)' }}></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #f0c987 0%, transparent 70%)' }}></div>
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)', boxShadow: '0 10px 30px -10px rgba(236, 72, 153, 0.45)' }}>
                <Sparkles className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-white">متابعة المهام اليومية</h1>
                <p className="text-pink-200/70 text-sm flex items-center gap-2 mt-1">
                  <Calendar size={14} />
                  {today}
                </p>
              </div>
            </div>

            {saving && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
                <RefreshCw size={14} className="text-emerald-300 animate-spin" />
                <span className="text-emerald-200 text-sm">جاري الحفظ...</span>
              </div>
            )}
            {!saving && lastSaved && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <Check size={14} className="text-emerald-300" />
                <span className="text-emerald-200 text-sm">تم الحفظ</span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="grid grid-cols-3 gap-2 md:gap-3 mb-8 p-1.5 rounded-2xl" style={{ background: 'rgba(45, 27, 46, 0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(236, 72, 153, 0.18)' }}>
          <NavButton active={view === 'home'} onClick={() => { setView('home'); setSelectedMember(null); }} icon={<Users size={18} />} label="الأفراد" />
          <NavButton active={view === 'admin'} onClick={() => requestAdminAccess('admin')} icon={<TrendingUp size={18} />} label="لوحة المشرف" locked={!isAdmin} />
          <NavButton active={view === 'settings'} onClick={() => requestAdminAccess('settings')} icon={<Settings size={18} />} label="الإعدادات" locked={!isAdmin} />
        </div>

        {/* Content */}
        {view === 'home' && !selectedMember && (
          <MembersGrid
            members={members}
            completions={completions}
            tasksCount={tasks.length}
            onSelect={(idx) => { setSelectedMember(idx); setView('member'); }}
          />
        )}

        {view === 'member' && selectedMember !== null && (
          <MemberView
            memberName={members[selectedMember]}
            memberIdx={selectedMember}
            tasks={tasks}
            completion={completions[selectedMember] || Array(tasks.length).fill(false)}
            onToggle={(taskIdx) => toggleTask(selectedMember, taskIdx)}
            onBack={() => { setView('home'); setSelectedMember(null); }}
          />
        )}

        {view === 'admin' && (
          <AdminView
            members={members}
            tasks={tasks}
            completions={completions}
            onReset={resetDay}
          />
        )}

        {view === 'settings' && (
          <SettingsView
            members={members}
            tasks={tasks}
            onSave={saveConfig}
          />
        )}
      </div>
    </div>
  );
}

function NavButton({ active, onClick, icon, label, locked }) {
  return (
    <button
      onClick={onClick}
      className="relative flex items-center justify-center gap-2 px-3 py-3 rounded-xl font-bold text-sm md:text-base transition-all"
      style={{
        background: active ? 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)' : 'transparent',
        color: active ? 'white' : '#f9c5d1',
        boxShadow: active ? '0 10px 25px -10px rgba(236, 72, 153, 0.5)' : 'none',
      }}
    >
      {icon}
      <span>{label}</span>
      {locked && !active && (
        <Lock size={11} className="opacity-60" />
      )}
    </button>
  );
}

function PasswordPrompt({ onSubmit, onCancel }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  function handleSubmit() {
    const success = onSubmit(password);
    if (!success) {
      setError(true);
      setPassword('');
      setTimeout(() => setError(false), 2000);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-sm rounded-3xl p-6" style={{
        background: 'linear-gradient(135deg, #3d2438 0%, #2d1b2e 100%)',
        border: '1px solid rgba(236, 72, 153, 0.3)',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
      }}>
        <div className="flex flex-col items-center mb-5">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{
            background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
            boxShadow: '0 10px 30px -10px rgba(236, 72, 153, 0.5)',
          }}>
            <Lock className="text-white" size={28} />
          </div>
          <h3 className="text-xl font-black text-white mb-1">منطقة المشرف</h3>
          <p className="text-pink-200/60 text-sm text-center">ادخل كلمة المرور للمتابعة</p>
        </div>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="كلمة المرور"
          autoFocus
          className="w-full px-4 py-3 rounded-xl text-white text-center mb-3"
          style={{
            background: 'rgba(45, 27, 46, 0.85)',
            border: error ? '1px solid #f43f5e' : '1px solid rgba(236, 72, 153, 0.3)',
            fontFamily: 'inherit',
          }}
        />

        {error && (
          <p className="text-rose-300 text-xs text-center mb-3">كلمة المرور غير صحيحة</p>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onCancel}
            className="py-3 rounded-xl font-bold text-pink-200 transition-all"
            style={{ background: 'rgba(45, 27, 46, 0.6)', border: '1px solid rgba(236, 72, 153, 0.2)' }}
          >
            إلغاء
          </button>
          <button
            onClick={handleSubmit}
            className="py-3 rounded-xl font-bold text-white transition-all"
            style={{
              background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
              boxShadow: '0 10px 25px -10px rgba(236, 72, 153, 0.5)',
            }}
          >
            دخول
          </button>
        </div>
      </div>
    </div>
  );
}

function MembersGrid({ members, completions, tasksCount, onSelect }) {
  return (
    <div>
      <div className="mb-4 px-2">
        <h2 className="text-xl font-bold text-white mb-1">اختر اسمك للبدء</h2>
        <p className="text-pink-200/60 text-sm">اضغط على اسمك لتسجيل المهام المكتملة</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {members.map((name, idx) => {
          const done = (completions[idx] || []).filter(Boolean).length;
          const percentage = tasksCount > 0 ? (done / tasksCount) * 100 : 0;
          const isComplete = done === tasksCount && tasksCount > 0;
          const notStarted = done === 0;

          return (
            <button
              key={idx}
              onClick={() => onSelect(idx)}
              className="group relative p-4 rounded-2xl text-right transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: isComplete
                  ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.1) 100%)'
                  : 'rgba(61, 36, 56, 0.55)',
                backdropFilter: 'blur(20px)',
                border: isComplete
                  ? '1px solid rgba(16, 185, 129, 0.4)'
                  : '1px solid rgba(236, 72, 153, 0.18)',
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{
                  background: isComplete
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                    : notStarted
                    ? 'linear-gradient(135deg, #6b5b73 0%, #4a3d52 100%)'
                    : 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
                }}>
                  {idx + 1}
                </div>
                {isComplete && (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-emerald-500/20 border border-emerald-500/40">
                    <Award size={16} className="text-emerald-300" />
                  </div>
                )}
              </div>

              <h3 className="font-bold text-white text-base mb-2">{name}</h3>

              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-pink-200/70">{done} من {tasksCount} مهام</span>
                <span className="text-xs font-bold" style={{ color: isComplete ? '#34d399' : '#f9c5d1' }}>
                  {Math.round(percentage)}%
                </span>
              </div>

              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${percentage}%`,
                    background: isComplete
                      ? 'linear-gradient(90deg, #10b981, #34d399)'
                      : 'linear-gradient(90deg, #ec4899, #f9a8c4)',
                  }}
                ></div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MemberView({ memberName, memberIdx, tasks, completion, onToggle, onBack }) {
  const done = completion.filter(Boolean).length;
  const percentage = tasks.length > 0 ? (done / tasks.length) * 100 : 0;
  const allDone = done === tasks.length;

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-2 text-pink-200/70 hover:text-pink-200 transition-colors text-sm"
      >
        <ChevronRight size={16} />
        <span>العودة لقائمة الأفراد</span>
      </button>

      <div className="rounded-3xl overflow-hidden mb-6" style={{
        background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.18) 0%, rgba(217, 119, 6, 0.05) 100%)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(236, 72, 153, 0.28)',
      }}>
        <div className="p-6 md:p-8">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div>
              <p className="text-pink-200/60 text-sm mb-1">مرحباً</p>
              <h2 className="text-2xl md:text-3xl font-black text-white">{memberName}</h2>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-black" style={{ color: allDone ? '#34d399' : '#f9a8c4' }}>
                {Math.round(percentage)}%
              </div>
              <div className="text-xs text-pink-200/70 mt-1">{done} / {tasks.length}</div>
            </div>
          </div>

          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${percentage}%`,
                background: allDone
                  ? 'linear-gradient(90deg, #10b981, #34d399, #6ee7b7)'
                  : 'linear-gradient(90deg, #ec4899, #f9a8c4, #f9c5d1)',
              }}
            ></div>
          </div>

          {allDone && (
            <div className="mt-4 flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30">
              <Award className="text-emerald-300" size={20} />
              <span className="text-emerald-200 font-bold">أحسنت! أكملت جميع المهام اليوم</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {tasks.map((task, idx) => {
          const isDone = completion[idx];
          return (
            <button
              key={idx}
              onClick={() => onToggle(idx)}
              className="w-full p-4 md:p-5 rounded-2xl flex items-center gap-4 text-right transition-all hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: isDone
                  ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.1) 100%)'
                  : 'rgba(61, 36, 56, 0.55)',
                backdropFilter: 'blur(20px)',
                border: isDone
                  ? '1px solid rgba(16, 185, 129, 0.5)'
                  : '1px solid rgba(236, 72, 153, 0.18)',
              }}
            >
              <div
                className="w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all"
                style={{
                  background: isDone
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                    : 'rgba(236, 72, 153, 0.12)',
                  border: isDone ? 'none' : '2px dashed rgba(236, 72, 153, 0.4)',
                  boxShadow: isDone ? '0 10px 25px -10px rgba(16, 185, 129, 0.5)' : 'none',
                }}
              >
                {isDone ? (
                  <Check className="text-white" size={26} strokeWidth={3} />
                ) : (
                  <span className="text-pink-300 font-black text-xl">{idx + 1}</span>
                )}
              </div>

              <div className="flex-1">
                <h4 className={`font-bold text-base md:text-lg ${isDone ? 'text-emerald-100' : 'text-white'}`}>
                  {task}
                </h4>
                <p className={`text-xs md:text-sm mt-1 ${isDone ? 'text-emerald-300/80' : 'text-pink-200/50'}`}>
                  {isDone ? '✓ تم الإكمال - اضغط للإلغاء' : 'اضغط لتسجيل الإكمال'}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AdminView({ members, tasks, completions, onReset }) {
  const totalTasks = members.length * tasks.length;
  const completedTotal = Object.values(completions).reduce(
    (sum, arr) => sum + (arr || []).filter(Boolean).length,
    0
  );
  const overallPercentage = totalTasks > 0 ? (completedTotal / totalTasks) * 100 : 0;

  const fullyComplete = members.filter((_, idx) => {
    const c = completions[idx] || [];
    return c.filter(Boolean).length === tasks.length;
  }).length;

  const notStarted = members.filter((_, idx) => {
    const c = completions[idx] || [];
    return c.filter(Boolean).length === 0;
  }).length;

  // Per-task statistics
  const taskStats = tasks.map((_, taskIdx) => {
    const count = members.reduce((sum, _, memberIdx) => {
      const c = completions[memberIdx] || [];
      return sum + (c[taskIdx] ? 1 : 0);
    }, 0);
    return count;
  });

  return (
    <div>
      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard
          icon={<TrendingUp size={20} />}
          label="نسبة الإنجاز"
          value={`${Math.round(overallPercentage)}%`}
          color="amber"
        />
        <StatCard
          icon={<Check size={20} />}
          label="مكتمل بالكامل"
          value={`${fullyComplete} / ${members.length}`}
          color="emerald"
        />
        <StatCard
          icon={<AlertCircle size={20} />}
          label="لم يبدأ"
          value={`${notStarted} / ${members.length}`}
          color="rose"
        />
        <StatCard
          icon={<Award size={20} />}
          label="إجمالي المهام"
          value={`${completedTotal} / ${totalTasks}`}
          color="cyan"
        />
      </div>

      {/* Task-level breakdown */}
      <div className="rounded-2xl p-5 mb-6" style={{
        background: 'rgba(61, 36, 56, 0.55)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(236, 72, 153, 0.18)',
      }}>
        <h3 className="font-bold text-white text-lg mb-4">إحصائيات المهام</h3>
        <div className="space-y-3">
          {tasks.map((task, idx) => {
            const count = taskStats[idx];
            const pct = members.length > 0 ? (count / members.length) * 100 : 0;
            return (
              <div key={idx}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-white text-sm font-medium">{task}</span>
                  <span className="text-pink-200/70 text-xs font-bold">{count} / {members.length}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      background: 'linear-gradient(90deg, #ec4899, #f9a8c4)',
                    }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Member-by-member matrix */}
      <div className="rounded-2xl p-5 mb-6" style={{
        background: 'rgba(61, 36, 56, 0.55)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(236, 72, 153, 0.18)',
      }}>
        <h3 className="font-bold text-white text-lg mb-4">جدول المتابعة التفصيلي</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-right p-2 text-pink-200/70 text-xs font-bold">الاسم</th>
                {tasks.map((_, idx) => (
                  <th key={idx} className="p-2 text-pink-200/70 text-xs font-bold">م{idx + 1}</th>
                ))}
                <th className="p-2 text-pink-200/70 text-xs font-bold">النسبة</th>
              </tr>
            </thead>
            <tbody>
              {members.map((name, idx) => {
                const c = completions[idx] || [];
                const done = c.filter(Boolean).length;
                const pct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;
                return (
                  <tr key={idx} style={{ borderTop: '1px solid rgba(236, 72, 153, 0.12)' }}>
                    <td className="p-2 text-white text-sm font-medium">{name}</td>
                    {tasks.map((_, taskIdx) => (
                      <td key={taskIdx} className="p-2 text-center">
                        {c[taskIdx] ? (
                          <div className="inline-flex w-7 h-7 rounded-lg items-center justify-center" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                            <Check size={14} className="text-white" strokeWidth={3} />
                          </div>
                        ) : (
                          <div className="inline-flex w-7 h-7 rounded-lg items-center justify-center" style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
                            <X size={14} className="text-rose-300" strokeWidth={3} />
                          </div>
                        )}
                      </td>
                    ))}
                    <td className="p-2 text-center">
                      <span className="text-sm font-bold" style={{ color: pct === 100 ? '#34d399' : pct === 0 ? '#fb7185' : '#f9a8c4' }}>
                        {pct}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reset button */}
      <button
        onClick={onReset}
        className="w-full p-4 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all hover:scale-[1.01] active:scale-[0.99]"
        style={{
          background: 'rgba(244, 63, 94, 0.15)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          color: '#fda4af',
        }}
      >
        <RefreshCw size={18} />
        <span>إعادة تعيين بيانات اليوم</span>
      </button>
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  const colors = {
    amber: { bg: 'rgba(236, 72, 153, 0.18)', border: 'rgba(236, 72, 153, 0.32)', text: '#f9c5d1' },
    emerald: { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)', text: '#6ee7b7' },
    rose: { bg: 'rgba(244, 63, 94, 0.15)', border: 'rgba(244, 63, 94, 0.3)', text: '#fda4af' },
    cyan: { bg: 'rgba(240, 201, 135, 0.18)', border: 'rgba(240, 201, 135, 0.35)', text: '#f5d491' },
  };
  const c = colors[color];

  return (
    <div className="p-4 rounded-2xl" style={{
      background: c.bg,
      backdropFilter: 'blur(20px)',
      border: `1px solid ${c.border}`,
    }}>
      <div className="flex items-center gap-2 mb-2" style={{ color: c.text }}>
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-2xl font-black" style={{ color: c.text }}>{value}</div>
    </div>
  );
}

function SettingsView({ members, tasks, onSave }) {
  const [editMembers, setEditMembers] = useState([...members]);
  const [editTasks, setEditTasks] = useState([...tasks]);
  const [savedMsg, setSavedMsg] = useState(false);

  function handleSave() {
    const cleanMembers = editMembers.map(m => m.trim()).filter(m => m.length > 0);
    const cleanTasks = editTasks.map(t => t.trim()).filter(t => t.length > 0);
    if (cleanMembers.length === 0) { alert('يجب إضافة فرد واحد على الأقل'); return; }
    if (cleanTasks.length === 0) { alert('يجب إضافة مهمة واحدة على الأقل'); return; }
    if (cleanTasks.length > 10) { alert('الحد الأقصى 10 مهام'); return; }
    onSave(cleanMembers, cleanTasks);
    setEditMembers(cleanMembers);
    setEditTasks(cleanTasks);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
  }

  function updateMember(idx, val) {
    const newArr = [...editMembers]; newArr[idx] = val; setEditMembers(newArr);
  }
  function updateTask(idx, val) {
    const newArr = [...editTasks]; newArr[idx] = val; setEditTasks(newArr);
  }
  function addMember() {
    setEditMembers([...editMembers, `الفرد ${editMembers.length + 1}`]);
  }
  function removeMember(idx) {
    if (editMembers.length <= 1) { alert('يجب أن يبقى فرد واحد على الأقل'); return; }
    if (!confirm(`هل تريد حذف "${editMembers[idx]}"؟`)) return;
    setEditMembers(editMembers.filter((_, i) => i !== idx));
  }
  function addTask() {
    if (editTasks.length >= 10) { alert('الحد الأقصى 10 مهام'); return; }
    setEditTasks([...editTasks, `المهمة ${editTasks.length + 1}`]);
  }
  function removeTask(idx) {
    if (editTasks.length <= 1) { alert('يجب أن تبقى مهمة واحدة على الأقل'); return; }
    if (!confirm(`هل تريد حذف "${editTasks[idx]}"؟`)) return;
    setEditTasks(editTasks.filter((_, i) => i !== idx));
  }

  return (
    <div>
      <div className="mb-6 p-4 rounded-2xl" style={{
        background: 'rgba(236, 72, 153, 0.12)',
        border: '1px solid rgba(236, 72, 153, 0.28)',
      }}>
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-pink-300 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-pink-100 font-bold text-sm mb-1">ملاحظة هامة</p>
            <p className="text-pink-200/70 text-xs leading-relaxed">
              يمكنك إضافة أو حذف الأفراد والمهام، وتعديل وصفها. التعديلات تنطبق على الجميع فوراً عند الضغط على "حفظ التعديلات". الحد الأقصى 10 مهام.
            </p>
          </div>
        </div>
      </div>

      {/* Tasks */}
      <div className="rounded-2xl p-5 mb-5" style={{
        background: 'rgba(61, 36, 56, 0.55)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(236, 72, 153, 0.18)',
      }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-white text-lg flex items-center gap-2">
            <Edit3 size={18} className="text-pink-300" />
            <span>المهام ({editTasks.length})</span>
          </h3>
          <button
            onClick={addTask}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)' }}
          >
            <Plus size={14} /><span>إضافة</span>
          </button>
        </div>
        <div className="space-y-2">
          {editTasks.map((task, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0" style={{
                background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
              }}>
                {idx + 1}
              </div>
              <input
                type="text"
                value={task}
                onChange={(e) => updateTask(idx, e.target.value)}
                className="flex-1 px-3 py-2.5 rounded-xl text-white text-right min-w-0"
                style={{
                  background: 'rgba(45, 27, 46, 0.85)',
                  border: '1px solid rgba(236, 72, 153, 0.22)',
                  fontFamily: 'inherit',
                }}
                placeholder={`وصف المهمة ${idx + 1}`}
              />
              <button
                onClick={() => removeTask(idx)}
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)' }}
                aria-label="حذف"
              >
                <Trash2 size={16} className="text-rose-300" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Members */}
      <div className="rounded-2xl p-5 mb-5" style={{
        background: 'rgba(61, 36, 56, 0.55)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(236, 72, 153, 0.18)',
      }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-white text-lg flex items-center gap-2">
            <Users size={18} className="text-pink-300" />
            <span>الأفراد ({editMembers.length})</span>
          </h3>
          <button
            onClick={addMember}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)' }}
          >
            <Plus size={14} /><span>إضافة</span>
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {editMembers.map((name, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold flex-shrink-0 text-sm" style={{
                background: 'rgba(236, 72, 153, 0.18)',
                border: '1px solid rgba(236, 72, 153, 0.32)',
                color: '#f9c5d1',
              }}>
                {idx + 1}
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => updateMember(idx, e.target.value)}
                className="flex-1 px-3 py-2.5 rounded-xl text-white text-right min-w-0"
                style={{
                  background: 'rgba(45, 27, 46, 0.85)',
                  border: '1px solid rgba(236, 72, 153, 0.22)',
                  fontFamily: 'inherit',
                }}
              />
              <button
                onClick={() => removeMember(idx)}
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)' }}
                aria-label="حذف"
              >
                <Trash2 size={16} className="text-rose-300" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        className="w-full p-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-white transition-all hover:scale-[1.01] active:scale-[0.99]"
        style={{
          background: savedMsg
            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
            : 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
          boxShadow: '0 10px 25px -10px rgba(236, 72, 153, 0.45)',
        }}
      >
        {savedMsg ? (
          <>
            <Check size={18} />
            <span>تم الحفظ بنجاح</span>
          </>
        ) : (
          <>
            <Save size={18} />
            <span>حفظ التعديلات</span>
          </>
        )}
      </button>
    </div>
  );
}
