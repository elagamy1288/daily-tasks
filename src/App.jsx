import React, { useState, useEffect } from 'react';
import { Check, Users, Settings, TrendingUp, Award, AlertCircle, Edit3, Save, X, RefreshCw, Calendar, ChevronRight, ChevronLeft, Sparkles, Plus, Trash2, Lock, BarChart2 } from 'lucide-react';
import { db } from './firebase';
import { doc, onSnapshot, setDoc, collection, query, where, getDocs, documentId } from 'firebase/firestore';

const formatDateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const getToday = () => formatDateKey(new Date());
const getYesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatDateKey(d);
};

const formatDisplayDate = (dateKey) => {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};

const ADMIN_PASSWORD = "quraan";
const DEFAULT_MEMBERS = Array.from({ length: 16 }, (_, i) => `الفرد ${i + 1}`);
const DEFAULT_TASKS = ['المهمة الأولى', 'المهمة الثانية', 'المهمة الثالثة', 'المهمة الرابعة', 'المهمة الخامسة'];

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
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [reportMonth, setReportMonth] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 });
  const [monthlyData, setMonthlyData] = useState({});
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [detailMember, setDetailMember] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'app', 'config'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.members) setMembers(data.members);
        if (data.tasks) setTasks(data.tasks);
      }
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  useEffect(() => {
    setCompletions({});
    const unsub = onSnapshot(doc(db, 'completions', selectedDate), (snap) => {
      setCompletions(snap.exists() ? (snap.data().data || {}) : {});
    }, () => {});
    return () => unsub();
  }, [selectedDate]);

  const fetchMonthlyData = async (year, month) => {
    setMonthlyLoading(true);
    try {
      const pad = (n) => String(n).padStart(2, '0');
      const start = `${year}-${pad(month)}-01`;
      const end = `${year}-${pad(month)}-31`;
      const q = query(collection(db, 'completions'), where(documentId(), '>=', start), where(documentId(), '<=', end));
      const snap = await getDocs(q);
      const data = {};
      snap.forEach(d => { const docData = d.data(); data[d.id] = { completions: docData.data || {}, tasksCount: docData.tasksCount || null }; });
      setMonthlyData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setMonthlyLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'report' || view === 'memberReport') {
      fetchMonthlyData(reportMonth.year, reportMonth.month);
    }
  }, [view, reportMonth]);

  async function saveCompletions(newCompletions) {
    setSaving(true);
    try {
      await setDoc(doc(db, 'completions', selectedDate), { data: newCompletions, tasksCount: tasks.length, updatedAt: new Date().toISOString() });
      setLastSaved(new Date());
    } catch (e) {
      alert('حدث خطأ في الحفظ. تأكد من الاتصال بالإنترنت.');
    } finally {
      setTimeout(() => setSaving(false), 400);
    }
  }

  async function saveConfig(newMembers, newTasks) {
    try {
      await setDoc(doc(db, 'app', 'config'), { members: newMembers, tasks: newTasks, updatedAt: new Date().toISOString() });
    } catch (e) {
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
    if (!confirm('هل أنت متأكد من مسح كل علامات هذا اليوم؟')) return;
    setCompletions({});
    await saveCompletions({});
  }

  function handlePasswordSubmit(password) {
    if (password === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setShowPasswordPrompt(false);
      setView('settings');
      return true;
    }
    return false;
  }

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

  const showDateBar = view === 'home' || view === 'member' || view === 'admin';

  return (
    <div dir="rtl" style={{ fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif", background: 'linear-gradient(135deg, #2d1b2e 0%, #3d2438 50%, #2d1b2e 100%)', minHeight: '100vh' }}>
      {showPasswordPrompt && (
        <PasswordPrompt onSubmit={handlePasswordSubmit} onCancel={() => setShowPasswordPrompt(false)} />
      )}

      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #ec4899 0%, transparent 70%)' }}></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #f0c987 0%, transparent 70%)' }}></div>
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)', boxShadow: '0 10px 30px -10px rgba(236, 72, 153, 0.45)' }}>
                <Sparkles className="text-white" size={24} />
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white">الورد اليومي</h1>
            </div>
            <div className="flex items-center gap-2">
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

          {/* Date selector */}
          {showDateBar && (
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setSelectedDate(getToday())}
                className="px-4 py-2 rounded-xl font-bold text-sm transition-all"
                style={{
                  background: selectedDate === getToday() ? 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)' : 'rgba(61, 36, 56, 0.55)',
                  color: selectedDate === getToday() ? 'white' : '#f9c5d1',
                  border: '1px solid rgba(236, 72, 153, 0.3)',
                }}
              >
                اليوم
              </button>
              <button
                onClick={() => setSelectedDate(getYesterday())}
                className="px-4 py-2 rounded-xl font-bold text-sm transition-all"
                style={{
                  background: selectedDate === getYesterday() ? 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)' : 'rgba(61, 36, 56, 0.55)',
                  color: selectedDate === getYesterday() ? 'white' : '#f9c5d1',
                  border: '1px solid rgba(236, 72, 153, 0.3)',
                }}
              >
                أمس
              </button>
              <span className="text-pink-200/60 text-sm flex items-center gap-1">
                <Calendar size={13} />
                {formatDisplayDate(selectedDate)}
              </span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="grid grid-cols-4 gap-1.5 mb-8 p-1.5 rounded-2xl" style={{ background: 'rgba(45, 27, 46, 0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(236, 72, 153, 0.18)' }}>
          <NavButton active={view === 'home' || view === 'member'} onClick={() => { setView('home'); setSelectedMember(null); }} icon={<Users size={16} />} label="الأفراد" />
          <NavButton active={view === 'admin'} onClick={() => setView('admin')} icon={<TrendingUp size={16} />} label="المشرف" />
          <NavButton active={view === 'report' || view === 'memberReport'} onClick={() => setView('report')} icon={<BarChart2 size={16} />} label="التقرير" />
          <NavButton active={view === 'settings'} onClick={() => isAdmin ? setView('settings') : setShowPasswordPrompt(true)} icon={<Settings size={16} />} label="الإعدادات" locked={!isAdmin} />
        </div>

        {/* Views */}
        {view === 'home' && (
          <MembersGrid members={members} completions={completions} tasksCount={tasks.length} onSelect={(idx) => { setSelectedMember(idx); setView('member'); }} />
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
          <AdminView members={members} tasks={tasks} completions={completions} onReset={resetDay} selectedDate={selectedDate} />
        )}

        {view === 'report' && (
          <ReportView
            members={members}
            tasks={tasks}
            monthlyData={monthlyData}
            monthlyLoading={monthlyLoading}
            reportMonth={reportMonth}
            onMonthChange={(m) => setReportMonth(m)}
            onMemberDetail={(idx) => { setDetailMember(idx); setView('memberReport'); }}
            onRefresh={() => fetchMonthlyData(reportMonth.year, reportMonth.month)}
          />
        )}

        {view === 'memberReport' && detailMember !== null && (
          <MemberReportView
            memberName={members[detailMember]}
            memberIdx={detailMember}
            tasks={tasks}
            monthlyData={monthlyData}
            reportMonth={reportMonth}
            onBack={() => setView('report')}
          />
        )}

        {view === 'settings' && (
          <SettingsView members={members} tasks={tasks} onSave={saveConfig} />
        )}
      </div>
    </div>
  );
}

function NavButton({ active, onClick, icon, label, locked }) {
  return (
    <button
      onClick={onClick}
      className="relative flex items-center justify-center gap-1.5 px-2 py-3 rounded-xl font-bold text-xs md:text-sm transition-all"
      style={{
        background: active ? 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)' : 'transparent',
        color: active ? 'white' : '#f9c5d1',
        boxShadow: active ? '0 10px 25px -10px rgba(236, 72, 153, 0.5)' : 'none',
      }}
    >
      {icon}
      <span>{label}</span>
      {locked && !active && <Lock size={10} className="opacity-60" />}
    </button>
  );
}

function PasswordPrompt({ onSubmit, onCancel }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  function handleSubmit() {
    if (!onSubmit(password)) {
      setError(true);
      setPassword('');
      setTimeout(() => setError(false), 2000);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-sm rounded-3xl p-6" style={{ background: 'linear-gradient(135deg, #3d2438 0%, #2d1b2e 100%)', border: '1px solid rgba(236, 72, 153, 0.3)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
        <div className="flex flex-col items-center mb-5">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)', boxShadow: '0 10px 30px -10px rgba(236, 72, 153, 0.5)' }}>
            <Lock className="text-white" size={28} />
          </div>
          <h3 className="text-xl font-black text-white mb-1">الإعدادات</h3>
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
          style={{ background: 'rgba(45, 27, 46, 0.85)', border: error ? '1px solid #f43f5e' : '1px solid rgba(236, 72, 153, 0.3)', fontFamily: 'inherit' }}
        />
        {error && <p className="text-rose-300 text-xs text-center mb-3">كلمة المرور غير صحيحة</p>}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onCancel} className="py-3 rounded-xl font-bold text-pink-200" style={{ background: 'rgba(45, 27, 46, 0.6)', border: '1px solid rgba(236, 72, 153, 0.2)' }}>إلغاء</button>
          <button onClick={handleSubmit} className="py-3 rounded-xl font-bold text-white" style={{ background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)' }}>دخول</button>
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
                background: isComplete ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.1) 100%)' : 'rgba(61, 36, 56, 0.55)',
                backdropFilter: 'blur(20px)',
                border: isComplete ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(236, 72, 153, 0.18)',
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ background: isComplete ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : notStarted ? 'linear-gradient(135deg, #6b5b73 0%, #4a3d52 100%)' : 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)' }}>
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
                <span className="text-xs font-bold" style={{ color: isComplete ? '#34d399' : '#f9c5d1' }}>{Math.round(percentage)}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percentage}%`, background: isComplete ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #ec4899, #f9a8c4)' }}></div>
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
      <button onClick={onBack} className="mb-4 flex items-center gap-2 text-pink-200/70 hover:text-pink-200 transition-colors text-sm">
        <ChevronRight size={16} />
        <span>العودة لقائمة الأفراد</span>
      </button>
      <div className="rounded-3xl overflow-hidden mb-6" style={{ background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.18) 0%, rgba(217, 119, 6, 0.05) 100%)', backdropFilter: 'blur(20px)', border: '1px solid rgba(236, 72, 153, 0.28)' }}>
        <div className="p-6 md:p-8">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div>
              <p className="text-pink-200/60 text-sm mb-1">مرحباً</p>
              <h2 className="text-2xl md:text-3xl font-black text-white">{memberName}</h2>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-black" style={{ color: allDone ? '#34d399' : '#f9a8c4' }}>{Math.round(percentage)}%</div>
              <div className="text-xs text-pink-200/70 mt-1">{done} / {tasks.length}</div>
            </div>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${percentage}%`, background: allDone ? 'linear-gradient(90deg, #10b981, #34d399, #6ee7b7)' : 'linear-gradient(90deg, #ec4899, #f9a8c4, #f9c5d1)' }}></div>
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
            <button key={idx} onClick={() => onToggle(idx)} className="w-full p-4 md:p-5 rounded-2xl flex items-center gap-4 text-right transition-all hover:scale-[1.01] active:scale-[0.99]" style={{ background: isDone ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.1) 100%)' : 'rgba(61, 36, 56, 0.55)', backdropFilter: 'blur(20px)', border: isDone ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(236, 72, 153, 0.18)' }}>
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all" style={{ background: isDone ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'rgba(236, 72, 153, 0.12)', border: isDone ? 'none' : '2px dashed rgba(236, 72, 153, 0.4)', boxShadow: isDone ? '0 10px 25px -10px rgba(16, 185, 129, 0.5)' : 'none' }}>
                {isDone ? <Check className="text-white" size={26} strokeWidth={3} /> : <span className="text-pink-300 font-black text-xl">{idx + 1}</span>}
              </div>
              <div className="flex-1">
                <h4 className={`font-bold text-base md:text-lg ${isDone ? 'text-emerald-100' : 'text-white'}`}>{task}</h4>
                <p className={`text-xs md:text-sm mt-1 ${isDone ? 'text-emerald-300/80' : 'text-pink-200/50'}`}>{isDone ? '✓ تم الإكمال — اضغط للإلغاء' : 'اضغط لتسجيل الإكمال'}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AdminView({ members, tasks, completions, onReset, selectedDate }) {
  const totalTasks = members.length * tasks.length;
  const completedTotal = Object.values(completions).reduce((sum, arr) => sum + (arr || []).filter(Boolean).length, 0);
  const overallPercentage = totalTasks > 0 ? (completedTotal / totalTasks) * 100 : 0;
  const fullyComplete = members.filter((_, idx) => (completions[idx] || []).filter(Boolean).length === tasks.length).length;
  const notStarted = members.filter((_, idx) => (completions[idx] || []).filter(Boolean).length === 0).length;
  const taskStats = tasks.map((_, taskIdx) => members.reduce((sum, _, memberIdx) => sum + ((completions[memberIdx] || [])[taskIdx] ? 1 : 0), 0));

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon={<TrendingUp size={20} />} label="نسبة الإنجاز" value={`${Math.round(overallPercentage)}%`} color="amber" />
        <StatCard icon={<Check size={20} />} label="مكتمل بالكامل" value={`${fullyComplete} / ${members.length}`} color="emerald" />
        <StatCard icon={<AlertCircle size={20} />} label="لم يبدأ" value={`${notStarted} / ${members.length}`} color="rose" />
        <StatCard icon={<Award size={20} />} label="إجمالي المهام" value={`${completedTotal} / ${totalTasks}`} color="cyan" />
      </div>

      <div className="rounded-2xl p-5 mb-6" style={{ background: 'rgba(61, 36, 56, 0.55)', backdropFilter: 'blur(20px)', border: '1px solid rgba(236, 72, 153, 0.18)' }}>
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
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #ec4899, #f9a8c4)' }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl p-5 mb-6" style={{ background: 'rgba(61, 36, 56, 0.55)', backdropFilter: 'blur(20px)', border: '1px solid rgba(236, 72, 153, 0.18)' }}>
        <h3 className="font-bold text-white text-lg mb-4">جدول المتابعة التفصيلي</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-right p-2 text-pink-200/70 text-xs font-bold">الاسم</th>
                {tasks.map((_, idx) => <th key={idx} className="p-2 text-pink-200/70 text-xs font-bold">م{idx + 1}</th>)}
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
                        {c[taskIdx]
                          ? <div className="inline-flex w-7 h-7 rounded-lg items-center justify-center" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}><Check size={14} className="text-white" strokeWidth={3} /></div>
                          : <div className="inline-flex w-7 h-7 rounded-lg items-center justify-center" style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)' }}><X size={14} className="text-rose-300" strokeWidth={3} /></div>
                        }
                      </td>
                    ))}
                    <td className="p-2 text-center"><span className="text-sm font-bold" style={{ color: pct === 100 ? '#34d399' : pct === 0 ? '#fb7185' : '#f9a8c4' }}>{pct}%</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <button onClick={onReset} className="w-full p-4 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all hover:scale-[1.01] active:scale-[0.99]" style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#fda4af' }}>
        <RefreshCw size={18} />
        <span>إعادة تعيين بيانات هذا اليوم</span>
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
    <div className="p-4 rounded-2xl" style={{ background: c.bg, backdropFilter: 'blur(20px)', border: `1px solid ${c.border}` }}>
      <div className="flex items-center gap-2 mb-2" style={{ color: c.text }}>{icon}<span className="text-xs font-medium">{label}</span></div>
      <div className="text-2xl font-black" style={{ color: c.text }}>{value}</div>
    </div>
  );
}

// ─── Monthly Report ───────────────────────────────────────────────────────────

function getDaysInReportMonth(year, month) {
  const today = new Date();
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;
  const lastDay = isCurrentMonth ? today.getDate() : new Date(year, month, 0).getDate();
  const days = [];
  for (let d = 1; d <= lastDay; d++) {
    days.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  return days;
}

function getMemberStats(memberIdx, days, monthlyData, defaultTasksCount) {
  let complete = 0, incomplete = 0, absent = 0;
  days.forEach(dateKey => {
    const dayData = monthlyData[dateKey] || {};
    const c = (dayData.completions || {})[memberIdx] || [];
    const tasksCount = dayData.tasksCount || defaultTasksCount;
    const done = c.filter(Boolean).length;
    if (done === tasksCount && tasksCount > 0) complete++;
    else if (done > 0) incomplete++;
    else absent++;
  });
  return { complete, incomplete, absent };
}

function ReportView({ members, tasks, monthlyData, monthlyLoading, reportMonth, onMonthChange, onMemberDetail, onRefresh }) {
  const today = new Date();
  const isCurrentMonth = reportMonth.year === today.getFullYear() && reportMonth.month === today.getMonth() + 1;
  const days = getDaysInReportMonth(reportMonth.year, reportMonth.month);
  const monthName = new Date(reportMonth.year, reportMonth.month - 1, 1).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    const d = new Date(reportMonth.year, reportMonth.month - 2, 1);
    onMonthChange({ year: d.getFullYear(), month: d.getMonth() + 1 });
  };
  const nextMonth = () => {
    if (isCurrentMonth) return;
    const d = new Date(reportMonth.year, reportMonth.month, 1);
    onMonthChange({ year: d.getFullYear(), month: d.getMonth() + 1 });
  };

  return (
    <div>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-6 p-4 rounded-2xl" style={{ background: 'rgba(61, 36, 56, 0.55)', border: '1px solid rgba(236, 72, 153, 0.18)' }}>
        <button onClick={prevMonth} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(236, 72, 153, 0.15)', border: '1px solid rgba(236, 72, 153, 0.3)', color: '#f9c5d1' }}>
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <h2 className="text-xl font-black text-white">{monthName}</h2>
          <p className="text-pink-200/60 text-xs mt-1">{days.length} يوم مسجل</p>
        </div>
        <button onClick={nextMonth} disabled={isCurrentMonth} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: isCurrentMonth ? 'rgba(61, 36, 56, 0.3)' : 'rgba(236, 72, 153, 0.15)', border: '1px solid rgba(236, 72, 153, 0.3)', color: isCurrentMonth ? '#4a3d52' : '#f9c5d1' }}>
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 px-1 flex-wrap">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-400"></div><span className="text-pink-200/70 text-xs">مكتمل (كل المهام)</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-400"></div><span className="text-pink-200/70 text-xs">ناقص (بعض المهام)</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-rose-500"></div><span className="text-pink-200/70 text-xs">غائب (لا مهام)</span></div>
      </div>

      {monthlyLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-pink-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(61, 36, 56, 0.55)', border: '1px solid rgba(236, 72, 153, 0.18)' }}>
          <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(236, 72, 153, 0.18)' }}>
            <h3 className="text-white font-bold">التقرير الشهري</h3>
            <button onClick={onRefresh} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-pink-200" style={{ background: 'rgba(236, 72, 153, 0.12)', border: '1px solid rgba(236, 72, 153, 0.2)' }}>
              <RefreshCw size={12} />تحديث
            </button>
          </div>

          {/* Header row */}
          <div className="px-4 py-2 flex items-center gap-3 text-xs font-bold text-pink-200/60 border-b" style={{ borderColor: 'rgba(236, 72, 153, 0.12)' }}>
            <div className="w-8 flex-shrink-0"></div>
            <div className="flex-1 min-w-0">الاسم</div>
            <div className="w-14 text-center text-emerald-400">مكتمل</div>
            <div className="w-14 text-center text-amber-400">ناقص</div>
            <div className="w-14 text-center text-rose-400">غائب</div>
            <div className="w-4 flex-shrink-0"></div>
          </div>

          {members.map((name, idx) => {
            const stats = getMemberStats(idx, days, monthlyData, tasks.length);
            return (
              <button key={idx} onClick={() => onMemberDetail(idx)} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-pink-500/5 transition-all border-b text-right" style={{ borderColor: 'rgba(236, 72, 153, 0.08)' }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'rgba(236, 72, 153, 0.18)', color: '#f9c5d1' }}>{idx + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm truncate">{name}</p>
                  {/* Mini sparkline */}
                  <div className="flex gap-px mt-1.5 overflow-hidden">
                    {days.map((dateKey, dIdx) => {
                      const c = ((monthlyData[dateKey] || {}).completions || {})[idx] || [];
                      const done = c.filter(Boolean).length;
                      const bg = done === tasks.length && tasks.length > 0 ? '#10b981' : done > 0 ? '#f59e0b' : '#f43f5e';
                      return <div key={dIdx} style={{ width: 4, height: 12, borderRadius: 2, background: bg, opacity: 0.85, flexShrink: 0 }}></div>;
                    })}
                  </div>
                </div>
                <div className="w-14 text-center flex-shrink-0"><span className="text-emerald-300 font-black text-sm">{stats.complete}</span></div>
                <div className="w-14 text-center flex-shrink-0"><span className="text-amber-300 font-black text-sm">{stats.incomplete}</span></div>
                <div className="w-14 text-center flex-shrink-0"><span className="text-rose-300 font-black text-sm">{stats.absent}</span></div>
                <ChevronLeft size={14} className="w-4 text-pink-300/40 flex-shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MemberReportView({ memberName, memberIdx, tasks, monthlyData, reportMonth, onBack }) {
  const days = getDaysInReportMonth(reportMonth.year, reportMonth.month);
  const monthName = new Date(reportMonth.year, reportMonth.month - 1, 1).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
  const stats = getMemberStats(memberIdx, days, monthlyData, tasks.length);

  return (
    <div>
      <button onClick={onBack} className="mb-4 flex items-center gap-2 text-pink-200/70 hover:text-pink-200 transition-colors text-sm">
        <ChevronRight size={16} />
        <span>العودة للتقرير</span>
      </button>

      {/* Summary card */}
      <div className="rounded-2xl p-5 mb-5" style={{ background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.18) 0%, rgba(217, 119, 6, 0.05) 100%)', border: '1px solid rgba(236, 72, 153, 0.28)' }}>
        <h2 className="text-2xl font-black text-white mb-0.5">{memberName}</h2>
        <p className="text-pink-200/60 text-sm mb-4">{monthName} — {days.length} يوم</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
            <div className="text-2xl font-black text-emerald-300">{stats.complete}</div>
            <div className="text-xs text-emerald-300/70 mt-1">مكتمل</div>
          </div>
          <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
            <div className="text-2xl font-black text-amber-300">{stats.incomplete}</div>
            <div className="text-xs text-amber-300/70 mt-1">ناقص</div>
          </div>
          <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.25)' }}>
            <div className="text-2xl font-black text-rose-300">{stats.absent}</div>
            <div className="text-xs text-rose-300/70 mt-1">غائب</div>
          </div>
        </div>
      </div>

      {/* Day by day */}
      <div className="space-y-2">
        {days.map((dateKey) => {
          const [y, m, d] = dateKey.split('-').map(Number);
          const dayData = monthlyData[dateKey] || {};
          const c = (dayData.completions || {})[memberIdx] || [];
          const dayTasksCount = dayData.tasksCount || tasks.length;
          const done = c.filter(Boolean).length;
          const isComplete = done === dayTasksCount && dayTasksCount > 0;
          const isPartial = done > 0 && !isComplete;
          const dayName = new Date(y, m - 1, d).toLocaleDateString('ar-EG', { weekday: 'long' });

          return (
            <div key={dateKey} className="p-3 rounded-xl flex items-center gap-3" style={{
              background: isComplete ? 'rgba(16, 185, 129, 0.1)' : isPartial ? 'rgba(245, 158, 11, 0.1)' : 'rgba(244, 63, 94, 0.07)',
              border: `1px solid ${isComplete ? 'rgba(16, 185, 129, 0.28)' : isPartial ? 'rgba(245, 158, 11, 0.28)' : 'rgba(244, 63, 94, 0.18)'}`,
            }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0" style={{ background: isComplete ? 'rgba(16, 185, 129, 0.2)' : isPartial ? 'rgba(245, 158, 11, 0.2)' : 'rgba(244, 63, 94, 0.12)', color: isComplete ? '#34d399' : isPartial ? '#fbbf24' : '#fb7185' }}>
                {d}
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-medium">{dayName} {d}</p>
                <p className="text-xs mt-0.5" style={{ color: isComplete ? '#34d399' : isPartial ? '#fbbf24' : '#fb7185' }}>
                  {isComplete ? 'مكتمل — كل المهام ✓' : isPartial ? `ناقص — ${done} من ${dayTasksCount} مهام` : 'غائب — لا توجد مهام مسجلة'}
                </p>
              </div>
              {/* Task dots */}
              <div className="flex gap-1 flex-shrink-0">
                {Array.from({ length: dayTasksCount }, (_, tIdx) => (
                  <div key={tIdx} className="w-2.5 h-2.5 rounded-full" style={{ background: c[tIdx] ? '#10b981' : 'rgba(244, 63, 94, 0.35)' }}></div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
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

  const inputStyle = { background: 'rgba(45, 27, 46, 0.85)', border: '1px solid rgba(236, 72, 153, 0.22)', fontFamily: 'inherit' };

  return (
    <div>
      <div className="mb-6 p-4 rounded-2xl" style={{ background: 'rgba(236, 72, 153, 0.12)', border: '1px solid rgba(236, 72, 153, 0.28)' }}>
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-pink-300 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-pink-100 font-bold text-sm mb-1">ملاحظة هامة</p>
            <p className="text-pink-200/70 text-xs leading-relaxed">يمكنك إضافة أو حذف الأفراد والمهام. التعديلات تنطبق على الجميع فوراً عند الضغط على "حفظ التعديلات". الحد الأقصى 10 مهام.</p>
          </div>
        </div>
      </div>

      {/* Tasks */}
      <div className="rounded-2xl p-5 mb-5" style={{ background: 'rgba(61, 36, 56, 0.55)', backdropFilter: 'blur(20px)', border: '1px solid rgba(236, 72, 153, 0.18)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-white text-lg flex items-center gap-2"><Edit3 size={18} className="text-pink-300" /><span>المهام ({editTasks.length})</span></h3>
          <button onClick={() => { if (editTasks.length < 10) setEditTasks([...editTasks, `المهمة ${editTasks.length + 1}`]); else alert('الحد الأقصى 10 مهام'); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)' }}>
            <Plus size={14} /><span>إضافة</span>
          </button>
        </div>
        <div className="space-y-2">
          {editTasks.map((task, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)' }}>{idx + 1}</div>
              <input type="text" value={task} onChange={(e) => { const a = [...editTasks]; a[idx] = e.target.value; setEditTasks(a); }} className="flex-1 px-3 py-2.5 rounded-xl text-white text-right min-w-0" style={inputStyle} placeholder={`وصف المهمة ${idx + 1}`} />
              <button onClick={() => { if (editTasks.length <= 1) { alert('يجب أن تبقى مهمة واحدة'); return; } if (confirm(`حذف "${editTasks[idx]}"؟`)) setEditTasks(editTasks.filter((_, i) => i !== idx)); }} className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
                <Trash2 size={16} className="text-rose-300" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Members */}
      <div className="rounded-2xl p-5 mb-5" style={{ background: 'rgba(61, 36, 56, 0.55)', backdropFilter: 'blur(20px)', border: '1px solid rgba(236, 72, 153, 0.18)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-white text-lg flex items-center gap-2"><Users size={18} className="text-pink-300" /><span>الأفراد ({editMembers.length})</span></h3>
          <button onClick={() => setEditMembers([...editMembers, `الفرد ${editMembers.length + 1}`])} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)' }}>
            <Plus size={14} /><span>إضافة</span>
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {editMembers.map((name, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold flex-shrink-0 text-sm" style={{ background: 'rgba(236, 72, 153, 0.18)', border: '1px solid rgba(236, 72, 153, 0.32)', color: '#f9c5d1' }}>{idx + 1}</div>
              <input type="text" value={name} onChange={(e) => { const a = [...editMembers]; a[idx] = e.target.value; setEditMembers(a); }} className="flex-1 px-3 py-2.5 rounded-xl text-white text-right min-w-0" style={inputStyle} />
              <button onClick={() => { if (editMembers.length <= 1) { alert('يجب أن يبقى فرد واحد'); return; } if (confirm(`حذف "${editMembers[idx]}"؟`)) setEditMembers(editMembers.filter((_, i) => i !== idx)); }} className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
                <Trash2 size={16} className="text-rose-300" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <button onClick={handleSave} className="w-full p-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-white transition-all hover:scale-[1.01] active:scale-[0.99]" style={{ background: savedMsg ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)', boxShadow: '0 10px 25px -10px rgba(236, 72, 153, 0.45)' }}>
        {savedMsg ? <><Check size={18} /><span>تم الحفظ بنجاح</span></> : <><Save size={18} /><span>حفظ التعديلات</span></>}
      </button>
    </div>
  );
}
