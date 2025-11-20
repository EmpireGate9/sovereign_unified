// =======================
// إعدادات عامة
// =======================
const BACKEND_URL = "https://sovereign-backend-rhel.onrender.com";

// مسارات ثابتة
const REGISTER_PATH  = "/api/auth/register";
const LOGIN_PATH     = "/api/auth/login";
const PROJECTS_PATH  = "/api/projects";
const FILES_BASE     = "/api/files";
const CHAT_BASE      = "/api/chat";

// التوكن + session
let token = localStorage.getItem("token") || "";

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

// =======================
// دوال مساعدة
// =======================
function setView(html) {
  const root = document.getElementById("view");
  if (!root) return;
  root.innerHTML = html;
}

function showError(msg) {
  alert(msg || "حدث خطأ غير متوقع");
}

function showInfo(msg) {
  alert(msg);
}

// =======================
// واجهة الحساب
// =======================
function authView() {
  const loggedIn = Boolean(token);

  setView(`
    <section class="card">
      <h2 style="text-align:right;margin-bottom:24px">الحساب</h2>

      ${
        loggedIn
          ? `
          <p style="text-align:right;font-size:18px">أنت مسجل دخول حالياً</p>
          <button onclick="logout()" style="margin-top:16px">تسجيل الخروج</button>
        `
          : `
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
        `
      }
    </section>
  `);
}

function logout() {
  token = "";
  localStorage.removeItem("token");
  showInfo("تم تسجيل الخروج");
  authView();
}

// =======================
// واجهة المشاريع
// =======================
function projectsView() {
  setView(`
    <section class="card">
      <h2 style="text-align:right;margin-bottom:24px">المشاريع</h2>
      <div class="row">
        <div class="col">
          <input id="p_name" placeholder="اسم المشروع" />
        </div>
        <div class="col">
          <input id="p_desc" placeholder="وصف المشروع" />
        </div>
      </div>
      <div class="actions" style="margin-top:16px">
        <button onclick="createProject()">إنشاء مشروع</button>
        <button onclick="listProjects()">تحديث القائمة</button>
      </div>
      <div id="projects_list" class="card small" style="margin-top:16px">—</div>
    </section>
  `);
}

// =======================
// واجهة الملفات
// =======================
function filesView() {
  setView(`
    <section class="card">
      <h2 style="text-align:right;margin-bottom:24px">الملفات</h2>
      <div class="row">
        <div class="col">
          <input id="f_pid" placeholder="رقم المشروع (ID)" />
        </div>
        <div class="col">
          <input id="file_input" type="file" />
        </div>
      </div>
      <div class="actions" style="margin-top:16px">
        <button onclick="uploadFile()">رفع ملف</button>
        <button onclick="listFiles()">عرض الملفات</button>
      </div>
      <pre id="file_resp" class="small" style="margin-top:16px">—</pre>
    </section>
  `);
}

// =======================
// رفع ملف
// =======================
async function uploadFile() {
  try {
    const pid = parseInt(document.getElementById("f_pid").value.trim(), 10);
    const file = document.getElementById("file_input").files[0];
    const out  = document.getElementById("file_resp");

    if (Number.isNaN(pid)) {
      showError("فضلاً أدخل رقم مشروع صحيح");
      return;
    }
    if (!file) {
      showError("فضلاً اختر ملفاً للرفع");
      return;
    }

    const fd = new FormData();
    fd.append("project_id", pid);
    fd.append("file", file);

    const url = BACKEND_URL + FILES_BASE + "/upload";

    const res = await fetch(url, {
      method: "POST",
      headers: { "Authorization": "Bearer " + token },
      body: fd
    });

    const txt = await res.text();
    out.textContent = txt;

    if (res.ok) showInfo("تم رفع الملف");
    else showError("فشل رفع الملف");
  } catch (err) {
    console.error(err);
    showError("خطأ أثناء رفع الملف");
  }
}

// =======================
// عرض الملفات + زر تحليل
// =======================
async function listFiles() {
  const pid = parseInt(document.getElementById("f_pid").value.trim(), 10);
  const out = document.getElementById("file_resp");

  if (Number.isNaN(pid)) {
    showError("فضلاً أدخل رقم مشروع صحيح.");
    return;
  }

  const url = `${BACKEND_URL + FILES_BASE}/list?project_id=${pid}`;

  try {
    const res = await fetch(url, {
      headers: { "Authorization": "Bearer " + token }
    });

    if (!res.ok) {
      out.textContent = "لا يوجد مشروع بهذا الرقم أو الطلب غير صحيح.";
      return;
    }

    const data = await res.json();

    if (!Array.isArray(data) || !data.length) {
      out.textContent = "لا توجد ملفات.";
      return;
    }

    out.innerHTML = data
      .map(
        (f) => `
        <div style="margin-bottom:12px;padding:8px;border:1px solid #ccc;border-radius:8px">
          <p>(${f.id}) — ${f.filename} — ${f.size_bytes} بايت</p>
          <button onclick="analyzeFile(${f.id}, ${pid})">تحليل ومعالجة</button>
        </div>
      `
      )
      .join("");

  } catch (err) {
    console.error(err);
    out.textContent = "خطأ في جلب الملفات.";
  }
}

// =======================
// تحليل ملف
// =======================
async function analyzeFile(fileId, projectId) {
  const out = document.getElementById("file_resp");

  try {
    const url = BACKEND_URL + FILES_BASE + "/analyze";

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ file_id: fileId, project_id: projectId })
    });

    const txt = await res.text();
    out.textContent = txt;

    if (!res.ok) {
      showError("فشل في التحليل");
      return;
    }

    showInfo("تم تحليل الملف بنجاح");

  } catch (err) {
    console.error(err);
    showError("خطأ أثناء تحليل الملف");
  }
}

// =======================
// واجهة الدردشة
// =======================
function chatView() {
  setView(`
    <section class="card">
      <h2 style="text-align:right;margin-bottom:24px">الدردشة</h2>

      <div class="row">
        <div class="col">
          <input id="c_pid" placeholder="رقم المشروع (اختياري)" />
        </div>
        <div class="col">
          <input id="c_text" placeholder="اكتب رسالتك" />
        </div>
      </div>

      <div class="actions" style="margin-top:12px">
        <button onclick="sendMsg()">إرسال</button>
        <button onclick="loadHistory()">تحديث السجل</button>
      </div>

      <div id="chat_box" class="card small" style="margin-top:16px;white-space:pre-wrap">—</div>
    </section>
  `);
}

// =======================
// إرسال رسالة
// =======================
async function sendMsg() {
  try {
    const msg = document.getElementById("c_text").value.trim();
    const pidRaw = document.getElementById("c_pid").value.trim();
    const pid = pidRaw ? parseInt(pidRaw, 10) : null;

    if (!msg) {
      showError("فضلاً اكتب رسالة");
      return;
    }

    await fetch(BACKEND_URL + CHAT_BASE + "/send", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        project_id: pid,
        session_id: SESSION_ID,
        content: msg
      })
    });

    const reply = await fetch(BACKEND_URL + CHAT_BASE + "/reply", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        project_id: pid,
        session_id: SESSION_ID,
        content: msg
      })
    });

    if (!reply.ok) {
      showError("فشل الحصول على رد");
      return;
    }

    await loadHistory();
  } catch (err) {
    console.error(err);
    showError("خطأ في إرسال الرسالة");
  }
}

// =======================
// جلب السجل
// =======================
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
      headers: { "Authorization": "Bearer " + token }
    });

    if (!res.ok) {
      box.textContent = "فشل جلب السجل";
      return;
    }

    const data = await res.json();

    box.textContent = data
      .map((m) => {
        const who =
          m.role === "assistant"
            ? "[المساعد]"
            : m.role === "user"
            ? "[أنت]"
            : "[نظام]";
        return `${who}: ${m.content}`;
      })
      .join("\n---------------------\n");

  } catch (err) {
    console.error(err);
    showError("خطأ في جلب السجل");
  }
}

// =======================
// تهيئة التطبيق
// =======================
window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("nav-auth").onclick = authView;
  document.getElementById("nav-projects").onclick = projectsView;
  document.getElementById("nav-files").onclick = filesView;
  document.getElementById("nav-chat").onclick = chatView;

  authView();
});
