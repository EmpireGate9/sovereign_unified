// =======================
// إعدادات عامة
// =======================
const BACKEND_URL   = "https://sovereign-backend-rhel.onrender.com";
const REGISTER_PATH = "/api/auth/register";
const LOGIN_PATH    = "/api/auth/login";

let token     = localStorage.getItem("token") || "";
let sessionId = localStorage.getItem("session_id");
if (!sessionId) {
  sessionId = crypto.randomUUID();
  localStorage.setItem("session_id", sessionId);
}

// =======================
// دالة مساعدة لرسائل مختصرة
// =======================
function showShortError(message) {
  alert(message || "حدث خطأ غير متوقع");
}

// =======================
// عرض الواجهة الرئيسية
// =======================
function setView(html) {
  const v = document.getElementById("view");
  if (v) v.innerHTML = html;
}

// =======================
// واجهة الحساب (تسجيل/دخول)
// =======================
function authView() {
  setView(`
  <section class="card">
    <h2 style="text-align:right;margin-bottom:24px">الحساب</h2>
    <div class="row">
      <div class="col">
        <h3>تسجيل مستخدم جديد</h3>
        <input id="r_email" placeholder="email@example.com" />
        <input id="r_name" placeholder="الاسم" />
        <input id="r_pass" type="password" placeholder="كلمة المرور" />
        <div class="actions"><button onclick="register()">تسجيل</button></div>
      </div>
      <div class="col">
        <h3>دخول مستخدم مسجل</h3>
        <input id="l_email" placeholder="email@example.com" />
        <input id="l_pass" type="password" placeholder="كلمة المرور" />
        <div class="actions"><button onclick="login()">دخول</button></div>
      </div>
    </div>
    <p class="small" style="margin-top:24px;color:#aaa">
      ${token ? "تم تسجيل الدخول. يمكنك الانتقال إلى المشاريع والملفات والدردشة." : "لم يتم تسجيل الدخول بعد."}
    </p>
  </section>
  `);
}

// =======================
// واجهة المشاريع
// =======================
function projectsView() {
  setView(`
  <section class="card">
    <h3>المشاريع</h3>
    <div class="row">
      <div class="col"><input id="p_name" placeholder="اسم المشروع"/></div>
      <div class="col"><input id="p_desc" placeholder="وصف"/></div>
    </div>
    <div class="actions">
      <button onclick="createProject()">إنشاء</button>
      <button onclick="listProjects()">تحديث القائمة</button>
    </div>
    <div id="projects_list" class="card small">—</div>
  </section>
  `);
}

// =======================
// واجهة الملفات
// =======================
function filesView() {
  setView(`
  <section class="card">
    <h3>الملفات</h3>
    <div class="row">
      <div class="col">
        <input id="f_pid" placeholder="رقم المشروع (ID)"/>
      </div>
      <div class="col">
        <input id="file_input" type="file"/>
      </div>
    </div>
    <div class="actions">
      <button onclick="uploadFile()">رفع الملف</button>
      <button onclick="listFiles()">عرض الملفات</button>
    </div>
    <div id="files_list" class="card small">—</div>
  </section>
  `);
}

// =======================
// واجهة الدردشة
// =======================
function chatView() {
  setView(`
  <section class="card">
    <h3>الدردشة</h3>
    <div class="row">
      <div class="col"><input id="c_pid" placeholder="رقم المشروع (يمكن تركه فارغ)"/></div>
      <div class="col"><input id="c_text" placeholder="اكتب رسالة"/></div>
    </div>
    <p class="small">Session ID: <code>${sessionId}</code></p>
    <div class="actions">
      <button onclick="sendMsg()">إرسال</button>
      <button onclick="loadHistory()">تحديث السجل</button>
    </div>
    <pre id="chat_box" class="small">—</pre>
  </section>
  `);
}

// =======================
// واجهات الصوت / الكاميرا / الحوكمة (كما هي سابقاً)
// =======================
function voiceView() {
  setView(`
  <section class="card">
    <h3>الصوت (تجريبي)</h3>
    <div class="row">
      <div class="col"><input id="v_pid" placeholder="رقم المشروع (اختياري)"/></div>
    </div>
    <div class="actions">
      <button id="rec_btn">بدء التسجيل</button>
      <button onclick="uploadAudio()">رفع المقطع</button>
    </div>
    <p class="small">يحتاج المتصفح دعم MediaRecorder.</p>
    <pre id="voice_resp" class="small">—</pre>
  </section>
  `);

  window._chunks = [];
  let mediaRecorder;
  const btn = document.getElementById("rec_btn");

  if (btn) {
    btn.onclick = async () => {
      try {
        if (!mediaRecorder) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaRecorder = new MediaRecorder(stream);
          mediaRecorder.ondataavailable = (e) => _chunks.push(e.data);
          mediaRecorder.start();
          btn.textContent = "إيقاف التسجيل";
        } else {
          mediaRecorder.stop();
          btn.textContent = "بدء التسجيل";
          mediaRecorder = null;
        }
      } catch (err) {
        console.error(err);
        showShortError("حدث خطأ في الميكروفون");
      }
    };
  }
}

function visionView() {
  setView(`
  <section class="card">
    <h3>الكاميرا (تجريبي)</h3>
    <div class="row"><div class="col"><input id="i_pid" placeholder="رقم المشروع (اختياري)"/></div></div>
    <video id="vid" autoplay playsinline style="max-width:100%;border-radius:12px;border:1px solid #333"></video>
    <div class="actions">
      <button id="cam_btn">تشغيل/إيقاف</button>
      <button onclick="snap()">التقاط & رفع</button>
    </div>
    <canvas id="cv" style="display:none"></canvas>
    <pre id="img_resp" class="small">—</pre>
  </section>
  `);

  let stream;
  const v = document.getElementById("vid");
  const btn = document.getElementById("cam_btn");

  if (btn) {
    btn.onclick = async () => {
      try {
        if (!stream) {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
          v.srcObject = stream;
        } else {
          stream.getTracks().forEach((t) => t.stop());
          stream = null;
          v.srcObject = null;
        }
      } catch (err) {
        console.error(err);
        showShortError("حدث خطأ في الكاميرا");
      }
    };
  }
}

function govView() {
  setView(`
  <section class="card">
    <h3>الحوكمة</h3>
    <input id="pol_name" placeholder="اسم السياسة (admin فقط)"/>
    <textarea id="pol_rules" placeholder='{"allow":["admin"],"deny":["*"]}'></textarea>
    <div class="actions">
      <button onclick="createPolicy()">إنشاء سياسة</button>
      <button onclick="listPolicies()">عرض السياسات</button>
    </div>
    <pre id="pol_out" class="small">—</pre>
  </section>
  `);
}

// =======================
// دوال الحساب (تسجيل / دخول)
// =======================
async function register() {
  try {
    const email = document.getElementById("r_email").value.trim();
    const name  = document.getElementById("r_name").value.trim();
    const pass  = document.getElementById("r_pass").value;

    const res = await fetch(BACKEND_URL + REGISTER_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pass, full_name: name })
    });

    const text = await res.text();
    if (res.ok) {
      alert("تم التسجيل");
    } else {
      showShortError(text || "فشل التسجيل");
    }
  } catch (err) {
    console.error(err);
    showShortError("فشل التسجيل (خطأ اتصال)");
  }
}

async function login() {
  try {
    const email = document.getElementById("l_email").value.trim();
    const pass  = document.getElementById("l_pass").value;

    const res = await fetch(BACKEND_URL + LOGIN_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pass })
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.access_token) {
      token = data.access_token;
      localStorage.setItem("token", token);
      alert("تم تسجيل الدخول");
