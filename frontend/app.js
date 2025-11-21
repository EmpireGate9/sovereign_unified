/* ===========================
   إعدادات عامة
=========================== */

const BACKEND_URL = "https://sovereign-backend-rhel.onrender.com";

// مسارات ثابتة
const REGISTER_PATH  = "/api/auth/register";
const LOGIN_PATH     = "/api/auth/login";
const PROJECTS_PATH  = "/api/projects";
const FILES_BASE     = "/api/files";
const CHAT_BASE      = "/api/chat";
const ANALYSIS_BASE  = "/api/analysis";

// التوكن + بيانات المستخدم + session
let token     = localStorage.getItem("token") || "";
let userName  = localStorage.getItem("user_name") || "";
let userEmail = localStorage.getItem("user_email") || "";

function ensureSessionId() {
  let s = localStorage.getItem("session_id");
  if (!s) {
    if (crypto && crypto.randomUUID) {
      s = crypto.randomUUID();
    } else {
      s = "sess-" + Date.now() + "-" + Math.random().toString(16).slice(2);
    }
    localStorage.setItem("session_id", s);
  }
  return s;
}

const SESSION_ID = ensureSessionId();

/* ===========================
   دوال عامة
=========================== */

function setView(html) {
  const root = document.getElementById("view");
  if (root) root.innerHTML = html;
}

function showError(msg) {
  alert(msg || "خطأ غير متوقع");
}

function showInfo(msg) {
  alert(msg);
}

/* زر تسجيل الخروج في الشريط العلوي */
function updateLogoutButton() {
  const navLogout = document.getElementById("nav-logout");
  if (!navLogout) return;
  navLogout.style.display = token ? "inline-block" : "none";
}

function logout() {
  token = "";
  localStorage.removeItem("token");
  // نترك session_id كما هو للدردشة
  showInfo("تم تسجيل الخروج");
  authView();
  updateLogoutButton();
}

/* ===========================
   واجهة الحساب
=========================== */

function renderLoggedInAccount() {
  const displayName =
    userName ||
    userEmail ||
    "مستخدم";
  setView(`
    <section class="card">
      <h2 style="text-align:right;margin-bottom:16px">الحساب</h2>
      <p style="margin-bottom:8px;text-align:right">
        تم تسجيل الدخول كـ <strong>${displayName}</strong>
      </p>
      <p class="small" style="opacity:0.8;text-align:right">
        يمكنك الآن إدارة مشاريعك وملفاتك والدردشة من خلال الأيقونات في الأعلى.
      </p>
    </section>
  `);
}

function authView() {
  if (token) {
    // مستخدم مسجل الدخول بالفعل
    renderLoggedInAccount();
    return;
  }

  setView(`
    <section class="card">
      <h2 style="text-align:right;margin-bottom:24px">الحساب</h2>
      <div class="row">
        <div class="col">
          <h3>تسجيل مستخدم جديد</h3>
          <input id="r_email" placeholder="email@example.com" />
          <input id="r_name" placeholder="الاسم" />
          <input id="r_pass" type="password" placeholder="كلمة المرور" />
          <div class="actions">
            <button onclick="register()">تسجيل</button>
          </div>
        </div>
        <div class="col">
          <h3>دخول مستخدم مسجل</h3>
          <input id="l_email" placeholder="email@example.com" />
          <input id="l_pass" type="password" placeholder="كلمة المرور" />
          <div class="actions">
            <button onclick="login()">دخول</button>
          </div>
        </div>
      </div>
    </section>
  `);
}

/* ===========================
   واجهة المشاريع
=========================== */

function projectsView() {
  setView(`
    <section class="card">
      <h2 style="text-align:right;margin-bottom:24px">المشاريع</h2>
      <div class="row">
        <div class="col"><input id="p_name" placeholder="اسم المشروع" /></div>
        <div class="col"><input id="p_desc" placeholder="وصف المشروع" /></div>
      </div>
      <div class="actions" style="margin-top:16px">
        <button onclick="createProject()">إنشاء</button>
        <button onclick="listProjects()">تحديث القائمة</button>
      </div>

      <div id="projects_list" class="card small" style="margin-top:16px">—</div>
    </section>
  `);
}

/* ===========================
   واجهة الملفات
=========================== */

function filesView() {
  setView(`
    <section class="card">
      <h2 style="text-align:right;margin-bottom:24px">الملفات</h2>
      <div class="row">
        <div class="col"><input id="f_pid" placeholder="رقم المشروع" /></div>
        <div class="col"><input id="file_input" type="file" /></div>
      </div>
      <div class="actions" style="margin-top:16px">
        <button onclick="uploadFile()">رفع ملف</button>
        <button onclick="listFiles()">عرض الملفات</button>
        <button onclick="analyzeFile()">تحليل ومعالجة</button>
      </div>

      <pre id="file_resp" class="small" style="margin-top:16px">—</pre>
    </section>
  `);
}

/* ===========================
   واجهة الدردشة
=========================== */

function chatView() {
  setView(`
    <section class="card">
      <h2 style="text-align:right;margin-bottom:24px">الدردشة</h2>
      <div class="row">
        <div class="col"><input id="c_pid" placeholder="رقم المشروع (اختياري)" /></div>
        <div class="col"><input id="c_text" placeholder="اكتب رسالتك" /></div>
      </div>

      <p class="small" style="margin-top:8px">Session ID: ${SESSION_ID}</p>

      <div class="actions">
        <button onclick="sendMsg()">إرسال</button>
        <button onclick="loadHistory()">تحديث السجل</button>
      </div>

      <div id="chat_box" class="card small" style="margin-top:16px;white-space:pre-wrap">—</div>
    </section>
  `);
}

/* ===========================
   تسجيل مستخدم جديد
=========================== */

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
      // نحفظ الاسم والإيميل محلياً لعرضه بعد تسجيل الدخول
      userName  = name;
      userEmail = email;
      localStorage.setItem("user_name", userName);
      localStorage.setItem("user_email", userEmail);
      showInfo("تم التسجيل بنجاح");
    } else {
      showError(text || "فشل التسجيل");
    }

  } catch (err) {
    console.error(err);
    showError("فشل التسجيل");
  }
}

/* ===========================
   تسجيل الدخول
=========================== */

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

      // نخزن الإيميل لاستخدامه لاحقاً في عرض الاسم إن لم يتوفر الاسم
      if (email) {
        userEmail = email;
        localStorage.setItem("user_email", userEmail);
      }

      showInfo("تم تسجيل الدخول");
      updateLogoutButton();
      authView(); // يبقى في صفحة الحساب لكن بحالة "مسجل الدخول"

    } else {
      showError(data.detail || "فشل تسجيل الدخول");
    }

  } catch (err) {
    console.error(err);
    showError("فشل تسجيل الدخول");
  }
}

/* ===========================
   إنشاء مشروع
=========================== */

async function createProject() {
  const box = document.getElementById("projects_list");

  try {
    const name = document.getElementById("p_name").value.trim();
    const desc = document.getElementById("p_desc").value.trim();

    const url = BACKEND_URL + PROJECTS_PATH;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + (token || "")
      },
      body: JSON.stringify({ name, description: desc })
    });

    const text = await res.text();

    box.innerHTML = `<pre>Status: ${res.status}\n${text}</pre>`;

    if (res.ok) {
      listProjects();
    } else {
      showError("فشل إنشاء المشروع");
    }

  } catch (err) {
    console.error(err);
    showError("خطأ في إنشاء المشروع");
    if (box) box.textContent = "خطأ في الاتصال بالخادم.";
  }
}

/* ===========================
   قائمة المشاريع
=========================== */

async function listProjects() {
  const box = document.getElementById("projects_list");
  try {
    const url = BACKEND_URL + PROJECTS_PATH;
    const res = await fetch(url, {
      headers: { "Authorization": "Bearer " + (token || "") }
    });

    if (!res.ok) {
      box.textContent = "فشل جلب المشاريع";
      return;
    }

    const data = await res.json().catch(() => []);
    box.innerHTML =
      "<ul>" +
      data.map(p => `<li>${p.id} — ${p.name}</li>`).join("") +
      "</ul>";

  } catch (err) {
    console.error(err);
    box.textContent = "خطأ في جلب المشاريع";
  }
}

/* ===========================
   رفع ملف
=========================== */

async function uploadFile() {
  const out = document.getElementById("file_resp");

  try {
    const pid = parseInt(document.getElementById("f_pid").value.trim(), 10);
    const f   = document.getElementById("file_input").files[0];

    const fd = new FormData();
    fd.append("project_id", pid);
    fd.append("file", f);

    const url = BACKEND_URL + FILES_BASE + "/upload";

    const res = await fetch(url, {
      method: "POST",
      headers: { "Authorization": "Bearer " + (token || "") },
      body: fd
    });

    const text = await res.text();
    out.textContent = text;

  } catch (err) {
    console.error(err);
    out.textContent = "خطأ";
  }
}

/* ===========================
   عرض الملفات
=========================== */

async function listFiles() {
  const out = document.getElementById("file_resp");
  try {
    const pid = document.getElementById("f_pid").value.trim();
    const url = `${BACKEND_URL + FILES_BASE}/list?project_id=${pid}`;

    const res = await fetch(url);
    const text = await res.text();
    out.textContent = text;

  } catch (err) {
    console.error(err);
    out.textContent = "خطأ في جلب الملفات";
  }
}

/* ===========================
   تحليل ملف
=========================== */

async function analyzeFile() {
  const out = document.getElementById("file_resp");
  try {
    const pid = parseInt(document.getElementById("f_pid").value.trim(), 10);

    const listUrl = `${BACKEND_URL + FILES_BASE}/list?project_id=${pid}`;
    const listRes = await fetch(listUrl);
    const listData = await listRes.json();

    if (!Array.isArray(listData) || !listData.length) {
      showError("لا يوجد ملفات");
      return;
    }

    const file_id = listData[0].id;

    const analyzeUrl = BACKEND_URL + ANALYSIS_BASE + "/run";
    const res = await fetch(analyzeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + (token || "")
      },
      body: JSON.stringify({
        project_id: pid,
        file_id: file_id
      })
    });

    const text = await res.text();
    out.textContent = text;

  } catch (err) {
    console.error(err);
    out.textContent = "فشل تحليل الملف";
  }
}

/* ===========================
   إرسال رسالة للدردشة
=========================== */

async function sendMsg() {
  try {
    const pidRaw = document.getElementById("c_pid").value.trim();
    const text   = document.getElementById("c_text").value.trim();

    const project_id = pidRaw ? parseInt(pidRaw, 10) : null;

    const url = BACKEND_URL + CHAT_BASE + "/send";

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + (token || "")
      },
      body: JSON.stringify({
        project_id: project_id,
        content: text,
        session_id: SESSION_ID
      })
    });

    if (!res.ok) {
      showError("فشل الإرسال");
      return;
    }

    const replyUrl = BACKEND_URL + CHAT_BASE + "/reply";
    const replyRes = await fetch(replyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + (token || "")
      },
      body: JSON.stringify({
        project_id: project_id,
        content: text,
        session_id: SESSION_ID
      })
    });

    if (!replyRes.ok) {
      showError("فشل الحصول على الرد");
      return;
    }

    await loadHistory();

  } catch (err) {
    console.error(err);
    showError("خطأ بالدردشة");
  }
}

/* ===========================
   جلب السجل
=========================== */

async function loadHistory() {
  try {
    const pidRaw = document.getElementById("c_pid").value.trim();
    const project_id = pidRaw ? parseInt(pidRaw, 10) : null;
    const box = document.getElementById("chat_box");

    let url = BACKEND_URL + CHAT_BASE + "/history";
    const params = new URLSearchParams();
    params.set("session_id", SESSION_ID);
    if (project_id) params.set("project_id", project_id);
    url += "?" + params.toString();

    const res = await fetch(url, {
      headers: { "Authorization": "Bearer " + (token || "") }
    });

    const data = await res.json().catch(() => []);

    const lines = data.map((m) => {
      const who =
        m.role === "assistant"
          ? "[المساعد]"
          : m.role === "user"
          ? "[أنت]"
          : `[${m.role}]`;
      return `${who} ${m.content}`;
    });

    box.textContent = lines.join("\n---------------------\n");

  } catch (err) {
    console.error(err);
    const box = document.getElementById("chat_box");
    if (box) box.textContent = "خطأ في جلب السجل.";
  }
}

/* ===========================
   تهيئة النظام
=========================== */

window.addEventListener("DOMContentLoaded", () => {
  const navAuth     = document.getElementById("nav-auth");
  const navProjects = document.getElementById("nav-projects");
  const navFiles    = document.getElementById("nav-files");
  const navChat     = document.getElementById("nav-chat");

  if (navAuth)     navAuth.onclick     = authView;
  if (navProjects) navProjects.onclick = projectsView;
  if (navFiles)    navFiles.onclick    = filesView;
  if (navChat)     navChat.onclick     = chatView;

  // إنشاء زر تسجيل الخروج في الشريط العلوي
  const nav = document.querySelector("header nav");
  if (nav && !document.getElementById("nav-logout")) {
    const btn = document.createElement("button");
    btn.id = "nav-logout";
    btn.textContent = "تسجيل الخروج";
    btn.style.display = "none";
    btn.onclick = logout;
    nav.appendChild(btn);
  }

  // عرض صفحة الحساب حسب حالة التوكن
  authView();
  updateLogoutButton();

  // فحص اتصال الباك إند
  fetch(`${BACKEND_URL}/api/health`)
    .then((r) => r.json())
    .then((d) => console.log("Backend Connected:", d))
    .catch((e) => console.error("Connection failed:", e));
});
