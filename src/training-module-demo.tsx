import React, { useState } from "react";
import {
  CheckCircle2,
  Circle,
  Lock,
  ChevronDown,
  Clock,
  AlertTriangle,
  Users,
  GraduationCap,
  ShieldCheck,
  Pill,
  Headset,
  FileText,
  Building2,
  X,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Design tokens (see design plan): pine green + warm sand + gold accent.
// Signature element: the training "شريط" — a connected vertical strip of
// capsule-shaped module cards, echoing a blister pack of medicine.
// ---------------------------------------------------------------------------

const COLORS = {
  pine: "#1F3D2B",
  pineDeep: "#14231A",
  sand: "#F6F1E7",
  sandCard: "#FFFFFF",
  gold: "#C99A3B",
  goldSoft: "#EFD9A8",
  muted: "#6B7A6E",
  danger: "#B23A3A",
};

const FONT_IMPORT = `
  @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@500;700;800&family=IBM+Plex+Sans+Arabic:wght@400;500;600&display=swap');
`;

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MODULES = [
  {
    id: "m1",
    icon: Building2,
    title: "التعريف بالمؤسسة",
    type: "info", // بطاقة معلومات فقط — بدون دروس أو اختبار
    // 👇 حط نص رسالة الشركة هنا بين علامتي الاقتباس
    infoText: "",
    status: "done",
  },
  {
    id: "m2",
    icon: ShieldCheck,
    title: "بروتوكول استعمال السستم والكاشير",
    type: "info", // بطاقة معلومات فقط — بدون دروس أو اختبار
    // 👇 حط خطوات استعمال PharmaTrack هنا بين علامتي الاقتباس
    infoText: "",
    status: "done",
  },
  {
    id: "m3",
    icon: Pill,
    title: "التعامل مع الأدوية الخاضعة للرقابة",
    lessons: 4,
    minutes: 18,
    status: "active",
    quiz: [
      {
        q: "صرف دواء خاضع للرقابة يتطلب:",
        options: ["توقيع الزبون فقط", "وصفة موثقة + تسجيل بالنظام", "لا شي، يكفي الطلب الشفهي"],
        correct: 1,
      },
    ],
  },
  {
    id: "m4",
    icon: Headset,
    title: "معايير خدمة العملاء",
    type: "info",
    standards: true, // يعرض قائمة SERVICE_STANDARDS بدل نص عادي
    status: "locked",
  },
  {
    id: "m5",
    icon: FileText,
    title: "الأسماء التجارية والعلمية للأدوية",
    type: "info",
    drugGame: true, // يعرض لعبة TradeNameGame بدل نص عادي
    status: "locked",
  },
  {
    id: "m6",
    icon: AlertTriangle,
    title: "رفع شكوى بالعمل",
    type: "info",
    complaintBox: true, // يعرض ComplaintBox بدل نص عادي
    status: "locked",
  },
];

// Levels 1-4 are earned automatically from completion %.
// Level 5 (مدرّب معتمد) is never automatic — it's a manual grant from
// management once a level-4 employee proves they can train others.
const LEVELS = [
  { id: 1, label: "متدرب", min: 0, color: "#8B8368", bg: "#EFEAE0" },
  { id: 2, label: "مؤهل", min: 21, color: "#7A8B4E", bg: "#EAEEDD" },
  { id: 3, label: "متمرس", min: 51, color: COLORS.pine, bg: "#E4EEE4" },
  { id: 4, label: "خبير فرع", min: 81, color: "#8A6A1F", bg: COLORS.goldSoft },
];
const CERTIFIED_LEVEL = { id: 5, label: "مدرّب معتمد", color: "#fff", bg: COLORS.pine };

function getLevel(percent, certified) {
  if (certified) return CERTIFIED_LEVEL;
  return [...LEVELS].reverse().find((l) => percent >= l.min) ?? LEVELS[0];
}

function LevelBadge({ percent, certified, size = "sm" }) {
  const lvl = getLevel(percent, certified);
  const isTop = lvl.id === 5;
  return (
    <span
      style={{
        background: isTop ? COLORS.pine : lvl.bg,
        color: isTop ? "#fff" : lvl.color,
        fontSize: size === "sm" ? 11 : 12.5,
        fontWeight: 700,
        padding: size === "sm" ? "3px 9px" : "5px 12px",
        borderRadius: 999,
        whiteSpace: "nowrap",
        fontFamily: "IBM Plex Sans Arabic",
      }}
    >
      {isTop && "★ "}
      مستوى {lvl.id} · {lvl.label}
    </span>
  );
}

// قائمة الأدوية الخاضعة للرقابة — أي صرف لأي دواء منها لازم يتوثق فوراً بالنظام
const CONTROLLED_DRUGS = [
  { name: "ALFENTANIL", list: 1 },
  { name: "ALPRAZOLAM", list: 8 },
  { name: "AMFEPRAMONE (diethylpropion)", list: 8 },
  { name: "AMFETAMINE", list: 1 },
  { name: "AMOBARBITAL", list: 7 },
  { name: "BARBITAL", list: 8 },
  { name: "BENZFETAMINE (Benzphetamine)", list: 8 },
  { name: "BENZHEXOL (ARTANE)", list: 5 },
  { name: "BEZITRAMIDE", list: 1 },
  { name: "BROMAZEPAM", list: 8 },
  { name: "BROTIZOLAM", list: 8 },
  { name: "BUPRENORPHINE", list: 7 },
  { name: "BUTALBITAL", list: 7 },
  { name: "BUTOBARBITAL (butobarbita)", list: 8 },
  { name: "CAMAZEPAM", list: 8 },
  { name: "Carbamazepine", list: null },
  { name: "CATHINE (+)- norpseudoephedrine", list: 7 },
  { name: "CHLORDIAZEPOXIDE", list: 8 },
  { name: "CLOBAZAM", list: 8 },
  { name: "CLONAZEPAM", list: 8 },
  { name: "CLORAZEPATE", list: 8 },
  { name: "CLOXAZOLAM", list: 8 },
  { name: "CODEINE", list: 2 },
  { name: "DELORAZEPAM", list: 8 },
  { name: "DEXAMFETAMINE", list: 1 },
  { name: "DIAZEPAM", list: 8 },
  { name: "DIFENOXIN", list: 1 },
  { name: "DIHYDROCODEINE", list: 2 },
  { name: "DIPHENOXYLATE", list: 1 },
  { name: "DRONABINOL (THC isomers)", list: 1 },
  { name: "Ephedrine", list: 9 },
  { name: "Ergometrine", list: 9 },
  { name: "Ergotamine", list: 9 },
  { name: "ESTAZOLAM", list: 8 },
  { name: "ETHYLMORPHINE", list: 2 },
  { name: "Etizolam", list: 8 },
  { name: "FENPROPOREX", list: 8 },
  { name: "FENTANYL", list: 1 },
  { name: "Fualprazolam", list: 8 },
  { name: "FLUDIAZEPAM", list: 8 },
  { name: "FLUNITRAZEPAM", list: 7 },
  { name: "FLURAZEPAM", list: 8 },
  { name: "gabapentine", list: null },
  { name: "GHB", list: 8 },
  { name: "HALOXAZOLAM", list: 8 },
  { name: "HYDROCODONE", list: 1 },
  { name: "HYDROMORPHONE", list: 1 },
  { name: "KETAZOLAM", list: 8 },
  { name: "Levomethamphetamine", list: 1 },
  { name: "LEVORPHANOL", list: 1 },
  { name: "LOPRAZOLAM", list: 8 },
  { name: "LORAZEPAM", list: 8 },
  { name: "LORMETAZEPAM", list: 8 },
  { name: "MAZINDOL", list: 8 },
  { name: "MEDAZEPAM", list: 8 },
  { name: "MEPROBAMATE", list: 8 },
  { name: "MESOCARB", list: 8 },
  { name: "METHADONE", list: 1 },
  { name: "METHYLAMPHETAMINE", list: 1 },
  { name: "METHYLPHENIDATE", list: 6 },
  { name: "METHYLPHENOBARBITAL", list: 8 },
  { name: "METHYPRYLON", list: 8 },
  { name: "MIDAZOLAM", list: 8 },
  { name: "MORPHINE", list: 1 },
  { name: "NIMETAZEPAM", list: 8 },
  { name: "NITRAZEPAM", list: 8 },
  { name: "NORDAZEPAM", list: 8 },
  { name: "OXAZEPAM", list: 8 },
  { name: "OXAZOLAM", list: 8 },
  { name: "OXYCODONE", list: 1 },
  { name: "PENTAZOCINE", list: 7 },
  { name: "PENTOBARBITAL", list: 7 },
  { name: "PETHIDINE", list: 1 },
  { name: "PHENDIMETRAZINE", list: 8 },
  { name: "PHENOBARBITAL", list: 8 },
  { name: "PHENTERMINE", list: 8 },
  { name: "PHOLCODINE", list: 2 },
  { name: "PINAZEPAM", list: 8 },
  { name: "PIRITRAMIDE", list: 1 },
  { name: "PRAZEPAM", list: 8 },
  { name: "Pregabalin", list: null },
  { name: "Pseudoephedrine", list: 9 },
  { name: "REMIFENTANIL", list: 1 },
  { name: "SECBUTABARBITAL", list: 8 },
  { name: "SUFENTANIL", list: 1 },
  { name: "TEMAZEPAM", list: 8 },
  { name: "TETRAZEPAM", list: 8 },
  { name: "TILIDINE", list: 1 },
  { name: "Tramdol", list: 1 },
  { name: "TRIAZOLAM", list: 8 },
  { name: "Trihexphenidyl", list: null },
  { name: "Tropicamide (mydrapid)", list: 7 },
  { name: "VINYLBITAL", list: 8 },
  { name: "ZOLPIDEM", list: 8 },
];

function ControlledDrugsList() {
  const [q, setQ] = useState("");
  const filtered = CONTROLLED_DRUGS.filter((d) => d.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div style={{ marginTop: 4 }}>
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "flex-start",
          background: "#F6E4E1",
          border: `1px solid ${COLORS.danger}`,
          borderRadius: 10,
          padding: "10px 12px",
          marginBottom: 10,
        }}
      >
        <AlertTriangle size={16} color={COLORS.danger} style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 12.5, color: COLORS.danger, fontWeight: 600, lineHeight: 1.6, fontFamily: "IBM Plex Sans Arabic" }}>
          أي دواء من هذه القائمة يُصرف من الصيدلية لازم يتوثق فوراً بنظام PharmaTrack — بدون استثناء.
        </div>
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="دور على اسم دواء..."
        style={{
          width: "100%",
          padding: "9px 12px",
          borderRadius: 10,
          border: "1px solid #E3DCC9",
          fontSize: 13,
          fontFamily: "IBM Plex Sans Arabic",
          marginBottom: 8,
          boxSizing: "border-box",
        }}
      />

      <div style={{ maxHeight: 220, overflowY: "auto", border: "1px solid #EFE9DA", borderRadius: 10 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 12, fontSize: 12.5, color: COLORS.muted, fontFamily: "IBM Plex Sans Arabic" }}>
            ما لكيت نتيجة
          </div>
        ) : (
          filtered.map((d, i) => (
            <div
              key={d.name}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 12px",
                borderBottom: i === filtered.length - 1 ? "none" : "1px solid #F2EEE1",
                fontFamily: "IBM Plex Sans Arabic",
              }}
            >
              <span style={{ fontSize: 12.5, color: COLORS.pineDeep }}>{d.name}</span>
              {d.list && (
                <span style={{ fontSize: 10.5, color: COLORS.muted, background: "#F2EEE1", padding: "2px 7px", borderRadius: 999 }}>
                  قائمة {d.list}
                </span>
              )}
            </div>
          ))
        )}
      </div>
      <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 6, fontFamily: "IBM Plex Sans Arabic" }}>
        {CONTROLLED_DRUGS.length} دواء مسجل بالقائمة
      </div>
    </div>
  );
}

// معايير خدمة العملاء الموحدة — صيدلية صدرية وسكراب سروران
const SERVICE_STANDARDS = [
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
      {SERVICE_STANDARDS.map((s, i) => (
        <div
          key={s.title}
          style={{
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
            background: "#FAF7EF",
            border: "1px solid #EFE9DA",
            borderRadius: 10,
            padding: "10px 12px",
          }}
        >
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: COLORS.pine,
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontFamily: "IBM Plex Sans Arabic",
            }}
          >
            {i + 1}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.pineDeep, fontFamily: "IBM Plex Sans Arabic" }}>{s.title}</div>
            <div style={{ fontSize: 12.5, color: COLORS.muted, marginTop: 2, lineHeight: 1.7, fontFamily: "IBM Plex Sans Arabic" }}>{s.text}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// بنك أسماء تجارية شائعة بالصيدلية → الاسم العلمي والمجموعة الدوائية
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

const DAILY_QUESTION_LIMIT = 10;

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function normalize(s) {
  return s.trim().toLowerCase();
}

function TradeNameGame({ onComplete }) {
  const [order] = useState(() => shuffle(DRUG_BANK));
  const [idx, setIdx] = useState(0);
  const [answeredToday, setAnsweredToday] = useState(0);
  const [genericInput, setGenericInput] = useState("");
  const [groupInput, setGroupInput] = useState("");
  const [checked, setChecked] = useState(false);

  const current = order[idx % order.length];
  const doneForToday = answeredToday >= DAILY_QUESTION_LIMIT;

  const genericCorrect = checked && normalize(genericInput) !== "" && normalize(current.generic).includes(normalize(genericInput));
  const groupCorrect = checked && normalize(groupInput) !== "" && normalize(current.group).includes(normalize(groupInput));

  function submit() {
    setChecked(true);
  }

  function next() {
    setChecked(false);
    setGenericInput("");
    setGroupInput("");
    setAnsweredToday((n) => n + 1);
    setIdx((i) => i + 1);
  }

  if (doneForToday) {
    return (
      <div
        style={{
          background: "#FAF7EF",
          border: "1px solid #EFE9DA",
          borderRadius: 12,
          padding: "18px 14px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 13.5, fontWeight: 700, color: COLORS.pineDeep, fontFamily: "IBM Plex Sans Arabic" }}>
          خلصت أسئلة اليوم ({DAILY_QUESTION_LIMIT}/{DAILY_QUESTION_LIMIT}) ✓
        </div>
        <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4, fontFamily: "IBM Plex Sans Arabic" }}>
          عاود غداً لأسئلة جديدة.
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
            marginTop: 10,
            fontSize: 11,
            color: COLORS.muted,
            fontFamily: "IBM Plex Sans Arabic",
          }}
        >
          <Lock size={11} /> النتيجة تُرسل تلقائياً لـ Owner و Admin فقط
        </div>
        {onComplete && (
          <button
            onClick={onComplete}
            style={{
              marginTop: 12,
              background: COLORS.pine,
              color: "#fff",
              border: "none",
              padding: "9px 20px",
              borderRadius: 999,
              fontSize: 12.5,
              fontWeight: 700,
              fontFamily: "IBM Plex Sans Arabic",
              cursor: "pointer",
            }}
          >
            تم — الانتقال للموديول التالي
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 11.5, color: COLORS.muted, marginBottom: 10, fontFamily: "IBM Plex Sans Arabic" }}>
        سؤال {answeredToday + 1} من {DAILY_QUESTION_LIMIT} اليوم
      </div>
      <div
        style={{
          background: COLORS.pine,
          borderRadius: 14,
          padding: "18px 16px",
          textAlign: "center",
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 11.5, color: "#CFE0D2", fontFamily: "IBM Plex Sans Arabic" }}>الاسم التجاري</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", fontFamily: "Tajawal", marginTop: 4 }}>
          {current.trade}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div>
          <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 4, fontFamily: "IBM Plex Sans Arabic" }}>الاسم العلمي</div>
          <input
            value={genericInput}
            onChange={(e) => setGenericInput(e.target.value)}
            disabled={checked}
            placeholder="اكتب الاسم العلمي..."
            style={{
              width: "100%",
              padding: "9px 12px",
              borderRadius: 10,
              border: `1.5px solid ${checked ? (genericCorrect ? COLORS.pine : COLORS.danger) : "#E3DCC9"}`,
              background: checked ? (genericCorrect ? "#E4EEE4" : "#F6E4E1") : "#fff",
              fontSize: 13,
              fontFamily: "IBM Plex Sans Arabic",
              boxSizing: "border-box",
            }}
          />
        </div>
        <div>
          <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 4, fontFamily: "IBM Plex Sans Arabic" }}>المجموعة الدوائية</div>
          <input
            value={groupInput}
            onChange={(e) => setGroupInput(e.target.value)}
            disabled={checked}
            placeholder="اكتب المجموعة الدوائية..."
            style={{
              width: "100%",
              padding: "9px 12px",
              borderRadius: 10,
              border: `1.5px solid ${checked ? (groupCorrect ? COLORS.pine : COLORS.danger) : "#E3DCC9"}`,
              background: checked ? (groupCorrect ? "#E4EEE4" : "#F6E4E1") : "#fff",
              fontSize: 13,
              fontFamily: "IBM Plex Sans Arabic",
              boxSizing: "border-box",
            }}
          />
        </div>
      </div>

      {checked && (
        <div
          style={{
            marginTop: 12,
            background: "#FAF7EF",
            border: "1px solid #EFE9DA",
            borderRadius: 10,
            padding: "10px 12px",
            fontSize: 12.5,
            color: COLORS.pineDeep,
            fontFamily: "IBM Plex Sans Arabic",
            lineHeight: 1.8,
          }}
        >
          <div><strong>الجواب الصحيح — الاسم العلمي:</strong> {current.generic}</div>
          <div><strong>المجموعة الدوائية:</strong> {current.group}</div>
        </div>
      )}

      <button
        onClick={checked ? next : submit}
        disabled={!checked && !genericInput && !groupInput}
        style={{
          marginTop: 12,
          width: "100%",
          background: COLORS.gold,
          color: "#fff",
          border: "none",
          padding: "10px 0",
          borderRadius: 999,
          fontSize: 13,
          fontWeight: 700,
          fontFamily: "IBM Plex Sans Arabic",
          cursor: "pointer",
          opacity: !checked && !genericInput && !groupInput ? 0.5 : 1,
        }}
      >
        {checked ? "السؤال التالي" : "تحقق من الجواب"}
      </button>
    </div>
  );
}

function ComplaintBox() {
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);

  function submit() {
    if (!text.trim()) return;
    setSent(true);
  }

  if (sent) {
    return (
      <div
        style={{
          background: "#E4EEE4",
          border: `1px solid ${COLORS.pine}`,
          borderRadius: 12,
          padding: "16px 14px",
          textAlign: "center",
        }}
      >
        <CheckCircle2 size={22} color={COLORS.pine} style={{ marginBottom: 6 }} />
        <div style={{ fontSize: 13.5, fontWeight: 700, color: COLORS.pineDeep, fontFamily: "IBM Plex Sans Arabic" }}>
          توصلت الشكوى ✓
        </div>
        <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4, fontFamily: "IBM Plex Sans Arabic", lineHeight: 1.7 }}>
          راح تظهر عند: مدير الصيدلية، المشرف، والأدمن.
        </div>
        <button
          onClick={() => {
            setSent(false);
            setText("");
          }}
          style={{
            marginTop: 10,
            background: "transparent",
            border: `1px solid ${COLORS.pine}`,
            color: COLORS.pine,
            padding: "7px 16px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 700,
            fontFamily: "IBM Plex Sans Arabic",
            cursor: "pointer",
          }}
        >
          إرسال شكوى ثانية
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 12.5, color: COLORS.muted, marginBottom: 8, fontFamily: "IBM Plex Sans Arabic", lineHeight: 1.7 }}>
        إذا عندك شكوى بالعمل، اكتبها هنا وترسل مباشرة.
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="اكتب الشكوى هنا..."
        rows={4}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid #E3DCC9",
          fontSize: 13,
          fontFamily: "IBM Plex Sans Arabic",
          resize: "vertical",
          boxSizing: "border-box",
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          marginTop: 8,
          fontSize: 11,
          color: COLORS.muted,
          fontFamily: "IBM Plex Sans Arabic",
        }}
      >
        <Lock size={11} /> تظهر فقط عند: مدير الصيدلية، المشرف، الأدمن
      </div>
      <button
        onClick={submit}
        disabled={!text.trim()}
        style={{
          marginTop: 10,
          width: "100%",
          background: COLORS.pine,
          color: "#fff",
          border: "none",
          padding: "10px 0",
          borderRadius: 999,
          fontSize: 13,
          fontWeight: 700,
          fontFamily: "IBM Plex Sans Arabic",
          cursor: text.trim() ? "pointer" : "not-allowed",
          opacity: text.trim() ? 1 : 0.5,
        }}
      >
        إرسال الشكوى
      </button>
    </div>
  );
}

const BRANCHES = [
  {
    name: "فرع الكرادة",
    employees: [
      { name: "زينب عودة", progress: 100, overdue: false },
      { name: "حيدر كاظم", progress: 80, overdue: false },
      { name: "مصطفى علي", progress: 40, overdue: true },
    ],
  },
  {
    name: "فرع المنصور",
    employees: [
      { name: "نور صباح", progress: 100, overdue: false },
      { name: "أحمد جبار", progress: 20, overdue: true },
    ],
  },
  {
    name: "فرع الجادرية",
    employees: [
      { name: "سارة فراس", progress: 60, overdue: false },
      { name: "علي حسين", progress: 100, overdue: false, certified: true },
      { name: "دعاء ثامر", progress: 90, overdue: false },
    ],
  },
];

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------

function ProgressRing({ percent, size = 46, stroke = 5, color = COLORS.gold }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#E8E1D0" strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dy="0.32em"
        fontSize={size * 0.28}
        fontWeight="700"
        fill={COLORS.pineDeep}
        style={{ transform: "rotate(90deg)", transformOrigin: "center", fontFamily: "IBM Plex Sans Arabic" }}
      >
        {percent}%
      </text>
    </svg>
  );
}

function StatusBadge({ status }) {
  const map = {
    done: { label: "مكتمل", bg: "#E4EEE4", color: COLORS.pine },
    active: { label: "قيد التنفيذ", bg: COLORS.goldSoft, color: "#8A6A1F" },
    locked: { label: "غير متاح بعد", bg: "#EFEAE0", color: COLORS.muted },
  };
  const s = map[status];
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        fontSize: 12,
        fontWeight: 600,
        padding: "4px 10px",
        borderRadius: 999,
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Trainee (employee) view — the vertical connected "blister strip" path
// ---------------------------------------------------------------------------

function QuizPanel({ quiz, onFinish }) {
  const [answered, setAnswered] = useState(null);

  const question = quiz[0];

  return (
    <div style={{ padding: "14px 4px 4px" }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.pineDeep, marginBottom: 10 }}>
        {question.q}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {question.options.map((opt, i) => {
          const isCorrect = i === question.correct;
          const isChosen = answered === i;
          let bg = "#FFFFFF";
          let border = "#E3DCC9";
          if (answered !== null && isChosen) {
            bg = isCorrect ? "#E4EEE4" : "#F6E4E1";
            border = isCorrect ? COLORS.pine : COLORS.danger;
          } else if (answered !== null && isCorrect) {
            bg = "#E4EEE4";
            border = COLORS.pine;
          }
          return (
            <button
              key={i}
              onClick={() => answered === null && setAnswered(i)}
              style={{
                textAlign: "right",
                padding: "10px 12px",
                borderRadius: 10,
                border: `1.5px solid ${border}`,
                background: bg,
                fontFamily: "IBM Plex Sans Arabic",
                fontSize: 13.5,
                color: COLORS.pineDeep,
                cursor: answered === null ? "pointer" : "default",
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {answered !== null && (
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12.5, color: answered === question.correct ? COLORS.pine : COLORS.danger, fontWeight: 600 }}>
            {answered === question.correct ? "إجابة صحيحة ✓" : "إجابة غير دقيقة — راجع الدرس"}
          </span>
          <button
            onClick={onFinish}
            style={{
              background: COLORS.pine,
              color: "#fff",
              border: "none",
              padding: "8px 16px",
              borderRadius: 999,
              fontSize: 12.5,
              fontWeight: 700,
              fontFamily: "IBM Plex Sans Arabic",
              cursor: "pointer",
            }}
          >
            إنهاء الموديول
          </button>
        </div>
      )}
    </div>
  );
}

function TraineePath() {
  const [modules, setModules] = useState(MODULES);
  const [openId, setOpenId] = useState("m3");
  const [showQuiz, setShowQuiz] = useState(false);

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
    setShowQuiz(false);
    const idx = modules.findIndex((m) => m.id === id);
    setOpenId(modules[idx + 1]?.id ?? null);
  }

  return (
    <div>
      <div
        style={{
          background: COLORS.pine,
          borderRadius: 18,
          padding: "18px 18px",
          color: "#fff",
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ fontSize: 13, opacity: 0.75, fontFamily: "IBM Plex Sans Arabic" }}>مسار التدريب — موظف جديد</div>
          <div style={{ fontSize: 19, fontWeight: 800, fontFamily: "Tajawal", marginTop: 2 }}>
            حيدر كاظم · فرع الكرادة
          </div>
          <div style={{ marginTop: 8 }}>
            <LevelBadge percent={overall} size="md" />
          </div>
        </div>
        <ProgressRing percent={overall} color={COLORS.gold} size={54} />
      </div>

      <div style={{ position: "relative", paddingRight: 22 }}>
        {/* connecting line — the blister-strip signature */}
        <div
          style={{
            position: "absolute",
            right: 9,
            top: 10,
            bottom: 10,
            width: 2,
            background: "repeating-linear-gradient(to bottom, #D9CFB2 0, #D9CFB2 6px, transparent 6px, transparent 12px)",
          }}
        />
        {modules.map((m) => {
          const Icon = m.icon;
          const isOpen = openId === m.id;
          const locked = m.status === "locked";
          return (
            <div key={m.id} style={{ position: "relative", marginBottom: 14 }}>
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: 18,
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: m.status === "done" ? COLORS.pine : m.status === "active" ? COLORS.gold : "#E3DCC9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {m.status === "done" ? (
                  <CheckCircle2 size={14} color="#fff" />
                ) : m.status === "locked" ? (
                  <Lock size={11} color="#8B8368" />
                ) : (
                  <Circle size={10} color="#fff" fill="#fff" />
                )}
              </div>

              <div
                style={{
                  marginRight: 32,
                  background: COLORS.sandCard,
                  borderRadius: 16,
                  border: locked ? "1px solid #ECE6D6" : "1px solid #E3DCC9",
                  opacity: locked ? 0.6 : 1,
                  boxShadow: isOpen ? "0 4px 18px rgba(31,61,43,0.08)" : "none",
                }}
              >
                <button
                  onClick={() => !locked && setOpenId(isOpen ? null : m.id)}
                  disabled={locked}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "13px 14px",
                    background: "transparent",
                    border: "none",
                    cursor: locked ? "not-allowed" : "pointer",
                    fontFamily: "IBM Plex Sans Arabic",
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      background: COLORS.sand,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={17} color={COLORS.pine} />
                  </div>
                  <div style={{ flex: 1, textAlign: "right" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.pineDeep }}>{m.title}</div>
                    {m.type !== "info" && (
                      <div style={{ fontSize: 11.5, color: COLORS.muted, marginTop: 2, display: "flex", gap: 10 }}>
                        <span>{m.lessons} دروس</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          <Clock size={11} /> {m.minutes} د
                        </span>
                      </div>
                    )}
                  </div>
                  {m.type === "info" ? (
                    <span
                      style={{
                        background: "#EFEAE0",
                        color: COLORS.muted,
                        fontSize: 12,
                        fontWeight: 600,
                        padding: "4px 10px",
                        borderRadius: 999,
                        whiteSpace: "nowrap",
                        fontFamily: "IBM Plex Sans Arabic",
                      }}
                    >
                      معلومة
                    </span>
                  ) : (
                    <StatusBadge status={m.status} />
                  )}
                  {!locked && (
                    <ChevronDown
                      size={16}
                      color={COLORS.muted}
                      style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
                    />
                  )}
                </button>

                {isOpen && !locked && (
                  <div style={{ borderTop: "1px solid #EFE9DA", padding: "0 14px 14px" }}>
                    {m.type === "info" ? (
                      m.standards ? (
                        <div style={{ padding: "14px 4px 4px" }}>
                          <ServiceStandardsList />
                          {m.status !== "done" && (
                            <button
                              onClick={() => completeModule(m.id)}
                              style={{
                                marginTop: 14,
                                width: "100%",
                                background: COLORS.pine,
                                color: "#fff",
                                border: "none",
                                padding: "10px 0",
                                borderRadius: 999,
                                fontSize: 13,
                                fontWeight: 700,
                                fontFamily: "IBM Plex Sans Arabic",
                                cursor: "pointer",
                              }}
                            >
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
                          <ComplaintBox />
                        </div>
                      ) : (
                      <div
                        style={{
                          padding: "14px 4px 4px",
                          fontSize: 13.5,
                          lineHeight: 1.8,
                          color: m.infoText ? COLORS.pineDeep : COLORS.muted,
                          fontFamily: "IBM Plex Sans Arabic",
                          fontStyle: m.infoText ? "normal" : "italic",
                        }}
                      >
                        {m.infoText || "— لسه ما انحط نص رسالة الشركة، تكدر تضيفه بالكود (infoText) —"}
                      </div>
                      )
                    ) : m.status === "done" ? (
                      <div style={{ padding: "12px 4px", fontSize: 12.5, color: COLORS.muted, fontFamily: "IBM Plex Sans Arabic" }}>
                        أنجزت هذا الموديول ✓ — يمكنك مراجعته بأي وقت من "دروسي".
                        {m.id === "m3" && <ControlledDrugsList />}
                      </div>
                    ) : !showQuiz ? (
                      <div style={{ padding: "10px 2px" }}>
                        {m.id === "m3" && <ControlledDrugsList />}
                        <div style={{ fontSize: 12.5, color: COLORS.muted, marginBottom: 10, marginTop: m.id === "m3" ? 12 : 0, fontFamily: "IBM Plex Sans Arabic" }}>
                          {m.lessons} دروس فيديو قصيرة + اختبار سريع من سؤال واحد للتأكد من الفهم.
                        </div>
                        <button
                          onClick={() => setShowQuiz(true)}
                          style={{
                            background: COLORS.gold,
                            color: "#fff",
                            border: "none",
                            padding: "9px 18px",
                            borderRadius: 999,
                            fontSize: 12.5,
                            fontWeight: 700,
                            fontFamily: "IBM Plex Sans Arabic",
                            cursor: "pointer",
                          }}
                        >
                          بدء الدروس والاختبار
                        </button>
                      </div>
                    ) : (
                      <QuizPanel quiz={m.quiz} onFinish={() => completeModule(m.id)} />
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

// ---------------------------------------------------------------------------
// Manager dashboard view
// ---------------------------------------------------------------------------

function ManagerDashboard() {
  const [openBranch, setOpenBranch] = useState(null);
  const allEmployees = BRANCHES.flatMap((b) => b.employees);
  const avg = Math.round(allEmployees.reduce((s, e) => s + e.progress, 0) / allEmployees.length);
  const overdueCount = allEmployees.filter((e) => e.overdue).length;

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 18,
        }}
      >
        <div style={{ flex: 1, background: COLORS.pine, borderRadius: 16, padding: "14px 16px", color: "#fff" }}>
          <div style={{ fontSize: 11.5, opacity: 0.75, fontFamily: "IBM Plex Sans Arabic" }}>متوسط الإنجاز</div>
          <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "Tajawal", marginTop: 4 }}>{avg}%</div>
        </div>
        <div style={{ flex: 1, background: COLORS.sandCard, border: "1px solid #E3DCC9", borderRadius: 16, padding: "14px 16px" }}>
          <div style={{ fontSize: 11.5, color: COLORS.muted, fontFamily: "IBM Plex Sans Arabic" }}>موظفين متأخرين</div>
          <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "Tajawal", marginTop: 4, color: COLORS.danger, display: "flex", alignItems: "center", gap: 6 }}>
            <AlertTriangle size={19} /> {overdueCount}
          </div>
        </div>
      </div>

      {BRANCHES.map((branch) => {
        const isOpen = openBranch === branch.name;
        const branchAvg = Math.round(branch.employees.reduce((s, e) => s + e.progress, 0) / branch.employees.length);
        return (
          <div
            key={branch.name}
            style={{
              background: COLORS.sandCard,
              border: "1px solid #E3DCC9",
              borderRadius: 16,
              marginBottom: 10,
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => setOpenBranch(isOpen ? null : branch.name)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "13px 14px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontFamily: "IBM Plex Sans Arabic",
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: COLORS.sand,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Building2 size={17} color={COLORS.pine} />
              </div>
              <div style={{ flex: 1, textAlign: "right" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.pineDeep }}>{branch.name}</div>
                <div style={{ fontSize: 11.5, color: COLORS.muted, marginTop: 2 }}>{branch.employees.length} موظفين</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.pine, fontFamily: "IBM Plex Sans Arabic" }}>{branchAvg}%</div>
              <ChevronDown size={16} color={COLORS.muted} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            </button>

            {isOpen && (
              <div style={{ borderTop: "1px solid #EFE9DA" }}>
                {branch.employees.map((e) => (
                  <div
                    key={e.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "11px 14px",
                      borderBottom: "1px solid #F2EEE1",
                    }}
                  >
                    <ProgressRing percent={e.progress} size={36} stroke={4} color={e.overdue ? COLORS.danger : COLORS.gold} />
                    <div style={{ flex: 1, textAlign: "right" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.pineDeep, fontFamily: "IBM Plex Sans Arabic" }}>{e.name}</div>
                      </div>
                      <div style={{ marginTop: 4 }}>
                        <LevelBadge percent={e.progress} certified={e.certified} />
                      </div>
                      {e.overdue && (
                        <div style={{ fontSize: 11, color: COLORS.danger, marginTop: 2, fontFamily: "IBM Plex Sans Arabic" }}>
                          متأخر عن الموعد المحدد
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

export default function TrainingModuleDemo() {
  return (
    <div dir="rtl" style={{ background: COLORS.sand, minHeight: "100vh", fontFamily: "IBM Plex Sans Arabic" }}>
      <style>{FONT_IMPORT}</style>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px 16px 40px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <GraduationCap size={20} color={COLORS.pine} />
          <span style={{ fontSize: 13, color: COLORS.muted, fontWeight: 600 }}>Sarwaran Group</span>
        </div>
        <h1 style={{ fontFamily: "Tajawal", fontWeight: 800, fontSize: 22, color: COLORS.pineDeep, margin: "2px 0 6px" }}>
          منصة التدريب والاعتماد الداخلي
        </h1>
        <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 16, fontFamily: "IBM Plex Sans Arabic" }}>
          حساب: موظف
        </div>

        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            marginBottom: 20,
            paddingBottom: 16,
            borderBottom: "1px dashed #DED5BC",
          }}
        >
          {LEVELS.map((l) => (
            <LevelBadge key={l.id} percent={l.min} />
          ))}
          <LevelBadge percent={100} certified />
        </div>

        <TraineePath />
      </div>
    </div>
  );
}
