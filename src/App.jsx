import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore, collection, addDoc, getDocs, doc, setDoc, deleteDoc, query, orderBy
} from 'firebase/firestore';
import {
  Clock, Camera, X, Search, MapPin, FileText, Loader2, CheckCircle2, LogOut, UserPlus, Trash2,
  Settings, Eye, EyeOff, Lock, User, Star, BarChart3, ChevronDown, ChevronUp, Building2, Receipt,
  Wallet, FileBarChart, Users, Plus,
  GraduationCap, ShieldCheck, Pill, Headset, AlertTriangle, Circle
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
const SUPERVISOR_VISITS_COL = 'supervisor_visits';
const COMPLAINTS_COL = 'complaints';
const SESSION_KEY = 'pharmatrack_session';

const ROLE_LABELS = { owner: 'اونر', admin: 'ادمن', supervisor: 'HR', manager: 'مدير صيدلية', employee: 'موظف ميداني', store_employee: 'موظف صيدلية' };

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

/* ============================================================
   TRAINING MODULE — added as a self-contained, additive feature.
   Nothing above this block or in PharmaTrack() below was changed
   except: the icon import list, one tile in owner_home, and three
   small navigation buttons + one screen route near the bottom.
   ============================================================ */

const TRAINING_COLORS = {
  pine: "#1F3D2B", pineDeep: "#14231A", sand: "#F6F1E7", sandCard: "#FFFFFF",
  gold: "#C99A3B", goldSoft: "#EFD9A8", muted: "#6B7A6E", danger: "#B23A3A",
};

const TRAINING_LEVELS = [
  { id: 1, label: "متدرب", min: 0, color: "#8B8368", bg: "#EFEAE0" },
  { id: 2, label: "مؤهل", min: 21, color: "#7A8B4E", bg: "#EAEEDD" },
  { id: 3, label: "متمرس", min: 51, color: TRAINING_COLORS.pine, bg: "#E4EEE4" },
  { id: 4, label: "خبير فرع", min: 81, color: "#8A6A1F", bg: TRAINING_COLORS.goldSoft },
];
const TRAINING_CERTIFIED_LEVEL = { id: 5, label: "مدرّب معتمد", color: "#fff", bg: TRAINING_COLORS.pine };

function trainingGetLevel(percent, certified) {
  if (certified) return TRAINING_CERTIFIED_LEVEL;
  return [...TRAINING_LEVELS].reverse().find((l) => percent >= l.min) ?? TRAINING_LEVELS[0];
}

function TrainingLevelBadge({ percent, certified, size = "sm" }) {
  const lvl = trainingGetLevel(percent, certified);
  const isTop = lvl.id === 5;
  return (
    <span style={{
      background: isTop ? TRAINING_COLORS.pine : lvl.bg,
      color: isTop ? "#fff" : lvl.color,
      fontSize: size === "sm" ? 11 : 12.5, fontWeight: 700,
      padding: size === "sm" ? "3px 9px" : "5px 12px", borderRadius: 999,
      whiteSpace: "nowrap", fontFamily: "inherit",
    }}>
      {isTop && "★ "}مستوى {lvl.id} · {lvl.label}
    </span>
  );
}

function TrainingProgressRing({ percent, size = 46, stroke = 5, color = TRAINING_COLORS.gold }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#E8E1D0" strokeWidth={stroke} fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      <text x="50%" y="50%" textAnchor="middle" dy="0.32em" fontSize={size * 0.28} fontWeight="700"
        fill={TRAINING_COLORS.pineDeep} style={{ transform: "rotate(90deg)", transformOrigin: "center" }}>
        {percent}%
      </text>
    </svg>
  );
}

function TrainingStatusBadge({ status }) {
  const map = {
    done: { label: "مكتمل", bg: "#E4EEE4", color: TRAINING_COLORS.pine },
    active: { label: "قيد التنفيذ", bg: TRAINING_COLORS.goldSoft, color: "#8A6A1F" },
    locked: { label: "غير متاح بعد", bg: "#EFEAE0", color: TRAINING_COLORS.muted },
  };
  const s = map[status];
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 999, whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

const CONTROLLED_DRUGS = [
  { name: "ALFENTANIL", list: 1 }, { name: "ALPRAZOLAM", list: 8 },
  { name: "AMFEPRAMONE (diethylpropion)", list: 8 }, { name: "AMFETAMINE", list: 1 },
  { name: "AMOBARBITAL", list: 7 }, { name: "BARBITAL", list: 8 },
  { name: "BENZFETAMINE (Benzphetamine)", list: 8 }, { name: "BENZHEXOL (ARTANE)", list: 5 },
  { name: "BEZITRAMIDE", list: 1 }, { name: "BROMAZEPAM", list: 8 },
  { name: "BROTIZOLAM", list: 8 }, { name: "BUPRENORPHINE", list: 7 },
  { name: "BUTALBITAL", list: 7 }, { name: "BUTOBARBITAL (butobarbita)", list: 8 },
  { name: "CAMAZEPAM", list: 8 }, { name: "Carbamazepine", list: null },
  { name: "CATHINE (+)- norpseudoephedrine", list: 7 }, { name: "CHLORDIAZEPOXIDE", list: 8 },
  { name: "CLOBAZAM", list: 8 }, { name: "CLONAZEPAM", list: 8 },
  { name: "CLORAZEPATE", list: 8 }, { name: "CLOXAZOLAM", list: 8 },
  { name: "CODEINE", list: 2 }, { name: "DELORAZEPAM", list: 8 },
  { name: "DEXAMFETAMINE", list: 1 }, { name: "DIAZEPAM", list: 8 },
  { name: "DIFENOXIN", list: 1 }, { name: "DIHYDROCODEINE", list: 2 },
  { name: "DIPHENOXYLATE", list: 1 }, { name: "DRONABINOL (THC isomers)", list: 1 },
  { name: "Ephedrine", list: 9 }, { name: "Ergometrine", list: 9 },
  { name: "Ergotamine", list: 9 }, { name: "ESTAZOLAM", list: 8 },
  { name: "ETHYLMORPHINE", list: 2 }, { name: "Etizolam", list: 8 },
  { name: "FENPROPOREX", list: 8 }, { name: "FENTANYL", list: 1 },
  { name: "Fualprazolam", list: 8 }, { name: "FLUDIAZEPAM", list: 8 },
  { name: "FLUNITRAZEPAM", list: 7 }, { name: "FLURAZEPAM", list: 8 },
  { name: "gabapentine", list: null }, { name: "GHB", list: 8 },
  { name: "HALOXAZOLAM", list: 8 }, { name: "HYDROCODONE", list: 1 },
  { name: "HYDROMORPHONE", list: 1 }, { name: "KETAZOLAM", list: 8 },
  { name: "Levomethamphetamine", list: 1 }, { name: "LEVORPHANOL", list: 1 },
  { name: "LOPRAZOLAM", list: 8 }, { name: "LORAZEPAM", list: 8 },
  { name: "LORMETAZEPAM", list: 8 }, { name: "MAZINDOL", list: 8 },
  { name: "MEDAZEPAM", list: 8 }, { name: "MEPROBAMATE", list: 8 },
  { name: "MESOCARB", list: 8 }, { name: "METHADONE", list: 1 },
  { name: "METHYLAMPHETAMINE", list: 1 }, { name: "METHYLPHENIDATE", list: 6 },
  { name: "METHYLPHENOBARBITAL", list: 8 }, { name: "METHYPRYLON", list: 8 },
  { name: "MIDAZOLAM", list: 8 }, { name: "MORPHINE", list: 1 },
  { name: "NIMETAZEPAM", list: 8 }, { name: "NITRAZEPAM", list: 8 },
  { name: "NORDAZEPAM", list: 8 }, { name: "OXAZEPAM", list: 8 },
  { name: "OXAZOLAM", list: 8 }, { name: "OXYCODONE", list: 1 },
  { name: "PENTAZOCINE", list: 7 }, { name: "PENTOBARBITAL", list: 7 },
  { name: "PETHIDINE", list: 1 }, { name: "PHENDIMETRAZINE", list: 8 },
  { name: "PHENOBARBITAL", list: 8 }, { name: "PHENTERMINE", list: 8 },
  { name: "PHOLCODINE", list: 2 }, { name: "PINAZEPAM", list: 8 },
  { name: "PIRITRAMIDE", list: 1 }, { name: "PRAZEPAM", list: 8 },
  { name: "Pregabalin", list: null }, { name: "Pseudoephedrine", list: 9 },
  { name: "REMIFENTANIL", list: 1 }, { name: "SECBUTABARBITAL", list: 8 },
  { name: "SUFENTANIL", list: 1 }, { name: "TEMAZEPAM", list: 8 },
  { name: "TETRAZEPAM", list: 8 }, { name: "TILIDINE", list: 1 },
  { name: "Tramdol", list: 1 }, { name: "TRIAZOLAM", list: 8 },
  { name: "Trihexphenidyl", list: null }, { name: "Tropicamide (mydrapid)", list: 7 },
  { name: "VINYLBITAL", list: 8 }, { name: "ZOLPIDEM", list: 8 },
];

function ControlledDrugsList() {
  const [q, setQ] = useState("");
  const filtered = CONTROLLED_DRUGS.filter((d) => d.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "#F6E4E1", border: `1px solid ${TRAINING_COLORS.danger}`, borderRadius: 10, padding: "10px 12px", marginBottom: 10 }}>
        <AlertTriangle size={16} color={TRAINING_COLORS.danger} style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 12.5, color: TRAINING_COLORS.danger, fontWeight: 600, lineHeight: 1.6 }}>
          أي دواء من هذه القائمة يُصرف من الصيدلية لازم يتوثق فوراً بنظام PharmaTrack — بدون استثناء.
        </div>
      </div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="دور على اسم دواء..."
        style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid #E3DCC9", fontSize: 13, marginBottom: 8, boxSizing: "border-box" }} />
      <div style={{ maxHeight: 220, overflowY: "auto", border: "1px solid #EFE9DA", borderRadius: 10 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 12, fontSize: 12.5, color: TRAINING_COLORS.muted }}>ما لكيت نتيجة</div>
        ) : (
          filtered.map((d, i) => (
            <div key={d.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderBottom: i === filtered.length - 1 ? "none" : "1px solid #F2EEE1" }}>
              <span style={{ fontSize: 12.5, color: TRAINING_COLORS.pineDeep }}>{d.name}</span>
              {d.list && <span style={{ fontSize: 10.5, color: TRAINING_COLORS.muted, background: "#F2EEE1", padding: "2px 7px", borderRadius: 999 }}>قائمة {d.list}</span>}
            </div>
          ))
        )}
      </div>
      <div style={{ fontSize: 11, color: TRAINING_COLORS.muted, marginTop: 6 }}>{CONTROLLED_DRUGS.length} دواء مسجل بالقائمة</div>
    </div>
  );
}

const TRAINING_SERVICE_STANDARDS = [
  { title: "الترحيب", text: "استقبال المريض بابتسامة وترحيب واضح فور دخوله." },
  { title: "الاستماع للمريض", text: "إذا المريض يحتاج علاج، لازم تقعده وتسمع منو قبل أي شي." },
  { title: "لغة الجسد أثناء الشرح", text: "رفع اليد أثناء الشرح والتواصل البصري (Eye Contact) مع المريض." },
  { title: "التعامل مع الشكاوى", text: "تعتذر من المريض وتطلب السماح أولاً، وبعدها تحوّل الموضوع لمدير الصيدلية." },
  { title: "التعامل مع مريض غاضب", text: "نفس الأسلوب: اعتذار أولاً، ثم تحويله لمدير الصيدلية." },
  { title: "تأخير صرف العلاج", text: "لازم تعتذر من المريض فوراً عن أي تأخير بالصرف." },
  { title: "فلسفة العمل", text: "المريض على حق دائماً، والمريض هو عائلتنا." },
  { title: "نبرة الصوت", text: "صوت الموظف لازم يكون واضح ومسموع بشكل جيد." },
  { title: "إعلام المراجع بالخدمات", text: "لازم تعلم المراجع بوجود المختبر والدليفري أو أي عرض ثاني متوفر." },
];

function ServiceStandardsList() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {TRAINING_SERVICE_STANDARDS.map((s, i) => (
        <div key={s.title} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "#FAF7EF", border: "1px solid #EFE9DA", borderRadius: 10, padding: "10px 12px" }}>
          <div style={{ width: 22, height: 22, borderRadius: "50%", background: TRAINING_COLORS.pine, color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: TRAINING_COLORS.pineDeep }}>{s.title}</div>
            <div style={{ fontSize: 12.5, color: TRAINING_COLORS.muted, marginTop: 2, lineHeight: 1.7 }}>{s.text}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

const DRUG_BANK = [
  { trade: "بنادول", generic: "Paracetamol", group: "مسكنات ومضادات حرارة" },
  { trade: "بروفين", generic: "Ibuprofen", group: "مضادات التهاب غير ستيرويدية (NSAIDs)" },
  { trade: "أوغمنتين", generic: "Amoxicillin + Clavulanic acid", group: "مضادات حيوية - بنسلينات" },
  { trade: "أموكسيل", generic: "Amoxicillin", group: "مضادات حيوية - بنسلينات" },
  { trade: "زيثروماكس", generic: "Azithromycin", group: "مضادات حيوية - ماكروليدات" },
  { trade: "نيكسيوم", generic: "Esomeprazole", group: "مثبطات مضخة البروتون (PPI)" },
  { trade: "لوسك", generic: "Omeprazole", group: "مثبطات مضخة البروتون (PPI)" },
  { trade: "ليبيتور", generic: "Atorvastatin", group: "خافضات الكوليسترول (ستاتين)" },
  { trade: "كلوكوفاج", generic: "Metformin", group: "أدوية السكري (بايغوانيد)" },
  { trade: "كونكور", generic: "Bisoprolol", group: "حاصرات بيتا" },
  { trade: "فولتارين", generic: "Diclofenac", group: "مضادات التهاب غير ستيرويدية (NSAIDs)" },
  { trade: "فينتولين", generic: "Salbutamol", group: "موسعات قصبية" },
  { trade: "كلاريتين", generic: "Loratadine", group: "مضادات الهيستامين" },
  { trade: "أسبوسيد", generic: "Acetylsalicylic acid (Aspirin)", group: "مسكنات ومضادات تجلط" },
];

function trainingShuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }
function trainingNormalize(s) { return s.trim().toLowerCase(); }
const TRAINING_DAILY_LIMIT = 10;

function TradeNameGame({ onComplete }) {
  const [order] = useState(() => trainingShuffle(DRUG_BANK));
  const [idx, setIdx] = useState(0);
  const [answeredToday, setAnsweredToday] = useState(0);
  const [genericInput, setGenericInput] = useState("");
  const [groupInput, setGroupInput] = useState("");
  const [checked, setChecked] = useState(false);

  const current = order[idx % order.length];
  const doneForToday = answeredToday >= TRAINING_DAILY_LIMIT;
  const genericCorrect = checked && trainingNormalize(genericInput) !== "" && trainingNormalize(current.generic).includes(trainingNormalize(genericInput));
  const groupCorrect = checked && trainingNormalize(groupInput) !== "" && trainingNormalize(current.group).includes(trainingNormalize(groupInput));

  function submit() { setChecked(true); }
  function next() {
    setChecked(false); setGenericInput(""); setGroupInput("");
    setAnsweredToday((n) => n + 1); setIdx((i) => i + 1);
  }

  if (doneForToday) {
    return (
      <div style={{ background: "#FAF7EF", border: "1px solid #EFE9DA", borderRadius: 12, padding: "18px 14px", textAlign: "center" }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: TRAINING_COLORS.pineDeep }}>خلصت أسئلة اليوم ({TRAINING_DAILY_LIMIT}/{TRAINING_DAILY_LIMIT}) ✓</div>
        <div style={{ fontSize: 12, color: TRAINING_COLORS.muted, marginTop: 4 }}>عاود غداً لأسئلة جديدة.</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 10, fontSize: 11, color: TRAINING_COLORS.muted }}>
          <Lock size={11} /> النتيجة تُرسل تلقائياً لـ Owner و Admin فقط
        </div>
        {onComplete && (
          <button onClick={onComplete} style={{ marginTop: 12, background: TRAINING_COLORS.pine, color: "#fff", border: "none", padding: "9px 20px", borderRadius: 999, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
            تم — الانتقال للموديول التالي
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 11.5, color: TRAINING_COLORS.muted, marginBottom: 10 }}>سؤال {answeredToday + 1} من {TRAINING_DAILY_LIMIT} اليوم</div>
      <div style={{ background: TRAINING_COLORS.pine, borderRadius: 14, padding: "18px 16px", textAlign: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 11.5, color: "#CFE0D2" }}>الاسم التجاري</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginTop: 4 }}>{current.trade}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div>
          <div style={{ fontSize: 12, color: TRAINING_COLORS.muted, marginBottom: 4 }}>الاسم العلمي</div>
          <input value={genericInput} onChange={(e) => setGenericInput(e.target.value)} disabled={checked} placeholder="اكتب الاسم العلمي..."
            style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: `1.5px solid ${checked ? (genericCorrect ? TRAINING_COLORS.pine : TRAINING_COLORS.danger) : "#E3DCC9"}`, background: checked ? (genericCorrect ? "#E4EEE4" : "#F6E4E1") : "#fff", fontSize: 13, boxSizing: "border-box" }} />
        </div>
        <div>
          <div style={{ fontSize: 12, color: TRAINING_COLORS.muted, marginBottom: 4 }}>المجموعة الدوائية</div>
          <input value={groupInput} onChange={(e) => setGroupInput(e.target.value)} disabled={checked} placeholder="اكتب المجموعة الدوائية..."
            style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: `1.5px solid ${checked ? (groupCorrect ? TRAINING_COLORS.pine : TRAINING_COLORS.danger) : "#E3DCC9"}`, background: checked ? (groupCorrect ? "#E4EEE4" : "#F6E4E1") : "#fff", fontSize: 13, boxSizing: "border-box" }} />
        </div>
      </div>
      {checked && (
        <div style={{ marginTop: 12, background: "#FAF7EF", border: "1px solid #EFE9DA", borderRadius: 10, padding: "10px 12px", fontSize: 12.5, color: TRAINING_COLORS.pineDeep, lineHeight: 1.8 }}>
          <div><strong>الجواب الصحيح — الاسم العلمي:</strong> {current.generic}</div>
          <div><strong>المجموعة الدوائية:</strong> {current.group}</div>
        </div>
      )}
      <button onClick={checked ? next : submit} disabled={!checked && !genericInput && !groupInput}
        style={{ marginTop: 12, width: "100%", background: TRAINING_COLORS.gold, color: "#fff", border: "none", padding: "10px 0", borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: !checked && !genericInput && !groupInput ? 0.5 : 1 }}>
        {checked ? "السؤال التالي" : "تحقق من الجواب"}
      </button>
    </div>
  );
}

function ComplaintBox({ employeeName, pharmacy }) {
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    if (!text.trim()) return;
    setSubmitting(true);
    setErr("");
    try {
      await addDoc(collection(db, COMPLAINTS_COL), {
        text: text.trim(),
        employeeName: employeeName || 'غير معروف',
        pharmacy: pharmacy || '',
        timestamp: Date.now(),
        dateLabel: formatDate(new Date()),
        timeLabel: formatTime(new Date()),
      });
      setSent(true);
    } catch (e) {
      setErr('صار خطأ، جرب مرة ثانية');
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div style={{ background: "#E4EEE4", border: `1px solid ${TRAINING_COLORS.pine}`, borderRadius: 12, padding: "16px 14px", textAlign: "center" }}>
        <CheckCircle2 size={22} color={TRAINING_COLORS.pine} style={{ marginBottom: 6 }} />
        <div style={{ fontSize: 13.5, fontWeight: 700, color: TRAINING_COLORS.pineDeep }}>توصلت الشكوى ✓</div>
        <div style={{ fontSize: 12, color: TRAINING_COLORS.muted, marginTop: 4, lineHeight: 1.7 }}>راح تظهر عند: مدير الصيدلية، HR، والأدمن المسؤولين عن صيدليتك.</div>
        <button onClick={() => { setSent(false); setText(""); }} style={{ marginTop: 10, background: "transparent", border: `1px solid ${TRAINING_COLORS.pine}`, color: TRAINING_COLORS.pine, padding: "7px 16px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          إرسال شكوى ثانية
        </button>
      </div>
    );
  }
  return (
    <div>
      {!pharmacy && (
        <div style={{ marginBottom: 8, fontSize: 11.5, color: TRAINING_COLORS.danger, background: "#F6E4E1", padding: "8px 10px", borderRadius: 8 }}>
          حسابك ما مرتبط بصيدلية محددة — تواصل مع الإدارة قبل إرسال الشكوى.
        </div>
      )}
      <div style={{ fontSize: 12.5, color: TRAINING_COLORS.muted, marginBottom: 8, lineHeight: 1.7 }}>إذا عندك شكوى بالعمل، اكتبها هنا وترسل مباشرة.</div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="اكتب الشكوى هنا..." rows={4}
        style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #E3DCC9", fontSize: 13, resize: "vertical", boxSizing: "border-box" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8, fontSize: 11, color: TRAINING_COLORS.muted }}>
        <Lock size={11} /> تظهر فقط عند: مدير الصيدلية، HR، الأدمن المسؤولين عن صيدليتك
      </div>
      {err && <div style={{ color: TRAINING_COLORS.danger, fontSize: 12, marginTop: 6 }}>{err}</div>}
      <button onClick={submit} disabled={!text.trim() || submitting}
        style={{ marginTop: 10, width: "100%", background: TRAINING_COLORS.pine, color: "#fff", border: "none", padding: "10px 0", borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: text.trim() ? "pointer" : "not-allowed", opacity: text.trim() ? 1 : 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        {submitting ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}
        إرسال الشكوى
      </button>
    </div>
  );
}

const TRAINING_MODULES = [
  { id: "tm1", icon: Building2, title: "التعريف بالمؤسسة", type: "info", infoText: "", status: "done" },
  { id: "tm2", icon: ShieldCheck, title: "بروتوكول استعمال السستم والكاشير", type: "info", infoText: "", status: "done" },
  { id: "tm3", icon: Pill, title: "التعامل مع الأدوية الخاضعة للرقابة", type: "info", controlledDrugs: true, status: "done" },
  { id: "tm4", icon: Headset, title: "معايير خدمة العملاء", type: "info", standards: true, status: "locked" },
  { id: "tm5", icon: FileText, title: "الأسماء التجارية والعلمية للأدوية", type: "info", drugGame: true, status: "locked" },
  { id: "tm6", icon: AlertTriangle, title: "رفع شكوى بالعمل", type: "info", complaintBox: true, status: "locked" },
];

function TrainingQuizPanel({ quiz, onFinish }) {
  const [answered, setAnswered] = useState(null);
  const question = quiz[0];
  return (
    <div style={{ padding: "14px 4px 4px" }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: TRAINING_COLORS.pineDeep, marginBottom: 10 }}>{question.q}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {question.options.map((opt, i) => {
          const isCorrect = i === question.correct;
          const isChosen = answered === i;
          let bg = "#FFFFFF"; let border = "#E3DCC9";
          if (answered !== null && isChosen) { bg = isCorrect ? "#E4EEE4" : "#F6E4E1"; border = isCorrect ? TRAINING_COLORS.pine : TRAINING_COLORS.danger; }
          else if (answered !== null && isCorrect) { bg = "#E4EEE4"; border = TRAINING_COLORS.pine; }
          return (
            <button key={i} onClick={() => answered === null && setAnswered(i)}
              style={{ textAlign: "right", padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${border}`, background: bg, fontSize: 13.5, color: TRAINING_COLORS.pineDeep, cursor: answered === null ? "pointer" : "default" }}>
              {opt}
            </button>
          );
        })}
      </div>
      {answered !== null && (
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12.5, color: answered === question.correct ? TRAINING_COLORS.pine : TRAINING_COLORS.danger, fontWeight: 600 }}>
            {answered === question.correct ? "إجابة صحيحة ✓" : "إجابة غير دقيقة — راجع الدرس"}
          </span>
          <button onClick={onFinish} style={{ background: TRAINING_COLORS.pine, color: "#fff", border: "none", padding: "8px 16px", borderRadius: 999, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
            إنهاء الموديول
          </button>
        </div>
      )}
    </div>
  );
}

function TrainingPath({ currentUser }) {
  const [modules, setModules] = useState(TRAINING_MODULES);
  const [openId, setOpenId] = useState("tm3");

  const doneCount = modules.filter((m) => m.status === "done").length;
  const overall = Math.round((doneCount / modules.length) * 100);

  function completeModule(id) {
    setModules((prev) =>
      prev.map((m, idx) => {
        if (m.id === id) return { ...m, status: "done" };
        const nextIdx = prev.findIndex((x) => x.id === id) + 1;
        if (idx === nextIdx && m.status === "locked") return { ...m, status: "active" };
        return m;
      })
    );
    const idx = modules.findIndex((m) => m.id === id);
    setOpenId(modules[idx + 1]?.id ?? null);
  }

  return (
    <div>
      <div style={{ background: TRAINING_COLORS.pine, borderRadius: 18, padding: "18px 18px", color: "#fff", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 13, opacity: 0.75 }}>مسار التدريب</div>
          <div style={{ marginTop: 8 }}><TrainingLevelBadge percent={overall} size="md" /></div>
        </div>
        <TrainingProgressRing percent={overall} color={TRAINING_COLORS.gold} size={54} />
      </div>

      <div style={{ position: "relative", paddingRight: 22 }}>
        <div style={{ position: "absolute", right: 9, top: 10, bottom: 10, width: 2, background: "repeating-linear-gradient(to bottom, #D9CFB2 0, #D9CFB2 6px, transparent 6px, transparent 12px)" }} />
        {modules.map((m) => {
          const Icon = m.icon;
          const isOpen = openId === m.id;
          const locked = m.status === "locked";
          return (
            <div key={m.id} style={{ position: "relative", marginBottom: 14 }}>
              <div style={{ position: "absolute", right: 0, top: 18, width: 20, height: 20, borderRadius: "50%", background: m.status === "done" ? TRAINING_COLORS.pine : m.status === "active" ? TRAINING_COLORS.gold : "#E3DCC9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {m.status === "done" ? <CheckCircle2 size={14} color="#fff" /> : m.status === "locked" ? <Lock size={11} color="#8B8368" /> : <Circle size={10} color="#fff" fill="#fff" />}
              </div>
              <div style={{ marginRight: 32, background: TRAINING_COLORS.sandCard, borderRadius: 16, border: locked ? "1px solid #ECE6D6" : "1px solid #E3DCC9", opacity: locked ? 0.6 : 1, boxShadow: isOpen ? "0 4px 18px rgba(31,61,43,0.08)" : "none" }}>
                <button onClick={() => !locked && setOpenId(isOpen ? null : m.id)} disabled={locked}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "13px 14px", background: "transparent", border: "none", cursor: locked ? "not-allowed" : "pointer" }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: TRAINING_COLORS.sand, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={17} color={TRAINING_COLORS.pine} />
                  </div>
                  <div style={{ flex: 1, textAlign: "right" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: TRAINING_COLORS.pineDeep }}>{m.title}</div>
                  </div>
                  {m.type === "info" ? (
                    <span style={{ background: "#EFEAE0", color: TRAINING_COLORS.muted, fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 999, whiteSpace: "nowrap" }}>معلومة</span>
                  ) : (
                    <TrainingStatusBadge status={m.status} />
                  )}
                  {!locked && <ChevronDown size={16} color={TRAINING_COLORS.muted} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />}
                </button>
                {isOpen && !locked && (
                  <div style={{ borderTop: "1px solid #EFE9DA", padding: "0 14px 14px" }}>
                    {m.controlledDrugs ? (
                      <div style={{ padding: "14px 4px 4px" }}><ControlledDrugsList /></div>
                    ) : m.standards ? (
                      <div style={{ padding: "14px 4px 4px" }}>
                        <ServiceStandardsList />
                        {m.status !== "done" && (
                          <button onClick={() => completeModule(m.id)} style={{ marginTop: 14, width: "100%", background: TRAINING_COLORS.pine, color: "#fff", border: "none", padding: "10px 0", borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                            تم
                          </button>
                        )}
                      </div>
                    ) : m.drugGame ? (
                      <div style={{ padding: "14px 4px 4px" }}>
                        <TradeNameGame onComplete={m.status !== "done" ? () => completeModule(m.id) : null} />
                      </div>
                    ) : m.complaintBox ? (
                      <div style={{ padding: "14px 4px 4px" }}>
                        <ComplaintBox employeeName={currentUser?.name} pharmacy={(currentUser?.pharmacies || [])[0]} />
                      </div>
                    ) : (
                      <div style={{ padding: "14px 4px 4px", fontSize: 13.5, lineHeight: 1.8, color: m.infoText ? TRAINING_COLORS.pineDeep : TRAINING_COLORS.muted, fontStyle: m.infoText ? "normal" : "italic" }}>
                        {m.infoText || "— لسه ما انحط النص، تكدر تضيفه بالكود (infoText) —"}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TrainingOverviewForManagers({ employees }) {
  const fieldEmployees = employees.filter((e) => e.role === 'employee');
  return (
    <div>
      <div style={{ background: "#FAF7EF", border: "1px solid #EFE9DA", borderRadius: 12, padding: "14px", marginBottom: 16, fontSize: 12.5, color: TRAINING_COLORS.muted, lineHeight: 1.7 }}>
        هذا عرض مبدئي لقائمة الموظفين. تتبع تقدم كل موظف تلقائياً (نسبة الإكمال، المستوى، النتائج) سيُفعّل عند ربط هذا الموديول بقاعدة بيانات Firestore.
      </div>
      {fieldEmployees.length === 0 ? (
        <div style={{ textAlign: "center", color: TRAINING_COLORS.muted, fontSize: 13.5, padding: "40px 10px" }}>ما اكو موظفين ميدانيين مسجلين بعد</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {fieldEmployees.map((e) => (
            <div key={e.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", border: "1.5px solid #E5E9E6", borderRadius: 12, background: "#fafcfb" }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: TRAINING_COLORS.pineDeep }}>{e.name}</div>
              <TrainingLevelBadge percent={0} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TrainingScreen({ currentUser, role, employees }) {
  return (
    <div style={{ padding: "18px 20px 40px" }}>
      {(role === 'employee' || role === 'store_employee') ? <TrainingPath currentUser={currentUser} /> : <TrainingOverviewForManagers employees={employees} />}
    </div>
  );
}

/* ============================================================
   END TRAINING MODULE ADDITIONS
   ============================================================ */

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
  const [transferTargetId, setTransferTargetId] = useState(null);
  const [transferValue, setTransferValue] = useState('');
  const [transferMsg, setTransferMsg] = useState('');

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

  // supervisor visit report (new, separate collection)
  const [supervisorVisits, setSupervisorVisits] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [spPharmacy, setSpPharmacy] = useState('');
  const [spNotes, setSpNotes] = useState('');
  const [spRating, setSpRating] = useState(0);
  const [spRatingReason, setSpRatingReason] = useState('');
  const [spPhoto, setSpPhoto] = useState(null);
  const [spSubmitting, setSpSubmitting] = useState(false);
  const [spJustSubmitted, setSpJustSubmitted] = useState(false);
  const [spErrors, setSpErrors] = useState({});
  const [spSearch, setSpSearch] = useState('');

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

  const loadSupervisorVisits = useCallback(async () => {
    try {
      const q = query(collection(db, SUPERVISOR_VISITS_COL), orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      setSupervisorVisits(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      try {
        const snap = await getDocs(collection(db, SUPERVISOR_VISITS_COL));
        setSupervisorVisits(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
      } catch (e2) { setSupervisorVisits([]); }
    }
  }, []);

  const loadComplaints = useCallback(async () => {
    try {
      const q = query(collection(db, COMPLAINTS_COL), orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      setComplaints(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      try {
        const snap = await getDocs(collection(db, COMPLAINTS_COL));
        setComplaints(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
      } catch (e2) { setComplaints([]); }
    }
  }, []);

  useEffect(() => {
    (async () => {
      const emps = await loadEmployees();
      await loadPharmacies();
      await loadVisits();
      await loadExpenses();
      await loadSupervisorVisits();
      await loadComplaints();
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
  }, [loadEmployees, loadPharmacies, loadVisits, loadExpenses, loadSupervisorVisits, loadComplaints]);

  function defaultScreenFor(role) {
    if (role === 'owner') return 'owner_home';
    if (role === 'admin') return 'admin_visits';
    if (role === 'supervisor') return 'supervisor_visits';
    if (role === 'manager') return 'manager_visits';
    if (role === 'store_employee') return 'training';
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

  const validateSupervisorReport = () => {
    const errs = {};
    if (!spPharmacy.trim()) errs.pharmacy = 'اختار الصيدلية';
    if (!spNotes.trim()) errs.notes = 'الملاحظات مطلوبة';
    if (!spRating) errs.rating = 'قيّم الصيدلية من 1 إلى 10';
    if (!spRatingReason.trim()) errs.ratingReason = 'اذكر سبب التقييم';
    setSpErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSupervisorSubmit = async () => {
    if (!validateSupervisorReport()) return;
    setSpSubmitting(true);
    const visit = {
      pharmacy: spPharmacy.trim(),
      notes: spNotes.trim(),
      rating: spRating,
      ratingReason: spRatingReason.trim(),
      photo: spPhoto ? spPhoto.dataUrl : null,
      supervisorName: currentUser.name,
      timestamp: Date.now(),
      dateLabel: formatDate(new Date()),
      timeLabel: formatTime(new Date()),
    };
    try {
      await addDoc(collection(db, SUPERVISOR_VISITS_COL), visit);
      await loadSupervisorVisits();
      setSpJustSubmitted(true);
      setSpPharmacy(''); setSpNotes(''); setSpPhoto(null); setSpRating(0); setSpRatingReason('');
      setTimeout(() => { setSpJustSubmitted(false); setScreen('supervisor_my_visits'); }, 900);
    } catch (e) {
      setSpErrors({ submit: 'صار خطأ بالحفظ، جرب مرة ثانية' });
    } finally { setSpSubmitting(false); }
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
    if ((newRole === 'manager' || newRole === 'store_employee') && newPharmacies.length !== 1) {
      setAdminMsg('هذا الدور لازم تختارله صيدلية وحدة بس'); return;
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

  const handleTransfer = async (id) => {
    setTransferMsg('');
    if (!transferValue) { setTransferMsg('اختار الوجهة الجديدة'); return; }
    const emp = employees.find(e => e.id === id);
    if (!emp) return;
    try {
      let newPharmacies = emp.pharmacies || [];
      if (emp.role === 'manager' || emp.role === 'store_employee') {
        newPharmacies = [transferValue]; // transferValue = new pharmacy name
      } else if (emp.role === 'supervisor') {
        const targetAdmin = employees.find(a => a.id === transferValue && a.role === 'admin');
        if (!targetAdmin) { setTransferMsg('اختار أدمن صحيح'); return; }
        newPharmacies = targetAdmin.pharmacies || [];
      }
      await setDoc(doc(db, EMPLOYEES_COL, id), { ...emp, pharmacies: newPharmacies });
      await loadEmployees();
      setTransferMsg('تم النقل ✓');
      setTimeout(() => { setTransferTargetId(null); setTransferMsg(''); setTransferValue(''); }, 1200);
    } catch (e) {
      setTransferMsg('صار خطأ، جرب مرة ثانية');
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

  // ---------- supervisor visit report visibility ----------
  const visibleSupervisorVisits = (() => {
    if (!currentUser) return [];
    if (currentUser.role === 'owner') return supervisorVisits;
    if (currentUser.role === 'admin') {
      const phs = currentUser.pharmacies || [];
      return supervisorVisits.filter(v => phs.includes(v.pharmacy));
    }
    if (currentUser.role === 'manager') {
      const ph = (currentUser.pharmacies || [])[0];
      return supervisorVisits.filter(v => v.pharmacy === ph);
    }
    if (currentUser.role === 'supervisor') {
      return supervisorVisits.filter(v => v.supervisorName === currentUser.name);
    }
    return [];
  })();
  const filteredSupervisorVisits = visibleSupervisorVisits.filter(v => (v.pharmacy || '').toLowerCase().includes(spSearch.toLowerCase()));

  // ---------- complaint visibility ----------
  const visibleComplaints = (() => {
    if (!currentUser) return [];
    if (currentUser.role === 'owner') return complaints;
    if (currentUser.role === 'admin' || currentUser.role === 'supervisor') {
      const phs = currentUser.pharmacies || [];
      return complaints.filter(c => phs.includes(c.pharmacy));
    }
    if (currentUser.role === 'manager') {
      const ph = (currentUser.pharmacies || [])[0];
      return complaints.filter(c => c.pharmacy === ph);
    }
    return [];
  })();

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
        <button onClick={() => setScreen('training')} style={styles.iconBtn} title="التدريب"><GraduationCap size={15} /></button>
        {backTo && <button onClick={() => setScreen(backTo)} style={styles.newBtn}>رجوع</button>}
        <button onClick={handleLogout} style={styles.iconBtn}><LogOut size={15} /></button>
      </div>
    </div>
  );

  // ================= TRAINING (added) =================
  if (screen === 'training') {
    return (
      <div dir="rtl" style={styles.page}>
        <style>{globalCss}</style>
        <div style={styles.shell}>
          <HeaderBar title="التدريب" icon="🎓" backTo={role === 'store_employee' ? null : defaultScreenFor(role)} />
          <TrainingScreen currentUser={currentUser} role={role} employees={employees} />
        </div>
      </div>
    );
  }

  // ================= OWNER HOME =================
  if (screen === 'owner_home') {
    const tiles = [
      { key: 'owner_visits', icon: <FileText size={20} />, label: 'كل الزيارات', sub: `${visits.length} زيارة` },
      { key: 'owner_analytics', icon: <BarChart3 size={20} />, label: 'تحليل حسب الموظف', sub: 'تقييمات وملاحظات' },
      { key: 'owner_report', icon: <FileBarChart size={20} />, label: 'تقرير بفترة زمنية', sub: 'أسبوعي / شهري' },
      { key: 'admin', icon: <Users size={20} />, label: 'إدارة الحسابات', sub: `${employees.length} حساب` },
      { key: 'owner_pharmacies', icon: <Building2 size={20} />, label: 'إدارة الصيدليات', sub: `${pharmacies.length} صيدلية` },
      { key: 'training', icon: <GraduationCap size={20} />, label: 'التدريب', sub: 'مسار الموظفين' },
      { key: 'complaints_view', icon: <AlertTriangle size={20} />, label: 'شكاوى الموظفين', sub: `${complaints.length} شكوى` },
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
            {(role === 'admin' || role === 'supervisor') && (
              <button onClick={() => setScreen('complaints_view')} style={styles.linkBtn}>
                شكاوى الموظفين ({visibleComplaints.length})
              </button>
            )}
            {role === 'supervisor' && (
              <>
                <button onClick={() => setScreen('supervisor_report')} style={styles.linkBtn}>+ تقرير زيارة جديد (بصفتي HR)</button>
                <button onClick={() => setScreen('supervisor_my_visits')} style={styles.linkBtn}>
                  تقاريري كـ HR ({supervisorVisits.filter(v => v.supervisorName === currentUser.name).length})
                </button>
              </>
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
              <option value="store_employee">موظف صيدلية (تدريب فقط)</option>
              <option value="manager">مدير صيدلية (فيور + مصاريف لصيدلية وحدة)</option>
              <option value="supervisor">HR (يتابع عدة صيدليات)</option>
              <option value="admin">ادمن (يتابع صيدليات + تقارير)</option>
              <option value="owner">اونر (صلاحية كاملة)</option>
            </select>

            {(newRole === 'manager' || newRole === 'supervisor' || newRole === 'admin' || newRole === 'store_employee') && (
              <>
                <label style={styles.label}>
                  {(newRole === 'manager' || newRole === 'store_employee') ? 'اختار صيدلية واحدة' : 'اختار الصيدليات (يقدر يشوفها)'}
                </label>
                {pharmacies.length === 0 ? (
                  <div style={{ fontSize: 12.5, color: '#8a948d' }}>ما اكو صيدليات مضافة بعد — روح لـ "إدارة الصيدليات" أول</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {pharmacies.map(ph => (
                      <label key={ph.id} style={styles.checkRow}>
                        <input
                          type={(newRole === 'manager' || newRole === 'store_employee') ? 'radio' : 'checkbox'}
                          name="ph-select"
                          checked={newPharmacies.includes(ph.name)}
                          onChange={() => {
                            if (newRole === 'manager' || newRole === 'store_employee') setNewPharmacies([ph.name]);
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
                      {(emp.role === 'manager' || emp.role === 'store_employee' || emp.role === 'supervisor') && (
                        <button
                          onClick={() => { setTransferTargetId(transferTargetId === emp.id ? null : emp.id); setTransferValue(''); setTransferMsg(''); }}
                          style={styles.resetBtn}
                          title="نقل الحساب"
                        >
                          <Building2 size={14} />
                        </button>
                      )}
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
                  {transferTargetId === emp.id && (
                    <div style={styles.resetPanel}>
                      {emp.role === 'supervisor' ? (
                        <>
                          <label style={{ ...styles.label, marginTop: 8 }}>انقل {emp.name} ليتبع أدمن آخر</label>
                          {employees.filter(a => a.role === 'admin').length === 0 ? (
                            <div style={{ fontSize: 12.5, color: '#8a948d' }}>ما اكو حسابات أدمن بعد</div>
                          ) : (
                            <select style={styles.input} value={transferValue} onChange={(e) => setTransferValue(e.target.value)}>
                              <option value="">-- اختار الأدمن --</option>
                              {employees.filter(a => a.role === 'admin').map(a => (
                                <option key={a.id} value={a.id}>{a.name} ({(a.pharmacies || []).join('، ') || 'بدون صيدليات'})</option>
                              ))}
                            </select>
                          )}
                        </>
                      ) : (
                        <>
                          <label style={{ ...styles.label, marginTop: 8 }}>انقل {emp.name} لصيدلية أخرى</label>
                          {pharmacies.length === 0 ? (
                            <div style={{ fontSize: 12.5, color: '#8a948d' }}>ما اكو صيدليات مضافة بعد</div>
                          ) : (
                            <select style={styles.input} value={transferValue} onChange={(e) => setTransferValue(e.target.value)}>
                              <option value="">-- اختار الصيدلية الجديدة --</option>
                              {pharmacies.map(ph => <option key={ph.id} value={ph.name}>{ph.name}</option>)}
                            </select>
                          )}
                        </>
                      )}
                      {transferMsg && <div style={{ ...styles.errText, color: transferMsg.includes('✓') ? '#1f7a4d' : '#c0392b' }}>{transferMsg}</div>}
                      <button className="btn-primary" style={{ ...styles.submitBtn, marginTop: 10 }} onClick={() => handleTransfer(emp.id)}>
                        تأكيد النقل
                      </button>
                    </div>
                  )}
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
              <button onClick={() => setScreen('training')} style={styles.iconBtn} title="التدريب"><GraduationCap size={15} /></button>
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
            <button onClick={() => setScreen('manager_supervisor_visits')} style={styles.linkBtn}>
              تقارير زيارة HR لصيدليتي ({supervisorVisits.filter(v => v.pharmacy === (currentUser.pharmacies || [])[0]).length})
            </button>
            <button onClick={() => setScreen('complaints_view')} style={styles.linkBtn}>
              شكاوى موظفين صيدليتي ({visibleComplaints.length})
            </button>
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

  // ================= COMPLAINTS (owner / admin / HR / manager) =================
  if (screen === 'complaints_view') {
    return (
      <div dir="rtl" style={styles.page}>
        <style>{globalCss}</style>
        <div style={styles.shell}>
          <HeaderBar title="شكاوى الموظفين" icon="📮" backTo={defaultScreenFor(role)} />
          <div style={{ padding: '18px 20px 40px' }}>
            {visibleComplaints.length === 0 ? (
              <div style={styles.emptyState}>ما اكو شكاوى مسجلة بعد</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {visibleComplaints.map(c => (
                  <div key={c.id} style={styles.analyticsVisitRow}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: '#1f2d26' }}>{c.employeeName}</div>
                      <div style={{ fontSize: 11, color: '#8a948d' }}>{c.pharmacy}</div>
                    </div>
                    <div style={{ fontSize: 11, color: '#8a948d', marginTop: 2 }}>{c.dateLabel} · {c.timeLabel}</div>
                    <div style={{ fontSize: 13, color: '#3a4a41', marginTop: 8, lineHeight: 1.7 }}>{c.text}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ================= SUPERVISOR: NEW VISIT REPORT =================
  if (screen === 'supervisor_report') {
    return (
      <div dir="rtl" style={styles.page}>
        <style>{globalCss}</style>
        <div style={styles.shell}>
          <HeaderBar title="تقرير زيارة (HR)" icon="🧭" backTo="supervisor_visits" />
          <div style={{ padding: '0 20px 100px' }}>
            <label style={styles.label}><MapPin size={14} /> اسم الصيدلية</label>
            <select
              style={{ ...styles.input, ...(spErrors.pharmacy ? styles.inputError : {}) }}
              value={spPharmacy}
              onChange={(e) => { setSpPharmacy(e.target.value); setSpErrors(er => ({ ...er, pharmacy: null })); }}
            >
              <option value="">-- اختار الصيدلية --</option>
              {(currentUser.pharmacies || []).map(ph => <option key={ph} value={ph}>{ph}</option>)}
            </select>
            {spErrors.pharmacy && <div style={styles.errText}>{spErrors.pharmacy}</div>}

            <label style={styles.label}><Star size={14} /> تقييم الصيدلية (من 1 إلى 10)</label>
            <div style={styles.starsRow}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                <button key={n} type="button" onClick={() => { setSpRating(n); setSpErrors(er => ({ ...er, rating: null })); }} style={styles.starBtn}>
                  <Star size={20} fill={n <= spRating ? '#e8a33d' : 'none'} color={n <= spRating ? '#e8a33d' : '#c9d1cb'} />
                </button>
              ))}
              <span style={styles.ratingNum}>{spRating ? `${spRating}/10` : ''}</span>
            </div>
            {spErrors.rating && <div style={styles.errText}>{spErrors.rating}</div>}

            <label style={styles.label}><FileText size={14} /> سبب التقييم</label>
            <textarea
              style={{ ...styles.textarea, ...(spErrors.ratingReason ? styles.inputError : {}) }}
              placeholder="ليش اعطيت هذا التقييم؟"
              value={spRatingReason}
              onChange={(e) => { setSpRatingReason(e.target.value); setSpErrors(er => ({ ...er, ratingReason: null })); }}
              rows={2}
            />
            {spErrors.ratingReason && <div style={styles.errText}>{spErrors.ratingReason}</div>}

            <label style={styles.label}><Camera size={14} /> صورة توثيقية (اختياري)</label>
            {spPhoto ? (
              <div style={styles.photoPreviewWrap}>
                <img src={spPhoto.dataUrl} alt="" style={styles.photoPreview} />
                <button onClick={() => setSpPhoto(null)} style={styles.photoRemove}><X size={14} /></button>
              </div>
            ) : (
              <label className="photo-slot" style={styles.photoSlot}>
                <Camera size={22} color="#2f6b57" />
                <span style={{ fontSize: 13, color: '#5a6b62', marginTop: 6 }}>اضغط لإضافة صورة</span>
                <input type="file" accept="image/*" onChange={handlePhotoChange(setSpPhoto)} style={{ display: 'none' }} />
              </label>
            )}

            <label style={styles.label}><FileText size={14} /> ملاحظات الزيارة</label>
            <textarea
              style={{ ...styles.textarea, ...(spErrors.notes ? styles.inputError : {}) }}
              placeholder="اكتب ملاحظاتك عن الزيارة..."
              value={spNotes}
              onChange={(e) => { setSpNotes(e.target.value); setSpErrors(er => ({ ...er, notes: null })); }}
              rows={4}
            />
            {spErrors.notes && <div style={styles.errText}>{spErrors.notes}</div>}
            {spErrors.submit && <div style={styles.errText}>{spErrors.submit}</div>}

            <button className="btn-primary" style={{ ...styles.submitBtn, opacity: spSubmitting ? 0.75 : 1 }} onClick={handleSupervisorSubmit} disabled={spSubmitting}>
              {spSubmitting ? (<><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> جاري الحفظ...</>) :
                spJustSubmitted ? (<><CheckCircle2 size={16} /> تم الحفظ</>) : ('حفظ التقرير')}
            </button>
            <div style={styles.lockNote}>⚠️ بعد الحفظ، التقرير يصير نهائي وما يمكن تعديله</div>
          </div>
        </div>
      </div>
    );
  }

  // ================= SUPERVISOR: MY VISIT REPORTS =================
  if (screen === 'supervisor_my_visits') {
    const mine = supervisorVisits.filter(v => v.supervisorName === currentUser.name && (v.pharmacy || '').toLowerCase().includes(spSearch.toLowerCase()));
    return (
      <div dir="rtl" style={styles.page}>
        <style>{globalCss}</style>
        <div style={styles.shell}>
          <HeaderBar title="تقاريري كـ HR" icon="🧭" backTo="supervisor_visits" />
          <div style={{ padding: '0 20px 40px' }}>
            <div style={styles.searchWrap}>
              <Search size={16} color="#8a948d" />
              <input style={styles.searchInput} placeholder="ابحث باسم الصيدلية..." value={spSearch} onChange={(e) => setSpSearch(e.target.value)} />
            </div>
            {mine.length === 0 ? (
              <div style={styles.emptyState}><div style={{ fontSize: 32, marginBottom: 8 }}>🕐</div><div>ما اكو تقارير زيارة مسجلة بعد</div></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
                {mine.map((v, i) => (
                  <div className="visit-card" key={v.id} style={{ ...styles.visitCard, animationDelay: `${i * 0.03}s` }}>
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
            <button onClick={() => setScreen('supervisor_report')} style={styles.linkBtn}>+ تقرير زيارة جديد</button>
          </div>
        </div>
      </div>
    );
  }

  // ================= MANAGER: SUPERVISOR VISIT REPORTS FOR MY PHARMACY =================
  if (screen === 'manager_supervisor_visits') {
    const myPh = (currentUser.pharmacies || [])[0];
    const list = supervisorVisits.filter(v => v.pharmacy === myPh);
    return (
      <div dir="rtl" style={styles.page}>
        <style>{globalCss}</style>
        <div style={styles.shell}>
          <HeaderBar title="تقارير زيارة HR" icon="🧭" backTo="manager_visits" />
          <div style={{ padding: '0 20px 40px' }}>
            {list.length === 0 ? (
              <div style={styles.emptyState}>ما اكو تقارير زيارة من HR لهذي الصيدلية بعد</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
                {list.map((v, i) => (
                  <div className="visit-card" key={v.id} style={{ ...styles.visitCard, animationDelay: `${i * 0.03}s` }}>
                    {v.photo ? <img src={v.photo} alt="" style={styles.visitThumb} /> : <div style={styles.visitThumbPlaceholder}>💊</div>}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={styles.visitPharmacy}>{v.supervisorName}</div>
                        {v.rating ? <div style={styles.ratingPillSmall}><Star size={10} fill="#e8a33d" color="#e8a33d" /> {v.rating}/10</div> : null}
                      </div>
                      <div style={styles.visitMeta}>{v.dateLabel} · {v.timeLabel}</div>
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
            <button onClick={() => setScreen('training')} style={styles.iconBtn} title="التدريب"><GraduationCap size={15} /></button>
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
