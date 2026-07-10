import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore, collection, addDoc, getDocs, doc, setDoc, deleteDoc, query, orderBy
} from 'firebase/firestore';
import {
  Clock, Camera, X, Search, MapPin, FileText, Loader2, CheckCircle2, LogOut, UserPlus, Trash2,
  Settings, Eye, EyeOff, Lock, User, Star, BarChart3, ChevronDown, ChevronUp, Building2, Receipt,
  Wallet, FileBarChart, Users, Plus
} from 'lucide-react';

// ---------- Firebase setup ----------
const firebaseConfig = {
  apiKey: "AIzaSyDarKtsUKdSObCUWc6SbPfg1WTp1SUyN58",
  authDomain: "ayad-bf70a.firebaseapp.com",
  projectId: "ayad-bf70a",
  storageBucket: "ayad-bf70a.firebasestorage.app",
  messagingSenderId: "338875478070",
  appId: "1:338875478070:web:31905ee078785fb6a96897",
  measurementId: "G-5J5V8FG8BZ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const EMPLOYEES_COL = 'employees';
const VISITS_COL = 'visits';
const PHARMACIES_COL = 'pharmacies';
const EXPENSES_COL = 'expenses';
const SESSION_KEY = 'pharmatrack_session';

const ROLE_LABELS = { owner: 'اونر', admin: 'ادمن', supervisor: 'مشرف', manager: 'مدير صيدلية', employee: 'موظف ميداني' };

function useNow() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}
function formatTime(d) { return d.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
function formatDate(d) { return d.toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long', day: 'numeric' }); }
function toDateInputValue(d) { return d.toISOString().slice(0, 10); }
function monthKeyOf(ts) { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }
function monthLabelOf(key) {
  const [y, m] = key.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long' });
}

export default function PharmaTrack() {
  const [booting, setBooting] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [pharmacies, setPharmacies] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const [screen, setScreen] = useState('report');
  const [visits, setVisits] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [showPass, setShowPass] = useState(false);

  // visit report form
  const [pharmacy, setPharmacy] = useState('');
  const [notes, setNotes] = useState('');
  const [rating, setRating] = useState(0);
  const [ratingReason, setRatingReason] = useState('');
  const [photo, setPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [search, setSearch] = useState('');
  const [expandedEmp, setExpandedEmp] = useState(null);
  const [expandedMonth, setExpandedMonth] = useState(null);

  // employee management
  const [newName, setNewName] = useState('');
  const [newUser, setNewUser] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newRole, setNewRole] = useState('employee');
  const [newPharmacies, setNewPharmacies] = useState([]);
  const [adminMsg, setAdminMsg] = useState('');
  const [resetTargetId, setResetTargetId] = useState(null);
  const [resetPassValue, setResetPassValue] = useState('');
  const [resetMsg, setResetMsg] = useState('');

  // pharmacy management
  const [newPharmacyName, setNewPharmacyName] = useState('');
  const [pharmacyMsg, setPharmacyMsg] = useState('');

  // report generator
  const [reportFrom, setReportFrom] = useState('');
  const [reportTo, setReportTo] = useState('');
  const [reportResult, setReportResult] = useState(null);

  // expenses form
  const [expAmount, setExpAmount] = useState('');
  const [expDesc, setExpDesc] = useState('');
  const [expPhoto, setExpPhoto] = useState(null);
  const [expSubmitting, setExpSubmitting] = useState(false);
  const [expErr, setExpErr] = useState('');

  const now = useNow();

  const loadEmployees = useCallback(async () => {
    let list = [];
    try {
      const snap = await getDocs(collection(db, EMPLOYEES_COL));
      list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) { list = []; }
    if (list.length === 0) {
      const owner = { name: 'المالك', username: 'admin', password: 'admin123', role: 'owner', pharmacies: [] };
      try {
        await setDoc(doc(db, EMPLOYEES_COL, 'emp_admin'), owner);
        list = [{ id: 'emp_admin', ...owner }];
      } catch (e) {}
    }
    list = list.map(e => ({
      ...e,
      role: e.role || (e.isAdmin ? 'owner' : 'employee'),
      pharmacies: e.pharmacies || [],
    }));
    setEmployees(list);
    return list;
  }, []);

  const loadPharmacies = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, PHARMACIES_COL));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPharmacies(list);
      return list;
    } catch (e) { setPharmacies([]); return []; }
  }, []);

  const loadVisits = useCallback(async () => {
    try {
      const q = query(collection(db, VISITS_COL), orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      setVisits(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      try {
        const snap = await getDocs(collection(db, VISITS_COL));
        setVisits(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
      } catch (e2) { setVisits([]); }
    } finally { setLoaded(true); }
  }, []);

  const loadExpenses = useCallback(async () => {
    try {
      const q = query(collection(db, EXPENSES_COL), orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      try {
        const snap = await getDocs(collection(db, EXPENSES_COL));
        setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
      } catch (e2) { setExpenses([]); }
    }
  }, []);

  useEffect(() => {
    (async () => {
      const emps = await loadEmployees();
      await loadPharmacies();
      await loadVisits();
      await loadExpenses();
      try {
        const saved = sessionStorage.getItem(SESSION_KEY);
        if (saved) {
          const found = emps.find(e => e.id === saved);
          if (found) {
            setCurrentUser(found);
            setScreen(defaultScreenFor(found.role));
          }
        }
      } catch (e) {}
      setBooting(false);
    })();
  }, [loadEmployees, loadPharmacies, loadVisits, loadExpenses]);

  function defaultScreenFor(role) {
    if (role === 'owner') return 'owner_home';
    if (role === 'admin') return 'admin_visits';
    if (role === 'supervisor') return 'supervisor_visits';
    if (role === 'manager') return 'manager_visits';
    return 'report';
  }

  const handleLogin = () => {
    setLoginErr('');
    const u = loginUser.trim().toLowerCase();
    const found = employees.find(e => e.username.toLowerCase() === u && e.password === loginPass);
    if (!found) { setLoginErr('اسم المستخدم أو كلمة المرور غير صحيحة'); return; }
    setCurrentUser(found);
    setScreen(defaultScreenFor(found.role));
    try { sessionStorage.setItem(SESSION_KEY, found.id); } catch (e) {}
    setLoginUser(''); setLoginPass('');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setScreen('report');
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
  };

  const handlePhotoChange = (setter) => (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setter({ name: file.name, dataUrl: reader.result });
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const errs = {};
    if (!pharmacy.trim()) errs.pharmacy = 'اسم الصيدلية مطلوب';
    if (!notes.trim()) errs.notes = 'الملاحظات مطلوبة';
    if (!rating) errs.rating = 'قيّم الصيدلية من 1 إلى 10';
    if (!ratingReason.trim()) errs.ratingReason = 'اذكر سبب التقييم';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    const visit = {
      pharmacy: pharmacy.trim(),
      notes: notes.trim(),
      rating,
      ratingReason: ratingReason.trim(),
      photo: photo ? photo.dataUrl : null,
      employeeName: currentUser.name,
      timestamp: Date.now(),
      dateLabel: formatDate(new Date()),
      timeLabel: formatTime(new Date()),
    };
    try {
      await addDoc(collection(db, VISITS_COL), visit);
      await loadVisits();
      setJustSubmitted(true);
      setPharmacy(''); setNotes(''); setPhoto(null); setRating(0); setRatingReason('');
      setTimeout(() => { setJustSubmitted(false); setScreen('history'); }, 900);
    } catch (e) {
      setErrors({ submit: 'صار خطأ بالحفظ، جرب مرة ثانية' });
    } finally { setSubmitting(false); }
  };

  const togglePharmacyInNew = (name) => {
    setNewPharmacies(list => list.includes(name) ? list.filter(p => p !== name) : [...list, name]);
  };

  const handleAddEmployee = async () => {
    setAdminMsg('');
    if (!newName.trim() || !newUser.trim() || !newPass.trim()) {
      setAdminMsg('عبّي كل الحقول'); return;
    }
    if (employees.some(e => e.username.toLowerCase() === newUser.trim().toLowerCase())) {
      setAdminMsg('اسم المستخدم هذا موجود مسبقاً'); return;
    }
    if (newRole === 'manager' && newPharmacies.length !== 1) {
      setAdminMsg('مدير الصيدلية لازم تختار له صيدلية وحدة بس'); return;
    }
    if ((newRole === 'admin' || newRole === 'supervisor') && newPharmacies.length === 0) {
      setAdminMsg('اختار صيدلية وحدة على الأقل'); return;
    }
    try {
      const emp = {
        name: newName.trim(), username: newUser.trim(), password: newPass,
        role: newRole, pharmacies: (newRole === 'employee') ? [] : newPharmacies,
      };
      await addDoc(collection(db, EMPLOYEES_COL), emp);
      await loadEmployees();
      setNewName(''); setNewUser(''); setNewPass(''); setNewRole('employee'); setNewPharmacies([]);
      setAdminMsg('تمت إضافة الحساب ✓');
    } catch (e) {
      setAdminMsg('صار خطأ، جرب مرة ثانية');
    }
  };

  const handleRemoveEmployee = async (id) => {
    if (id === 'emp_admin') return;
    try {
      await deleteDoc(doc(db, EMPLOYEES_COL, id));
      await loadEmployees();
    } catch (e) {}
  };

  const handleResetPassword = async (id) => {
    setResetMsg('');
    if (!resetPassValue.trim() || resetPassValue.trim().length < 4) {
      setResetMsg('اكتب كلمة مرور 4 أحرف أو أكثر'); return;
    }
    try {
      const emp = employees.find(e => e.id === id);
      if (!emp) return;
      await setDoc(doc(db, EMPLOYEES_COL, id), { ...emp, password: resetPassValue.trim() });
      await loadEmployees();
      setResetMsg('تم تغيير كلمة المرور ✓');
      setResetPassValue('');
      setTimeout(() => { setResetTargetId(null); setResetMsg(''); }, 1200);
    } catch (e) {
      setResetMsg('صار خطأ، جرب مرة ثانية');
    }
  };

  const handleAddPharmacy = async () => {
    setPharmacyMsg('');
    if (!newPharmacyName.trim()) { setPharmacyMsg('اكتب اسم الصيدلية'); return; }
    if (pharmacies.some(p => p.name.toLowerCase() === newPharmacyName.trim().toLowerCase())) {
      setPharmacyMsg('هذي الصيدلية موجودة مسبقاً'); return;
    }
    try {
      await addDoc(collection(db, PHARMACIES_COL), { name: newPharmacyName.trim() });
      await loadPharmacies();
      setNewPharmacyName('');
      setPharmacyMsg('تمت إضافة الصيدلية ✓');
    } catch (e) { setPharmacyMsg('صار خطأ'); }
  };

  const handleRemovePharmacy = async (id) => {
    try { await deleteDoc(doc(db, PHARMACIES_COL, id)); await loadPharmacies(); } catch (e) {}
  };

  const handleAddExpense = async () => {
    setExpErr('');
    const amt = parseFloat(expAmount);
    if (!amt || amt <= 0) { setExpErr('اكتب مبلغ صحيح'); return; }
    if (!expDesc.trim()) { setExpErr('اكتب وصف المصروف'); return; }
    setExpSubmitting(true);
    const ts = Date.now();
    const expense = {
      pharmacy: (currentUser.pharmacies || [])[0] || '',
      amount: amt,
      description: expDesc.trim(),
      photo: expPhoto ? expPhoto.dataUrl : null,
      employeeName: currentUser.name,
      timestamp: ts,
      dateLabel: formatDate(new Date(ts)),
      timeLabel: formatTime(new Date(ts)),
      monthKey: monthKeyOf(ts),
    };
    try {
      await addDoc(collection(db, EXPENSES_COL), expense);
      await loadExpenses();
      setExpAmount(''); setExpDesc(''); setExpPhoto(null);
    } catch (e) { setExpErr('صار خطأ بالحفظ'); }
    finally { setExpSubmitting(false); }
  };

  const handleRemoveExpense = async (id) => {
    try { await deleteDoc(doc(db, EXPENSES_COL, id)); await loadExpenses(); } catch (e) {}
  };

  // ---------- visibility helpers ----------
  const visibleVisits = (() => {
    if (!currentUser) return [];
    if (currentUser.role === 'owner') return visits;
    if (currentUser.role === 'admin' || currentUser.role === 'supervisor') {
      const phs = currentUser.pharmacies || [];
      return visits.filter(v => phs.includes(v.pharmacy));
    }
    if (currentUser.role === 'manager') {
      const ph = (currentUser.pharmacies || [])[0];
      return visits.filter(v => v.pharmacy === ph);
    }
    return visits.filter(v => v.employeeName === currentUser.name);
  })();

  const filteredVisits = visibleVisits.filter(v => (v.pharmacy || '').toLowerCase().includes(search.toLowerCase()));
  const totalVisits = visibleVisits.length;
  const thisMonth = visibleVisits.filter(v => {
    const d = new Date(v.timestamp); const n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  }).length;

  const analyticsByEmployee = (() => {
    const map = {};
    visibleVisits.forEach(v => {
      const name = v.employeeName || 'غير معروف';
      if (!map[name]) map[name] = [];
      map[name].push(v);
    });
    return Object.entries(map).map(([name, list]) => {
      const rated = list.filter(v => v.rating);
      const avg = rated.length ? (rated.reduce((s, v) => s + v.rating, 0) / rated.length) : 0;
      return { name, list: list.sort((a, b) => b.timestamp - a.timestamp), count: list.length, avgRating: avg };
    }).sort((a, b) => b.count - a.count);
  })();

  const myExpenses = expenses.filter(e => (currentUser?.pharmacies || []).includes(e.pharmacy));
  const expensesByMonth = (() => {
    const map = {};
    myExpenses.forEach(e => {
      if (!map[e.monthKey]) map[e.monthKey] = [];
      map[e.monthKey].push(e);
    });
    return Object.entries(map).map(([key, list]) => ({
      key, list: list.sort((a, b) => b.timestamp - a.timestamp),
      total: list.reduce((s, e) => s + (e.amount || 0), 0),
    })).sort((a, b) => b.key.localeCompare(a.key));
  })();

  const runReport = () => {
    if (!reportFrom || !reportTo) return;
    const from = new Date(reportFrom); from.setHours(0, 0, 0, 0);
    const to = new Date(reportTo); to.setHours(23, 59, 59, 999);
    const scope = currentUser.role === 'owner' ? visits : visits.filter(v => (currentUser.pharmacies || []).includes(v.pharmacy));
    const filtered = scope.filter(v => v.timestamp >= from.getTime() && v.timestamp <= to.getTime());
    const rated = filtered.filter(v => v.rating);
    const avgRating = rated.length ? (rated.reduce((s, v) => s + v.rating, 0) / rated.length) : 0;
    const byPharmacy = {};
    filtered.forEach(v => { byPharmacy[v.pharmacy] = (byPharmacy[v.pharmacy] || 0) + 1; });
    setReportResult({ filtered: filtered.sort((a, b) => b.timestamp - a.timestamp), count: filtered.length, avgRating, byPharmacy });
  };

  const setQuickRange = (type) => {
    const today = new Date();
    if (type === 'week') {
      const day = today.getDay();
      const diff = (day + 1) % 7; // start week on Saturday-ish; simple approach: last 7 days
      const from = new Date(today); from.setDate(today.getDate() - 6);
      setReportFrom(toDateInputValue(from)); setReportTo(toDateInputValue(today));
    } else {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      setReportFrom(toDateInputValue(from)); setReportTo(toDateInputValue(today));
    }
  };

  if (booting) {
    return <div dir="rtl" style={styles.page}><div style={styles.bootText}>جاري التحميل...</div></div>;
  }

  // ---------- LOGIN ----------
  if (!currentUser) {
    return (
      <div dir="rtl" style={styles.page}>
        <style>{globalCss}</style>
        <div style={{ ...styles.shell, minHeight: 480 }}>
          <div style={styles.header}>
            <div style={styles.brandRow}>
              <div style={styles.logoMark}>💊</div>
              <div>
                <div style={styles.brandEyebrow}>PHARMATRACK</div>
                <div style={styles.brandTitle}>تسجيل الدخول</div>
              </div>
            </div>
          </div>
          <div style={{ padding: '32px 22px' }}>
            <label style={styles.label}><User size={14} /> اسم المستخدم</label>
            <input
              style={styles.input}
              placeholder="اسم المستخدم"
              value={loginUser}
              onChange={(e) => { setLoginUser(e.target.value); setLoginErr(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
            <label style={styles.label}><Lock size={14} /> كلمة المرور</label>
            <div style={{ position: 'relative' }}>
              <input
                style={{ ...styles.input, paddingLeft: 42 }}
                type={showPass ? 'text' : 'password'}
                placeholder="كلمة المرور"
                value={loginPass}
                onChange={(e) => { setLoginPass(e.target.value); setLoginErr(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
              <button onClick={() => setShowPass(s => !s)} style={styles.eyeBtn} type="button">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {loginErr && <div style={styles.errText}>{loginErr}</div>}
            <button className="btn-primary" style={styles.submitBtn} onClick={handleLogin}>دخول</button>
          </div>
        </div>
      </div>
    );
  }

  const role = currentUser.role;

  // ---------- shared header renderer ----------
  const HeaderBar = ({ title, icon, backTo }) => (
    <div style={styles.header}>
      <div style={styles.brandRow}>
        <div style={styles.logoMark}>{icon}</div>
        <div>
          <div style={styles.brandEyebrow}>PHARMATRACK</div>
          <div style={styles.brandTitle}>{title}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {backTo && <button onClick={() => setScreen(backTo)} style={styles.newBtn}>رجوع</button>}
        <button onClick={handleLogout} style={styles.iconBtn}><LogOut size={15} /></button>
      </div>
    </div>
  );

  // ================= OWNER HOME =================
  if (screen === 'owner_home') {
    const tiles = [
      { key: 'owner_visits', icon: <FileText size={20} />, label: 'كل الزيارات', sub: `${visits.length} زيارة` },
      { key: 'owner_analytics', icon: <BarChart3 size={20} />, label: 'تحليل حسب الموظف', sub: 'تقييمات وملاحظات' },
      { key: 'owner_report', icon: <FileBarChart size={20} />, label: 'تقرير بفترة زمنية', sub: 'أسبوعي / شهري' },
      { key: 'admin', icon: <Users size={20} />, label: 'إدارة الحسابات', sub: `${employees.length} حساب` },
      { key: 'owner_pharmacies', icon: <Building2 size={20} />, label: 'إدارة الصيدليات', sub: `${pharmacies.length} صيدلية` },
    ];
    return (
      <div dir="rtl" style={styles.page}>
        <style>{globalCss}</style>
        <div style={styles.shell}>
          <HeaderBar title="لوحة المالك" icon="👑" />
          <div style={styles.userBar}>مسجل دخول: <b>{currentUser.name}</b> <span style={styles.roleTag}>{ROLE_LABELS.owner}</span></div>
          <div style={{ padding: '18px 20px 40px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {tiles.map(t => (
              <button key={t.key} className="tile-btn" onClick={() => setScreen(t.key)} style={styles.tileBtn}>
                <div style={styles.tileIcon}>{t.icon}</div>
                <div style={{ flex: 1, textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: 14.5, color: '#1f2d26' }}>{t.label}</div>
                  <div style={{ fontSize: 11.5, color: '#8a948d', marginTop: 2 }}>{t.sub}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ================= OWNER / ADMIN / SUPERVISOR VISITS LIST =================
  if (screen === 'owner_visits' || screen === 'admin_visits' || screen === 'supervisor_visits') {
    const backTo = role === 'owner' ? 'owner_home' : null;
    const title = role === 'owner' ? 'كل الزيارات' : (role === 'admin' ? 'زيارات صيدلياتي' : 'زيارات صيدلياتي');
    return (
      <div dir="rtl" style={styles.page}>
        <style>{globalCss}</style>
        <div style={styles.shell}>
          <HeaderBar title={title} icon="📋" backTo={backTo} />
          <div style={styles.userBar}>
            مسجل دخول: <b>{currentUser.name}</b> <span style={styles.roleTag}>{ROLE_LABELS[role]}</span>
            {role !== 'owner' && (currentUser.pharmacies || []).length > 0 && (
              <div style={{ marginTop: 4, fontSize: 11.5 }}>صيدلياتي: {currentUser.pharmacies.join('، ')}</div>
            )}
          </div>
          <div style={{ padding: '0 20px 40px' }}>
            <div style={styles.statsRow}>
              <div style={styles.statBox}><div style={styles.statNum}>{totalVisits}</div><div style={styles.statLabel}>إجمالي الزيارات</div></div>
              <div style={styles.statBox}><div style={styles.statNum}>{thisMonth}</div><div style={styles.statLabel}>هذا الشهر</div></div>
            </div>
            <div style={styles.searchWrap}>
              <Search size={16} color="#8a948d" />
              <input style={styles.searchInput} placeholder="ابحث باسم الصيدلية..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            {filteredVisits.length === 0 ? (
              <div style={styles.emptyState}><div style={{ fontSize: 32, marginBottom: 8 }}>🕐</div><div>ما اكو زيارات</div></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
                {filteredVisits.map((v, i) => (
                  <div className="visit-card" key={v.id} style={{ ...styles.visitCard, animationDelay: `${i * 0.03}s` }}>
                    {v.photo ? <img src={v.photo} alt="" style={styles.visitThumb} /> : <div style={styles.visitThumbPlaceholder}>💊</div>}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={styles.visitPharmacy}>{v.pharmacy}</div>
                        {v.rating ? <div style={styles.ratingPillSmall}><Star size={10} fill="#e8a33d" color="#e8a33d" /> {v.rating}/10</div> : null}
                      </div>
                      <div style={styles.visitMeta}>{v.dateLabel} · {v.timeLabel} · {v.employeeName || '—'}</div>
                      {v.notes && <div style={styles.visitNotes}>{v.notes}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ================= ANALYTICS (owner) =================
  if (screen === 'owner_analytics') {
    return (
      <div dir="rtl" style={styles.page}>
        <style>{globalCss}</style>
        <div style={styles.shell}>
          <HeaderBar title="تحليل الزيارات" icon="📊" backTo="owner_home" />
          <div style={{ padding: '18px 20px 40px' }}>
            <div style={styles.statsRow}>
              <div style={styles.statBox}><div style={styles.statNum}>{visits.length}</div><div style={styles.statLabel}>إجمالي كل الزيارات</div></div>
              <div style={styles.statBox}><div style={styles.statNum}>{analyticsByEmployee.length}</div><div style={styles.statLabel}>عدد الموظفين</div></div>
            </div>
            <div style={{ ...styles.sectionTitle, marginTop: 24 }}>الزيارات حسب الموظف</div>
            {analyticsByEmployee.length === 0 ? (
              <div style={styles.emptyState}>ما اكو بيانات بعد</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {analyticsByEmployee.map(emp => (
                  <div key={emp.name} style={styles.empAnalyticsCard}>
                    <button onClick={() => setExpandedEmp(expandedEmp === emp.name ? null : emp.name)} style={styles.empAnalyticsHeader}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, fontSize: 14.5, color: '#1f2d26' }}>{emp.name}</div>
                        <div style={{ fontSize: 11.5, color: '#8a948d', marginTop: 2 }}>
                          {emp.count} زيارة · متوسط {emp.avgRating ? emp.avgRating.toFixed(1) : '—'} / 10
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={styles.avgBadge}><Star size={12} fill="#e8a33d" color="#e8a33d" />{emp.avgRating ? emp.avgRating.toFixed(1) : '—'}</div>
                        {expandedEmp === emp.name ? <ChevronUp size={16} color="#8a948d" /> : <ChevronDown size={16} color="#8a948d" />}
                      </div>
                    </button>
                    {expandedEmp === emp.name && (
                      <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {emp.list.map(v => (
                          <div key={v.id} style={styles.analyticsVisitRow}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <div style={{ fontWeight: 700, fontSize: 13.5, color: '#1f2d26' }}>{v.pharmacy}</div>
                              {v.rating ? <div style={styles.ratingPill}>{v.rating}/10</div> : <div style={{ ...styles.ratingPill, background: '#eee', color: '#999' }}>—</div>}
                            </div>
                            <div style={{ fontSize: 11, color: '#8a948d', marginTop: 2 }}>{v.dateLabel} · {v.timeLabel}</div>
                            {v.ratingReason && <div style={{ fontSize: 12, color: '#3a4a41', marginTop: 6 }}><b>سبب التقييم: </b>{v.ratingReason}</div>}
                            {v.notes && <div style={{ fontSize: 12, color: '#5a6b62', marginTop: 4 }}><b>الملاحظات: </b>{v.notes}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ================= DATE-RANGE REPORT (owner + admin) =================
  if (screen === 'owner_report' || screen === 'admin_report') {
    const backTo = role === 'owner' ? 'owner_home' : 'admin_visits';
    return (
      <div dir="rtl" style={styles.page}>
        <style>{globalCss}</style>
        <div style={styles.shell}>
          <HeaderBar title="تقرير بفترة زمنية" icon="🗓️" backTo={backTo} />
          <div style={{ padding: '18px 20px 40px' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button onClick={() => setQuickRange('week')} style={styles.quickBtn}>آخر 7 أيام</button>
              <button onClick={() => setQuickRange('month')} style={styles.quickBtn}>هذا الشهر</button>
            </div>
            <label style={styles.label}>من تاريخ</label>
            <input type="date" style={styles.input} value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} />
            <label style={styles.label}>إلى تاريخ</label>
            <input type="date" style={styles.input} value={reportTo} onChange={(e) => setReportTo(e.target.value)} />
            <button className="btn-primary" style={styles.submitBtn} onClick={runReport}>توليد التقرير</button>

            {reportResult && (
              <div style={{ marginTop: 22 }}>
                <div style={styles.statsRow}>
                  <div style={styles.statBox}><div style={styles.statNum}>{reportResult.count}</div><div style={styles.statLabel}>عدد الزيارات</div></div>
                  <div style={styles.statBox}><div style={styles.statNum}>{reportResult.avgRating ? reportResult.avgRating.toFixed(1) : '—'}</div><div style={styles.statLabel}>متوسط التقييم</div></div>
                </div>
                <div style={{ ...styles.sectionTitle, marginTop: 18 }}>حسب الصيدلية</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                  {Object.entries(reportResult.byPharmacy).map(([ph, count]) => (
                    <div key={ph} style={styles.pharmacyCountRow}>
                      <span>{ph}</span><span style={{ fontWeight: 700 }}>{count}</span>
                    </div>
                  ))}
                </div>
                <div style={styles.sectionTitle}>تفاصيل الزيارات ({reportResult.filtered.length})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {reportResult.filtered.map(v => (
                    <div key={v.id} style={styles.analyticsVisitRow}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div style={{ fontWeight: 700, fontSize: 13.5 }}>{v.pharmacy}</div>
                        {v.rating ? <div style={styles.ratingPill}>{v.rating}/10</div> : null}
                      </div>
                      <div style={{ fontSize: 11, color: '#8a948d', marginTop: 2 }}>{v.dateLabel} · {v.timeLabel} · {v.employeeName}</div>
                      {v.ratingReason && <div style={{ fontSize: 12, color: '#3a4a41', marginTop: 6 }}><b>سبب التقييم: </b>{v.ratingReason}</div>}
                      {v.notes && <div style={{ fontSize: 12, color: '#5a6b62', marginTop: 4 }}><b>الملاحظات: </b>{v.notes}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ================= PHARMACIES MANAGEMENT (owner) =================
  if (screen === 'owner_pharmacies') {
    return (
      <div dir="rtl" style={styles.page}>
        <style>{globalCss}</style>
        <div style={styles.shell}>
          <HeaderBar title="إدارة الصيدليات" icon="🏬" backTo="owner_home" />
          <div style={{ padding: '18px 20px 40px' }}>
            <label style={styles.label}>اسم صيدلية جديدة</label>
            <input style={styles.input} placeholder="مثال: صيدلية روزنبيري" value={newPharmacyName} onChange={(e) => setNewPharmacyName(e.target.value)} />
            {pharmacyMsg && <div style={{ ...styles.errText, color: pharmacyMsg.includes('✓') ? '#1f7a4d' : '#c0392b' }}>{pharmacyMsg}</div>}
            <button className="btn-primary" style={styles.submitBtn} onClick={handleAddPharmacy}><Plus size={16} /> إضافة صيدلية</button>

            <div style={{ ...styles.sectionTitle, marginTop: 24 }}>الصيدليات ({pharmacies.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pharmacies.map(ph => (
                <div key={ph.id} style={styles.empRow}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{ph.name}</div>
                  <button onClick={() => handleRemovePharmacy(ph.id)} style={styles.trashBtn}><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ================= EMPLOYEE / ACCOUNT MANAGEMENT (owner) =================
  if (screen === 'admin') {
    return (
      <div dir="rtl" style={styles.page}>
        <style>{globalCss}</style>
        <div style={styles.shell}>
          <HeaderBar title="إدارة الحسابات" icon="👥" backTo="owner_home" />
          <div style={{ padding: '18px 20px 40px' }}>
            <div style={styles.sectionTitle}>إضافة حساب جديد</div>
            <label style={styles.label}>الاسم</label>
            <input style={styles.input} placeholder="الاسم الكامل" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <label style={styles.label}>اسم المستخدم</label>
            <input style={styles.input} placeholder="username" value={newUser} onChange={(e) => setNewUser(e.target.value)} />
            <label style={styles.label}>كلمة المرور</label>
            <input style={styles.input} placeholder="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} />

            <label style={styles.label}>نوع الحساب</label>
            <select style={styles.input} value={newRole} onChange={(e) => { setNewRole(e.target.value); setNewPharmacies([]); }}>
              <option value="employee">موظف ميداني (يسجل زيارات)</option>
              <option value="manager">مدير صيدلية (فيور + مصاريف لصيدلية وحدة)</option>
              <option value="supervisor">مشرف (يتابع عدة صيدليات)</option>
              <option value="admin">ادمن (يتابع صيدليات + تقارير)</option>
              <option value="owner">اونر (صلاحية كاملة)</option>
            </select>

            {(newRole === 'manager' || newRole === 'supervisor' || newRole === 'admin') && (
              <>
                <label style={styles.label}>
                  {newRole === 'manager' ? 'اختار صيدلية واحدة' : 'اختار الصيدليات (يقدر يشوفها)'}
                </label>
                {pharmacies.length === 0 ? (
                  <div style={{ fontSize: 12.5, color: '#8a948d' }}>ما اكو صيدليات مضافة بعد — روح لـ "إدارة الصيدليات" أول</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {pharmacies.map(ph => (
                      <label key={ph.id} style={styles.checkRow}>
                        <input
                          type={newRole === 'manager' ? 'radio' : 'checkbox'}
                          name="ph-select"
                          checked={newPharmacies.includes(ph.name)}
                          onChange={() => {
                            if (newRole === 'manager') setNewPharmacies([ph.name]);
                            else togglePharmacyInNew(ph.name);
                          }}
                        />
                        {ph.name}
                      </label>
                    ))}
                  </div>
                )}
              </>
            )}

            {adminMsg && <div style={{ ...styles.errText, color: adminMsg.includes('✓') ? '#1f7a4d' : '#c0392b' }}>{adminMsg}</div>}
            <button className="btn-primary" style={styles.submitBtn} onClick={handleAddEmployee}><UserPlus size={16} /> إضافة الحساب</button>

            <div style={{ ...styles.sectionTitle, marginTop: 28 }}>الحسابات ({employees.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {employees.map(emp => (
                <div key={emp.id} style={styles.empCardWrap}>
                  <div style={{ ...styles.empRow, border: 'none', borderRadius: 0 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>
                        {emp.name}
                        <span style={styles.adminTag}>{ROLE_LABELS[emp.role] || 'موظف'}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#8a948d' }}>@{emp.username}</div>
                      {emp.pharmacies && emp.pharmacies.length > 0 && (
                        <div style={{ fontSize: 11, color: '#5a6b62', marginTop: 2 }}>{emp.pharmacies.join('، ')}</div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        onClick={() => { setResetTargetId(resetTargetId === emp.id ? null : emp.id); setResetPassValue(''); setResetMsg(''); }}
                        style={styles.resetBtn}
                      >
                        <Lock size={14} />
                      </button>
                      {emp.id !== 'emp_admin' && (
                        <button onClick={() => handleRemoveEmployee(emp.id)} style={styles.trashBtn}><Trash2 size={15} /></button>
                      )}
                    </div>
                  </div>
                  {resetTargetId === emp.id && (
                    <div style={styles.resetPanel}>
                      <label style={{ ...styles.label, marginTop: 8 }}>كلمة مرور جديدة لـ {emp.name}</label>
                      <input
                        style={styles.input}
                        type="text"
                        placeholder="كلمة المرور الجديدة"
                        value={resetPassValue}
                        onChange={(e) => setResetPassValue(e.target.value)}
                      />
                      {resetMsg && <div style={{ ...styles.errText, color: resetMsg.includes('✓') ? '#1f7a4d' : '#c0392b' }}>{resetMsg}</div>}
                      <button className="btn-primary" style={{ ...styles.submitBtn, marginTop: 10 }} onClick={() => handleResetPassword(emp.id)}>
                        حفظ كلمة المرور الجديدة
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ================= MANAGER: VISITS (view only) =================
  if (screen === 'manager_visits') {
    return (
      <div dir="rtl" style={styles.page}>
        <style>{globalCss}</style>
        <div style={styles.shell}>
          <div style={styles.header}>
            <div style={styles.brandRow}>
              <div style={styles.logoMark}>💊</div>
              <div>
                <div style={styles.brandEyebrow}>PHARMATRACK</div>
                <div style={styles.brandTitle}>زيارات {(currentUser.pharmacies || [])[0] || ''}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setScreen('manager_expenses')} style={styles.iconBtn}><Wallet size={15} /></button>
              <button onClick={handleLogout} style={styles.iconBtn}><LogOut size={15} /></button>
            </div>
          </div>
          <div style={styles.userBar}>مسجل دخول: <b>{currentUser.name}</b> <span style={styles.roleTag}>{ROLE_LABELS.manager}</span></div>
          <div style={{ padding: '0 20px 40px' }}>
            <div style={styles.statsRow}>
              <div style={styles.statBox}><div style={styles.statNum}>{totalVisits}</div><div style={styles.statLabel}>إجمالي الزيارات</div></div>
              <div style={styles.statBox}><div style={styles.statNum}>{thisMonth}</div><div style={styles.statLabel}>هذا الشهر</div></div>
            </div>
            {filteredVisits.length === 0 ? (
              <div style={styles.emptyState}>ما اكو زيارات مسجلة بعد لهذي الصيدلية</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
                {filteredVisits.map((v, i) => (
                  <div className="visit-card" key={v.id} style={{ ...styles.visitCard, animationDelay: `${i * 0.03}s` }}>
                    {v.photo ? <img src={v.photo} alt="" style={styles.visitThumb} /> : <div style={styles.visitThumbPlaceholder}>💊</div>}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={styles.visitPharmacy}>{v.employeeName}</div>
                        {v.rating ? <div style={styles.ratingPillSmall}><Star size={10} fill="#e8a33d" color="#e8a33d" /> {v.rating}/10</div> : null}
                      </div>
                      <div style={styles.visitMeta}>{v.dateLabel} · {v.timeLabel}</div>
                      {v.notes && <div style={styles.visitNotes}>{v.notes}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setScreen('manager_expenses')} style={styles.linkBtn}><Receipt size={14} style={{ verticalAlign: 'middle', marginLeft: 4 }} /> إدارة المصاريف</button>
          </div>
        </div>
      </div>
    );
  }

  // ================= MANAGER: EXPENSES =================
  if (screen === 'manager_expenses') {
    return (
      <div dir="rtl" style={styles.page}>
        <style>{globalCss}</style>
        <div style={styles.shell}>
          <HeaderBar title="مصاريف الصيدلية" icon="🧾" backTo="manager_visits" />
          <div style={{ padding: '18px 20px 40px' }}>
            <div style={styles.sectionTitle}>إضافة مصروف جديد</div>
            <label style={styles.label}>المبلغ (د.ع)</label>
            <input type="number" style={styles.input} placeholder="0" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} />
            <label style={styles.label}>الوصف</label>
            <textarea style={styles.textarea} rows={2} placeholder="وصف المصروف..." value={expDesc} onChange={(e) => setExpDesc(e.target.value)} />
            <label style={styles.label}><Camera size={14} /> صورة الوصل (اختياري)</label>
            {expPhoto ? (
              <div style={styles.photoPreviewWrap}>
                <img src={expPhoto.dataUrl} alt="" style={styles.photoPreview} />
                <button onClick={() => setExpPhoto(null)} style={styles.photoRemove}><X size={14} /></button>
              </div>
            ) : (
              <label className="photo-slot" style={styles.photoSlot}>
                <Camera size={22} color="#2f6b57" />
                <span style={{ fontSize: 13, color: '#5a6b62', marginTop: 6 }}>اضغط لإضافة صورة الوصل</span>
                <input type="file" accept="image/*" onChange={handlePhotoChange(setExpPhoto)} style={{ display: 'none' }} />
              </label>
            )}
            {expErr && <div style={styles.errText}>{expErr}</div>}
            <button className="btn-primary" style={{ ...styles.submitBtn, opacity: expSubmitting ? 0.7 : 1 }} onClick={handleAddExpense} disabled={expSubmitting}>
              {expSubmitting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'حفظ المصروف'}
            </button>

            <div style={{ ...styles.sectionTitle, marginTop: 28 }}>المصاريف حسب الشهر</div>
            {expensesByMonth.length === 0 ? (
              <div style={styles.emptyState}>ما اكو مصاريف مسجلة بعد</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {expensesByMonth.map(m => (
                  <div key={m.key} style={styles.empAnalyticsCard}>
                    <button onClick={() => setExpandedMonth(expandedMonth === m.key ? null : m.key)} style={styles.empAnalyticsHeader}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, fontSize: 14.5 }}>{monthLabelOf(m.key)}</div>
                        <div style={{ fontSize: 11.5, color: '#8a948d', marginTop: 2 }}>{m.list.length} مصروف</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={styles.totalBadge}>{m.total.toLocaleString()} د.ع</div>
                        {expandedMonth === m.key ? <ChevronUp size={16} color="#8a948d" /> : <ChevronDown size={16} color="#8a948d" />}
                      </div>
                    </button>
                    {expandedMonth === m.key && (
                      <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {m.list.map(e => (
                          <div key={e.id} style={styles.analyticsVisitRow}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{e.description}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ fontWeight: 700, color: '#1f4438' }}>{e.amount.toLocaleString()} د.ع</div>
                                <button onClick={() => handleRemoveExpense(e.id)} style={styles.trashBtn}><Trash2 size={14} /></button>
                              </div>
                            </div>
                            <div style={{ fontSize: 11, color: '#8a948d', marginTop: 2 }}>{e.dateLabel} · {e.timeLabel}</div>
                            {e.photo && <img src={e.photo} alt="" style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 10, marginTop: 6 }} />}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ================= ADMIN: header extra button to report =================
  // (admin_visits handled above alongside owner_visits/supervisor_visits)

  // ================= EMPLOYEE: REPORT / HISTORY (default) =================
  return (
    <div dir="rtl" style={styles.page}>
      <style>{globalCss}</style>
      <div style={styles.shell}>
        <div style={styles.header}>
          <div style={styles.brandRow}>
            <div style={styles.logoMark}>💊</div>
            <div>
              <div style={styles.brandEyebrow}>PHARMATRACK</div>
              <div style={styles.brandTitle}>{screen === 'report' ? 'تقرير الزيارة' : 'زياراتي'}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={handleLogout} style={styles.iconBtn}><LogOut size={15} /></button>
          </div>
        </div>

        <div style={styles.userBar}>مسجل دخول: <b>{currentUser.name}</b></div>

        {screen === 'report' ? (
          <div style={{ padding: '0 20px 100px' }}>
            <div style={styles.timeCard}>
              <Clock size={18} color="#2f6b57" />
              <div>
                <div style={styles.timeValue}>{formatTime(now)}</div>
                <div style={styles.timeSub}>{formatDate(now)}</div>
              </div>
            </div>

            <label style={styles.label}><MapPin size={14} /> اسم الصيدلية</label>
            {pharmacies.length > 0 ? (
              <select
                style={{ ...styles.input, ...(errors.pharmacy ? styles.inputError : {}) }}
                value={pharmacy}
                onChange={(e) => { setPharmacy(e.target.value); setErrors(er => ({ ...er, pharmacy: null })); }}
              >
                <option value="">-- اختار الصيدلية --</option>
                {pharmacies.map(ph => <option key={ph.id} value={ph.name}>{ph.name}</option>)}
              </select>
            ) : (
              <input
                style={{ ...styles.input, ...(errors.pharmacy ? styles.inputError : {}) }}
                placeholder="مثال: صيدلية الدواء ٤٠٢"
                value={pharmacy}
                onChange={(e) => { setPharmacy(e.target.value); setErrors(er => ({ ...er, pharmacy: null })); }}
              />
            )}
            {errors.pharmacy && <div style={styles.errText}>{errors.pharmacy}</div>}

            <label style={styles.label}><Star size={14} /> تقييم الصيدلية (من 1 إلى 10)</label>
            <div style={styles.starsRow}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                <button key={n} type="button" onClick={() => { setRating(n); setErrors(er => ({ ...er, rating: null })); }} style={styles.starBtn}>
                  <Star size={20} fill={n <= rating ? '#e8a33d' : 'none'} color={n <= rating ? '#e8a33d' : '#c9d1cb'} />
                </button>
              ))}
              <span style={styles.ratingNum}>{rating ? `${rating}/10` : ''}</span>
            </div>
            {errors.rating && <div style={styles.errText}>{errors.rating}</div>}

            <label style={styles.label}><FileText size={14} /> سبب التقييم</label>
            <textarea
              style={{ ...styles.textarea, ...(errors.ratingReason ? styles.inputError : {}) }}
              placeholder="ليش اعطيت هذا التقييم؟"
              value={ratingReason}
              onChange={(e) => { setRatingReason(e.target.value); setErrors(er => ({ ...er, ratingReason: null })); }}
              rows={2}
            />
            {errors.ratingReason && <div style={styles.errText}>{errors.ratingReason}</div>}

            <label style={styles.label}><Camera size={14} /> صورة توثيقية (اختياري)</label>
            {photo ? (
              <div style={styles.photoPreviewWrap}>
                <img src={photo.dataUrl} alt="" style={styles.photoPreview} />
                <button onClick={() => setPhoto(null)} style={styles.photoRemove}><X size={14} /></button>
              </div>
            ) : (
              <label className="photo-slot" style={styles.photoSlot}>
                <Camera size={22} color="#2f6b57" />
                <span style={{ fontSize: 13, color: '#5a6b62', marginTop: 6 }}>اضغط لإضافة صورة</span>
                <input type="file" accept="image/*" onChange={handlePhotoChange(setPhoto)} style={{ display: 'none' }} />
              </label>
            )}

            <label style={styles.label}><FileText size={14} /> ملاحظات الزيارة</label>
            <textarea
              style={{ ...styles.textarea, ...(errors.notes ? styles.inputError : {}) }}
              placeholder="اكتب ملاحظاتك عن الزيارة..."
              value={notes}
              onChange={(e) => { setNotes(e.target.value); setErrors(er => ({ ...er, notes: null })); }}
              rows={4}
            />
            {errors.notes && <div style={styles.errText}>{errors.notes}</div>}
            {errors.submit && <div style={styles.errText}>{errors.submit}</div>}

            <button className="btn-primary" style={{ ...styles.submitBtn, opacity: submitting ? 0.75 : 1 }} onClick={handleSubmit} disabled={submitting}>
              {submitting ? (<><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> جاري الحفظ...</>) :
                justSubmitted ? (<><CheckCircle2 size={16} /> تم الحفظ</>) : ('حفظ التقرير')}
            </button>
            <div style={styles.lockNote}>⚠️ بعد الحفظ، التقرير يصير نهائي وما يمكن تعديله</div>

            <button onClick={() => setScreen('history')} style={styles.linkBtn}>عرض زياراتي ({totalVisits})</button>
          </div>
        ) : (
          <div style={{ padding: '0 20px 40px' }}>
            <div style={styles.statsRow}>
              <div style={styles.statBox}><div style={styles.statNum}>{totalVisits}</div><div style={styles.statLabel}>إجمالي زياراتي</div></div>
              <div style={styles.statBox}><div style={styles.statNum}>{thisMonth}</div><div style={styles.statLabel}>هذا الشهر</div></div>
            </div>
            <div style={styles.searchWrap}>
              <Search size={16} color="#8a948d" />
              <input style={styles.searchInput} placeholder="ابحث باسم الصيدلية..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            {!loaded ? (
              <div style={styles.emptyState}>جاري التحميل...</div>
            ) : filteredVisits.length === 0 ? (
              <div style={styles.emptyState}><div style={{ fontSize: 32, marginBottom: 8 }}>🕐</div><div>ما اكو زيارات مسجلة بعد</div></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filteredVisits.map((v, i) => (
                  <div className="visit-card" key={v.id} style={{ ...styles.visitCard, animationDelay: `${i * 0.04}s` }}>
                    {v.photo ? <img src={v.photo} alt="" style={styles.visitThumb} /> : <div style={styles.visitThumbPlaceholder}>💊</div>}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={styles.visitPharmacy}>{v.pharmacy}</div>
                        {v.rating ? <div style={styles.ratingPillSmall}><Star size={10} fill="#e8a33d" color="#e8a33d" /> {v.rating}/10</div> : null}
                      </div>
                      <div style={styles.visitMeta}>{v.dateLabel} · {v.timeLabel}</div>
                      {v.notes && <div style={styles.visitNotes}>{v.notes}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setScreen('report')} style={styles.linkBtn}>+ تقرير زيارة جديد</button>
          </div>
        )}
      </div>
    </div>
  );
}

const globalCss = `
  @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .visit-card { animation: fadeUp 0.35s ease both; }
  .visit-card:hover { border-color: #2f6b57 !important; transform: translateY(-1px); }
  .tile-btn:hover { border-color: #2f6b57 !important; background: #f6faf8 !important; }
  input::placeholder, textarea::placeholder { color: #9ba39c; }
  input:focus, textarea:focus, select:focus { outline: none; border-color: #2f6b57 !important; box-shadow: 0 0 0 3px rgba(47,107,87,0.12); }
  .btn-primary:active { transform: scale(0.98); }
  .photo-slot:hover { border-color: #2f6b57 !important; background: #f3f7f5 !important; }
`;

const styles = {
  page: { minHeight: '100vh', background: '#eef2ef', display: 'flex', justifyContent: 'center', fontFamily: "'Segoe UI', Tahoma, sans-serif", padding: '24px 12px', boxSizing: 'border-box' },
  bootText: { color: '#5a6b62', marginTop: 60, fontSize: 14 },
  shell: { width: '100%', maxWidth: 420, background: '#ffffff', borderRadius: 20, boxShadow: '0 8px 30px rgba(20,40,30,0.10)', overflow: 'hidden', minHeight: 640 },
  header: { background: '#1f4438', padding: '22px 20px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { display: 'flex', alignItems: 'center', gap: 12 },
  logoMark: { width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 },
  brandEyebrow: { color: '#8fd9bd', fontSize: 11, letterSpacing: 1, fontWeight: 700 },
  brandTitle: { color: '#fff', fontSize: 19, fontWeight: 700, marginTop: 2 },
  newBtn: { background: 'rgba(255,255,255,0.14)', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 12px', fontSize: 12.5, cursor: 'pointer', fontWeight: 600 },
  iconBtn: { background: 'rgba(255,255,255,0.14)', color: '#fff', border: 'none', borderRadius: 10, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  userBar: { background: '#f3f7f5', color: '#3a4a41', fontSize: 12.5, padding: '9px 20px', borderBottom: '1px solid #e2ebe6' },
  roleTag: { background: '#1f4438', color: '#8fd9bd', fontSize: 10, padding: '2px 8px', borderRadius: 20, marginRight: 6, fontWeight: 700 },
  timeCard: { marginTop: 18, background: '#f3f7f5', border: '1px solid #dcebe3', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 },
  timeValue: { fontSize: 20, fontWeight: 700, color: '#173b2f', fontVariantNumeric: 'tabular-nums' },
  timeSub: { fontSize: 12, color: '#5a6b62', marginTop: 2 },
  label: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: '#3a4a41', marginTop: 20, marginBottom: 8, letterSpacing: 0.2 },
  input: { width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #e0e5e2', fontSize: 14.5, color: '#1f2d26', background: '#fbfcfb', transition: 'border-color .15s, box-shadow .15s' },
  inputError: { borderColor: '#d9564a' },
  errText: { color: '#c0392b', fontSize: 12, marginTop: 6 },
  eyeBtn: { position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#8a948d', cursor: 'pointer', padding: 4 },
  textarea: { width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #e0e5e2', fontSize: 14.5, color: '#1f2d26', background: '#fbfcfb', resize: 'vertical', fontFamily: 'inherit', transition: 'border-color .15s, box-shadow .15s' },
  photoSlot: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1.5px dashed #cfe0d7', borderRadius: 14, padding: '22px 14px', cursor: 'pointer', background: '#fafcfb', transition: 'border-color .15s, background .15s' },
  photoPreviewWrap: { position: 'relative', width: '100%' },
  photoPreview: { width: '100%', height: 140, objectFit: 'cover', borderRadius: 14, border: '1.5px solid #e0e5e2' },
  photoRemove: { position: 'absolute', top: 8, left: 8, width: 26, height: 26, borderRadius: '50%', background: 'rgba(20,30,25,0.65)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  submitBtn: { width: '100%', marginTop: 26, background: '#1f4438', color: '#fff', border: 'none', borderRadius: 14, padding: '14px', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'transform .1s' },
  linkBtn: { width: '100%', marginTop: 12, background: 'transparent', border: 'none', color: '#2f6b57', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', padding: '8px' },
  statsRow: { display: 'flex', gap: 10, marginTop: 18 },
  statBox: { flex: 1, background: '#f3f7f5', borderRadius: 14, padding: '14px 12px', textAlign: 'center', border: '1px solid #dcebe3' },
  statNum: { fontSize: 22, fontWeight: 800, color: '#173b2f' },
  statLabel: { fontSize: 11.5, color: '#5a6b62', marginTop: 4 },
  searchWrap: { marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, background: '#f5f6f5', border: '1.5px solid #e0e5e2', borderRadius: 12, padding: '10px 14px' },
  searchInput: { border: 'none', outline: 'none', background: 'transparent', fontSize: 14, flex: 1, color: '#1f2d26' },
  emptyState: { textAlign: 'center', color: '#8a948d', fontSize: 13.5, padding: '50px 10px' },
  visitCard: { display: 'flex', gap: 12, alignItems: 'center', padding: 12, borderRadius: 14, border: '1.5px solid #e5e9e6', background: '#fff', cursor: 'default', transition: 'all .15s' },
  visitThumb: { width: 48, height: 48, borderRadius: 10, objectFit: 'cover', flexShrink: 0 },
  visitThumbPlaceholder: { width: 48, height: 48, borderRadius: 10, background: '#eef2ef', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 },
  visitPharmacy: { fontSize: 14.5, fontWeight: 700, color: '#1f2d26' },
  visitMeta: { fontSize: 11.5, color: '#8a948d', marginTop: 2 },
  visitNotes: { fontSize: 12.5, color: '#5a6b62', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  sectionTitle: { fontSize: 13.5, fontWeight: 700, color: '#3a4a41', marginBottom: 4 },
  empRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', border: '1.5px solid #e5e9e6', borderRadius: 12, background: '#fafcfb' },
  adminTag: { background: '#1f4438', color: '#8fd9bd', fontSize: 10, padding: '2px 7px', borderRadius: 6, marginRight: 8, fontWeight: 700 },
  trashBtn: { background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer', padding: 6 },
  starsRow: { display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' },
  starBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' },
  ratingNum: { fontSize: 13, fontWeight: 700, color: '#3a4a41', marginRight: 6 },
  ratingPill: { background: '#1f4438', color: '#8fd9bd', fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 20, whiteSpace: 'nowrap' },
  ratingPillSmall: { background: '#f3f7f5', color: '#3a4a41', fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 3, border: '1px solid #dcebe3' },
  empAnalyticsCard: { border: '1.5px solid #e5e9e6', borderRadius: 14, background: '#fff', overflow: 'hidden' },
  empAnalyticsHeader: { width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  avgBadge: { display: 'flex', alignItems: 'center', gap: 4, background: '#fdf3e2', color: '#8a5a17', fontSize: 12, fontWeight: 700, padding: '3px 8px', borderRadius: 20 },
  totalBadge: { background: '#e8f3ee', color: '#1f4438', fontSize: 12.5, fontWeight: 800, padding: '4px 10px', borderRadius: 20 },
  analyticsVisitRow: { background: '#fafcfb', border: '1px solid #edf1ee', borderRadius: 10, padding: '10px 12px' },
  tileBtn: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px', borderRadius: 14, border: '1.5px solid #e5e9e6', background: '#fff', cursor: 'pointer', transition: 'all .15s', width: '100%' },
  tileIcon: { width: 40, height: 40, borderRadius: 10, background: '#f3f7f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2f6b57', flexShrink: 0 },
  quickBtn: { flex: 1, background: '#f3f7f5', border: '1px solid #dcebe3', borderRadius: 10, padding: '8px', fontSize: 12.5, fontWeight: 600, color: '#2f6b57', cursor: 'pointer' },
  pharmacyCountRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#fafcfb', border: '1px solid #edf1ee', borderRadius: 10, fontSize: 13 },
  checkRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: '1px solid #e5e9e6', borderRadius: 10, fontSize: 13.5, cursor: 'pointer' },
  lockNote: { fontSize: 11, color: '#8a948d', textAlign: 'center', marginTop: 8 },
  empCardWrap: { border: '1.5px solid #e5e9e6', borderRadius: 12, overflow: 'hidden', background: '#fafcfb' },
  resetBtn: { background: 'none', border: 'none', color: '#2f6b57', cursor: 'pointer', padding: 6 },
  resetPanel: { padding: '0 14px 14px', borderTop: '1px solid #e5e9e6', marginTop: 4 },
};
