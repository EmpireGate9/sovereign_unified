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

      <div id="file_resp" class="card small" style="margin-top:16px;white-space:pre-wrap;word-break:break-word">—</div>
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

      <div class="actions" style="margin-top:8px">
        <button onclick="sendMsg()">إرسال</button>
        <button onclick="loadHistory()">تحديث السجل</button>
      </div>

      <div id="chat_box" class="card small" style="margin-top:16px;max-height:360px;overflow-y:auto"></div>
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

    if (!name) {
      showError("فضلاً أدخل اسم المشروع");
      return;
    }

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

    if (res.ok) {
      showInfo("تم إنشاء المشروع");
      if (box) box.textContent = "تم إنشاء المشروع بنجاح. تم تحديث القائمة.";
      await listProjects();
    } else {
      if (box) box.textContent = `فشل إنشاء المشروع (Status: ${res.status})`;
      showError(text || "فشل إنشاء المشروع");
    }

  } catch (err) {
    console.error(err);
    if (box) box.textContent = "خطأ في الاتصال بالخادم.";
    showError("حدث خطأ أثناء إنشاء المشروع");
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
      box.textContent = `فشل جلب المشاريع (Status: ${res.status})`;
      return;
    }

    const data = await res.json().catch(() => []);

    if (!Array.isArray(data) || !data.length) {
      box.textContent = "لا توجد مشاريع حتى الآن.";
      return;
    }

    box.innerHTML =
      '<div class="projects-list">' +
      data.map(p => `
        <div class="project-item">
          <div class="project-title">${p.name}</div>
          <div class="project-meta">رقم المشروع: ${p.id}</div>
          ${p.description ? `<div class="project-meta">الوصف: ${p.description}</div>` : ""}
        </div>
      `).join("") +
      "</div>";

  } catch (err) {
    console.error(err);
    box.textContent = "خطأ في جلب المشاريع.";
  }
}

/* ===========================
   رفع ملف
=========================== */

async function uploadFile() {
  const out = document.getElementById("file_resp");

  try {
    const pidRaw = document.getElementById("f_pid").value.trim();
    const pid    = parseInt(pidRaw, 10);
    const f      = document.getElementById("file_input").files[0];

    if (Number.isNaN(pid)) {
      showError("فضلاً أدخل رقم مشروع صحيح.");
      if (out) out.textContent = "فضلاً أدخل رقم مشروع صحيح.";
      return;
    }
    if (!f) {
      showError("فضلاً اختر ملفاً للرفع.");
      if (out) out.textContent = "فضلاً اختر ملفاً للرفع.";
      return;
    }

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
    console.log("Upload response:", text);

    if (res.ok) {
      if (out) out.textContent = "تم رفع الملف بنجاح.";
      showInfo("تم رفع الملف بنجاح");
    } else if (res.status === 404) {
      if (out) out.textContent = "لا يوجد مشروع بهذا الرقم.";
      showError("لا يوجد مشروع بهذا الرقم.");
    } else {
      if (out) out.textContent = text || "فشل رفع الملف.";
      showError("فشل رفع الملف");
    }

  } catch (err) {
    console.error(err);
    if (out) out.textContent = "خطأ في رفع الملف.";
  }
}

/* ===========================
   عرض الملفات
=========================== */

async function listFiles() {
  const out = document.getElementById("file_resp");
  try {
    const pidRaw = document.getElementById("f_pid").value.trim();
    const pid    = parseInt(pidRaw, 10);

    if (Number.isNaN(pid)) {
      showError("فضلاً أدخل رقم مشروع صحيح.");
      if (out) out.textContent = "فضلاً أدخل رقم مشروع صحيح.";
      return;
    }

    const url = `${BACKEND_URL + FILES_BASE}/list?project_id=${pid}`;

    const res = await fetch(url, {
      headers: { "Authorization": "Bearer " + (token || "") }
    });

    const text = await res.text();

    if (!res.ok) {
      if (res.status === 404) {
        if (out) out.textContent = "لا يوجد مشروع بهذا الرقم.";
        showError("لا يوجد مشروع بهذا الرقم.");
      } else {
        if (out) out.textContent = text || "فشل جلب الملفات.";
        showError("فشل جلب الملفات.");
      }
      return;
    }

    let data = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }

    if (!Array.isArray(data) || !data.length) {
      out.textContent = "لا توجد ملفات لهذا المشروع حتى الآن.";
      return;
    }

    const html =
      '<div class="files-list">' +
      data.map(f => `
        <div class="file-item">
          <div class="file-name">${f.filename}</div>
          <div class="file-meta">ID: ${f.id} • النوع: ${f.mime_type || "غير معروف"}</div>
          <div class="file-meta">الحجم: ${f.size_bytes ? Math.round(f.size_bytes / 1024) + " كيلوبايت" : "غير معروف"}</div>
          <div class="file-meta">التاريخ: ${f.created_at || "-"}</div>
        </div>
      `).join("") +
      "</div>";

    out.innerHTML = html;

  } catch (err) {
    console.error(err);
    if (out) out.textContent = "خطأ في جلب الملفات.";
  }
}

/* ===========================
   تحليل ملف
=========================== */

async function analyzeFile() {
  const out = document.getElementById("file_resp");
  try {
    const pidRaw = document.getElementById("f_pid").value.trim();
    const pid    = parseInt(pidRaw, 10);

    if (Number.isNaN(pid)) {
      showError("فضلاً أدخل رقم مشروع صحيح.");
      if (out) out.textContent = "فضلاً أدخل رقم مشروع صحيح.";
      return;
    }

    // جلب قائمة الملفات للحصول على أول ملف
    const listUrl  = `${BACKEND_URL + FILES_BASE}/list?project_id=${pid}`;
    const listRes  = await fetch(listUrl, {
      headers: { "Authorization": "Bearer " + (token || "") }
    });
    const listText = await listRes.text();

    if (!listRes.ok) {
      if (out) out.textContent = listText || "فشل جلب الملفات.";
      showError("فشل جلب الملفات قبل التحليل.");
      return;
    }

    let listData = [];
    try {
      listData = JSON.parse(listText);
    } catch {
      listData = [];
    }

    if (!Array.isArray(listData) || !listData.length) {
      showError("لا يوجد ملفات لتحليلها في هذا المشروع.");
      if (out) out.textContent = "لا يوجد ملفات لتحليلها في هذا المشروع.";
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

    if (!res.ok) {
      if (out) out.textContent = text || "فشل تحليل الملف.";
      showError("فشل تحليل الملف");
      return;
    }

    let msg = text;
    try {
      const obj = JSON.parse(text);
      if (obj && typeof obj === "object" && obj.message) {
        msg = obj.message;
      }
    } catch {
      // نستخدم النص كما هو
    }

    if (out) out.textContent = "نتيجة التحليل:\n\n" + msg;
    showInfo("تم تحليل الملف بنجاح، ويمكنك رؤية النتيجة في الدردشة أيضاً.");

  } catch (err) {
    console.error(err);
    if (out) out.textContent = "فشل تحليل الملف.";
  }
}

/* ===========================
   إرسال رسالة للدردشة
=========================== */

async function sendMsg() {
  try {
    const pidRaw = document.getElementById("c_pid").value.trim();
    const text   = document.getElementById("c_text").value.trim();

    if (!text) {
      showError("فضلاً اكتب رسالة.");
      return;
    }

    const project_id = pidRaw ? parseInt(pidRaw, 10) : null;

    if (pidRaw && Number.isNaN(project_id)) {
      showError("رقم المشروع غير صحيح.");
      return;
    }

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
      const t = await res.text();
      showError(t || "فشل إرسال الرسالة");
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

    const replyText = await replyRes.text();
    if (!replyRes.ok) {
      showError(replyText || "فشل الحصول على رد الذكاء الاصطناعي");
      return;
    }

    // تفريغ حقل الرسالة بعد الإرسال
    document.getElementById("c_text").value = "";

    await loadHistory();

  } catch (err) {
    console.error(err);
    showError("خطأ بالدردشة");
  }
}

/* ===========================
   جلب السجل (دردشة بفقاعات)
=========================== */

async function loadHistory() {
  try {
    const pidRaw = document.getElementById("c_pid").value.trim();
    const project_id = pidRaw ? parseInt(pidRaw, 10) : null;
    const box = document.getElementById("chat_box");

    let url = BACKEND_URL + CHAT_BASE + "/history";
    const params = new URLSearchParams();
    params.set("session_id", SESSION_ID);
    if (project_id && !Number.isNaN(project_id)) {
      params.set("project_id", project_id);
    }
    url += "?" + params.toString();

    const res = await fetch(url, {
      headers: { "Authorization": "Bearer " + (token || "") }
    });

    if (!res.ok) {
      const t = await res.text();
      if (box) box.textContent = t || "فشل جلب السجل.";
      return;
    }

    const data = await res.json().catch(() => []);

    if (!box) return;

    if (!Array.isArray(data) || !data.length) {
      box.textContent = "لا توجد رسائل بعد.";
      return;
    }

    const messagesHtml =
      '<div class="chat-messages">' +
      data.map(m => {
        const cls = m.role === "assistant" ? "assistant" : "user";
        const safeContent = (m.content || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        return `
          <div class="chat-message ${cls}">
            <div class="chat-bubble">${safeContent}</div>
          </div>
        `;
      }).join("") +
      "</div>";

    box.innerHTML = messagesHtml;

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

  // إنشاء زر تسجيل الخروج في الشريط العلوي إذا لم يكن موجوداً
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
