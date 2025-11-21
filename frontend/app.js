// =======================
// إعدادات عامة
// =======================
const BACKEND_URL   = "https://sovereign-backend-rhel.onrender.com";

const REGISTER_PATH = "/api/auth/register";
const LOGIN_PATH    = "/api/auth/login";
const PROJECTS_PATH = "/api/projects";
const FILES_BASE    = "/api/files";
const CHAT_BASE     = "/api/chat";
const VOICE_BASE    = "/api/voice";
const VISION_BASE   = "/api/vision";
const GOV_BASE      = "/api/governance";

// لا نستخدم ثابت لمسار التحليل الآن، سنجرب أكثر من مسار داخل الدالة نفسها

let token = localStorage.getItem("token") || "";

// =======================
// Session ID للدردشة
// =======================
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
// دوال مساعدة عامة
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
  const isLoggedIn = !!token;

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

      <div style="margin-top:24px;border-top:1px solid #333;padding-top:12px;display:flex;justify-content:space-between;align-items:center">
        <span class="small">
          حالة الدخول:
          <strong style="color:${isLoggedIn ? "#4caf50" : "#f44336"}">
            ${isLoggedIn ? "مسجل الدخول" : "غير مسجل"}
          </strong>
        </span>
        ${
          isLoggedIn
            ? `<button onclick="logout()" style="padding:6px 14px;border-radius:999px;border:1px solid #555;background:#181818;color:#fff;cursor:pointer">تسجيل الخروج</button>`
            : ""
        }
      </div>
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

      <div id="projects_list" class="card small" style="margin-top:16px">
        لا توجد مشاريع بعد.
      </div>
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
        <button onclick="analyzeFile()">تحليل ومعالجة</button>
      </div>

      <div id="file_resp" class="card small" style="margin-top:16px;white-space:pre-wrap">
        —
      </div>
    </section>
  `);
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
          <input id="c_text" placeholder="اكتب رسالتك هنا" />
        </div>
      </div>

      <div class="actions" style="margin-top:8px">
        <button onclick="sendMsg()">إرسال</button>
        <button onclick="loadHistory()">تحديث السجل</button>
      </div>

      <div id="chat_box" class="card small" style="margin-top:16px;white-space:pre-wrap">
        —
      </div>
    </section>
  `);
}

// =======================
// واجهة الصوت
// =======================
function voiceView() {
  setView(`
    <section class="card">
      <h2 style="text-align:right;margin-bottom:24px">الصوت (تجريبي)</h2>

      <div class="row">
        <div class="col">
          <input id="v_pid" placeholder="رقم المشروع (اختياري)" />
        </div>
      </div>

      <div class="actions" style="margin-top:16px">
        <button id="rec_btn">بدء التسجيل</button>
        <button onclick="uploadAudio()">رفع المقطع</button>
      </div>

      <p class="small">يحتاج المتصفح دعم MediaRecorder.</p>
      <pre id="voice_resp" class="small" style="margin-top:16px">—</pre>
    </section>
  `);

  window._chunks = [];
  let mediaRecorder = null;
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
          mediaRecorder = null;
          btn.textContent = "بدء التسجيل";
        }
      } catch (err) {
        console.error(err);
        showError("حدث خطأ في الميكروفون");
      }
    };
  }
}

// =======================
// واجهة الكاميرا
// =======================
function visionView() {
  setView(`
    <section class="card">
      <h2 style="text-align:right;margin-bottom:24px">الكاميرا (تجريبي)</h2>

      <div class="row">
        <div class="col">
          <input id="i_pid" placeholder="رقم المشروع (اختياري)" />
        </div>
      </div>

      <video id="vid" autoplay playsinline style="max-width:100%;border-radius:12px;border:1px solid #333;margin-top:12px"></video>

      <div class="actions" style="margin-top:16px">
        <button id="cam_btn">تشغيل / إيقاف</button>
        <button onclick="snap()">التقاط & رفع</button>
      </div>

      <canvas id="cv" style="display:none"></canvas>
      <pre id="img_resp" class="small" style="margin-top:16px">—</pre>
    </section>
  `);

  let stream = null;
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
        showError("حدث خطأ في الكاميرا");
      }
    };
  }
}

// =======================
// واجهة الحوكمة
// =======================
function govView() {
  setView(`
    <section class="card">
      <h2 style="text-align:right;margin-bottom:24px">الحوكمة</h2>
      <input id="pol_name" placeholder="اسم السياسة" />
      <textarea id="pol_rules" placeholder='{"allow":["admin"],"deny":["*"]}'></textarea>

      <div class="actions" style="margin-top:16px">
        <button onclick="createPolicy()">إنشاء سياسة</button>
        <button onclick="listPolicies()">عرض السياسات</button>
      </div>

      <pre id="pol_out" class="small" style="margin-top:16px">—</pre>
    </section>
  `);
}

// =======================
// حساب: تسجيل / دخول
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
      showInfo("تم التسجيل بنجاح");
    } else {
      showError(text || "فشل التسجيل");
    }
  } catch (err) {
    console.error(err);
    showError("فشل التسجيل (خطأ اتصال)");
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
      showInfo("تم تسجيل الدخول");
      authView();
    } else {
      showError(data.detail || "فشل تسجيل الدخول");
    }
  } catch (err) {
    console.error(err);
    showError("فشل تسجيل الدخول (خطأ اتصال)");
  }
}

// =======================
// مشاريع
// =======================
async function createProject() {
  const listBox = document.getElementById("projects_list");
  try {
    const name = document.getElementById("p_name").value.trim();
    const desc = document.getElementById("p_desc").value.trim();

    if (!name) {
      showError("فضلاً أدخل اسم المشروع");
      return;
    }

    const url = BACKEND_URL + PROJECTS_PATH;
    const payload = { name, description: desc };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + (token || "")
      },
      body: JSON.stringify(payload)
    });

    const text = await res.text();

    if (res.ok) {
      showInfo("تم إنشاء المشروع");
      await listProjects();
    } else if (res.status === 401) {
      showError("فضلاً سجّل الدخول أولاً");
      if (listBox) listBox.textContent = text;
    } else {
      if (listBox) listBox.textContent = text;
      showError("فشل إنشاء المشروع");
    }
  } catch (err) {
    console.error(err);
    if (listBox) listBox.textContent = "خطأ في الاتصال بالخادم.";
    showError("حدث خطأ أثناء إنشاء المشروع");
  }
}

async function listProjects() {
  const listBox = document.getElementById("projects_list");
  try {
    const url = BACKEND_URL + PROJECTS_PATH;

    const res = await fetch(url, {
      headers: { "Authorization": "Bearer " + (token || "") }
    });

    if (!res.ok) {
      if (res.status === 401) {
        showError("فضلاً سجّل الدخول أولاً");
      }
      if (listBox) {
        listBox.textContent = `Status: ${res.status} - فشل جلب المشاريع`;
      }
      return;
    }

    const data = await res.json().catch(() => []);

    if (Array.isArray(data) && listBox) {
      if (!data.length) {
        listBox.textContent = "لا توجد مشاريع بعد.";
        return;
      }

      listBox.innerHTML =
        '<div class="projects-list">' +
        data
          .map(
            (p) => `
              <div class="project-item">
                <div class="project-title">#${p.id} — ${p.name}</div>
                <div class="project-meta">
                  ${p.description ? p.description : "بدون وصف"}
                </div>
              </div>
            `
          )
          .join("") +
        "</div>";
    }
  } catch (err) {
    console.error(err);
    if (listBox) listBox.textContent = "خطأ في الاتصال أثناء جلب المشاريع.";
  }
}

// =======================
// ملفات: رفع
// =======================
async function uploadFile() {
  try {
    const pidInput  = document.getElementById("f_pid");
    const fileInput = document.getElementById("file_input");
    const out       = document.getElementById("file_resp");

    const pid = parseInt(pidInput.value.trim(), 10);
    if (Number.isNaN(pid)) {
      const msg = "فضلاً أدخل رقم مشروع صحيح.";
      if (out) out.textContent = msg;
      showError(msg);
      return;
    }
    if (!fileInput.files || !fileInput.files[0]) {
      showError("فضلاً اختر ملفاً للرفع.");
      return;
    }

    const fd = new FormData();
    fd.append("project_id", pid);
    fd.append("file", fileInput.files[0]);

    const url = BACKEND_URL + FILES_BASE + "/upload";

    const res = await fetch(url, {
      method: "POST",
      headers: { "Authorization": "Bearer " + (token || "") },
      body: fd
    });

    const text = await res.text();
    if (res.ok) {
      if (out) out.textContent = "تم رفع الملف بنجاح.";
      showInfo("تم رفع الملف بنجاح");
    } else if (res.status === 404 || res.status === 422) {
      const msg = "لا يوجد مشروع بهذا الرقم أو الطلب غير صحيح.";
      if (out) out.textContent = msg;
      showError(msg);
    } else {
      if (out) out.textContent = text;
      showError("فشل رفع الملف");
    }
  } catch (err) {
    console.error(err);
    const out = document.getElementById("file_resp");
    if (out) out.textContent = "خطأ في رفع الملف.";
  }
}

// =======================
// ملفات: عرض القائمة
// =======================
async function listFiles() {
  const out = document.getElementById("file_resp");
  try {
    const pidRaw = document.getElementById("f_pid").value.trim();
    const pid = parseInt(pidRaw, 10);
    if (Number.isNaN(pid)) {
      const msg = "فضلاً أدخل رقم مشروع صحيح.";
      if (out) out.textContent = msg;
      showError(msg);
      return;
    }

    const url = `${BACKEND_URL + FILES_BASE}/list?project_id=${pid}`;
    const res = await fetch(url, {
      headers: { "Authorization": "Bearer " + (token || "") }
    });

    const text = await res.text();

    if (!res.ok) {
      if (res.status === 404 || res.status === 422) {
        const msg = "لا يوجد مشروع بهذا الرقم أو الطلب غير صحيح.";
        if (out) out.textContent = msg;
        showError(msg);
      } else {
        if (out) out.textContent = text;
        showError("فشل جلب الملفات.");
      }
      return;
    }

    let data = [];
    try {
      data = JSON.parse(text);
    } catch {
      data = [];
    }

    if (!Array.isArray(data) || !data.length) {
      if (out) out.textContent = "لا توجد ملفات لهذا المشروع حتى الآن.";
      return;
    }

    const html =
      '<div class="files-list">' +
      data
        .map(
          (f) => `
            <div class="file-item">
              <div class="file-title">${f.filename} — #${f.id}</div>
              <div class="file-meta">
                ${f.size_bytes ?? f.size} بايت — ${f.mime_type || ""} — ${f.created_at || ""}
              </div>
            </div>
          `
        )
        .join("") +
      "</div>";

    if (out) out.innerHTML = html;
  } catch (err) {
    console.error(err);
    if (out) out.textContent = "خطأ في جلب الملفات.";
  }
}

// =======================
// ملفات: تحليل ومعالجة (مع تجربة أكثر من مسار)
// =======================
async function analyzeFile() {
  const out = document.getElementById("file_resp");

  try {
    // 1) قراءة رقم المشروع
    const pidRaw = document.getElementById("f_pid").value.trim();
    const pid    = parseInt(pidRaw, 10);

    if (Number.isNaN(pid)) {
      const msg = "فضلاً أدخل رقم مشروع صحيح.";
      if (out) out.textContent = msg;
      showError(msg);
      return;
    }

    // 2) جلب قائمة الملفات للحصول على أول ملف
    const listUrl  = `${BACKEND_URL}${FILES_BASE}/list?project_id=${pid}`;
    const listRes  = await fetch(listUrl, {
      headers: { "Authorization": "Bearer " + (token || "") }
    });
    const listText = await listRes.text();

    if (!listRes.ok) {
      if (out) out.textContent = `Status: ${listRes.status}\n${listText}`;
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
      const msg = "لا يوجد ملفات لتحليلها في هذا المشروع.";
      if (out) out.textContent = msg;
      showError(msg);
      return;
    }

    const file_id = listData[0].id;

    // 3) إعداد بيانات الطلب
    const payload = JSON.stringify({
      project_id: pid,
      file_id: file_id
    });

    async function callAnalysis(url) {
      return fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + (token || "")
        },
        body: payload
      });
    }

    // نجرب أولاً /api/analysis/analyze-file ثم /api/analyze-file إذا رجع 404
    let res = await callAnalysis(`${BACKEND_URL}/api/analysis/analyze-file`);
    if (res.status === 404) {
      res = await callAnalysis(`${BACKEND_URL}/api/analyze-file`);
    }

    const text = await res.text();

    if (!res.ok) {
      if (out) out.textContent = `Status: ${res.status}\n${text}`;
      showError("فشل تحليل الملف.");
      return;
    }

    // 4) استخراج نص التحليل من JSON إن وجد
    let msg = text;
    try {
      const obj = JSON.parse(text);
      if (obj && typeof obj === "object" && obj.analysis) {
        msg = obj.analysis;
      } else if (obj && obj.message) {
        msg = obj.message;
      }
    } catch {
      // إذا لم يكن JSON نعرض النص كما هو
    }

    if (out) out.textContent = msg;
    showInfo("تم تحليل الملف. يمكنك الآن سؤال المساعد عن التحليل في الدردشة.");
  } catch (err) {
    console.error(err);
    if (out) out.textContent = "خطأ غير متوقع أثناء طلب التحليل.";
    showError("خطأ غير متوقع أثناء طلب التحليل.");
  }
}

// =======================
// دردشة
// =======================
async function sendMsg() {
  try {
    const pidRaw = document.getElementById("c_pid").value.trim();
    const text   = document.getElementById("c_text").value.trim();
    const inputEl = document.getElementById("c_text");

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

    if (inputEl) inputEl.value = "";
    await loadHistory();
  } catch (err) {
    console.error(err);
    showError("خطأ في إرسال الرسالة");
  }
}

async function loadHistory() {
  try {
    const pidRaw = document.getElementById("c_pid").value.trim();
    const project_id = pidRaw ? parseInt(pidRaw, 10) : null;
    const box  = document.getElementById("chat_box");

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

    if (!Array.isArray(data) || !box) return;

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

// =======================
// صوت
// =======================
async function uploadAudio() {
  try {
    if (!window._chunks || !_chunks.length) {
      showError("لا يوجد تسجيل");
      return;
    }
    const pidRaw = document.getElementById("v_pid").value.trim();
    const project_id = pidRaw ? parseInt(pidRaw, 10) : null;
    if (pidRaw && Number.isNaN(project_id)) {
      showError("رقم المشروع غير صحيح.");
      return;
    }

    const blob = new Blob(_chunks, { type: "audio/webm" });
    const fd = new FormData();
    if (project_id) fd.append("project_id", project_id);
    fd.append("audio", blob, "voice.webm");

    const url = BACKEND_URL + VOICE_BASE + "/upload";

    const res = await fetch(url, {
      method: "POST",
      headers: { "Authorization": "Bearer " + (token || "") },
      body: fd
    });

    const text = await res.text();
    const out = document.getElementById("voice_resp");
    if (out) out.textContent = text;
    _chunks = [];
  } catch (err) {
    console.error(err);
    const out = document.getElementById("voice_resp");
    if (out) out.textContent = "خطأ في رفع الصوت.";
  }
}

// =======================
// كاميرا / رؤية
// =======================
async function snap() {
  try {
    const v = document.getElementById("vid");
    if (!v || !v.srcObject) {
      showError("شغّل الكاميرا أولاً");
      return;
    }
    const cv = document.getElementById("cv");
    cv.width = v.videoWidth;
    cv.height = v.videoHeight;
    cv.getContext("2d").drawImage(v, 0, 0);

    const blob = await new Promise((resolve) => cv.toBlob(resolve, "image/png"));
    const pidRaw = document.getElementById("i_pid").value.trim();
    const project_id = pidRaw ? parseInt(pidRaw, 10) : null;
    if (pidRaw && Number.isNaN(project_id)) {
      showError("رقم المشروع غير صحيح.");
      return;
    }

    const fd = new FormData();
    if (project_id) fd.append("project_id", project_id);
    fd.append("image", blob, "snap.png");

    const url = BACKEND_URL + VISION_BASE + "/upload";

    const res = await fetch(url, {
      method: "POST",
      headers: { "Authorization": "Bearer " + (token || "") },
      body: fd
    });

    const text = await res.text();
    const out = document.getElementById("img_resp");
    if (out) out.textContent = text;
  } catch (err) {
    console.error(err);
    const out = document.getElementById("img_resp");
    if (out) out.textContent = "خطأ في رفع الصورة.";
  }
}

// =======================
// حوكمة
// =======================
async function createPolicy() {
  try {
    const name  = document.getElementById("pol_name").value.trim();
    const rules = document.getElementById("pol_rules").value.trim() || "{}";
    const out   = document.getElementById("pol_out");

    let parsed;
    try {
      parsed = JSON.parse(rules);
    } catch {
      showError("صيغة JSON غير صحيحة في الحقول.");
      return;
    }

    const url = BACKEND_URL + GOV_BASE + "/policies";

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + (token || "")
      },
      body: JSON.stringify({ name, rules: parsed })
    });

    const text = await res.text();
    if (out) out.textContent = text;
  } catch (err) {
    console.error(err);
    const out = document.getElementById("pol_out");
    if (out) out.textContent = "خطأ في إنشاء السياسة.";
  }
}

async function listPolicies() {
  try {
    const out = document.getElementById("pol_out");
    const url = BACKEND_URL + GOV_BASE + "/policies";

    const res = await fetch(url, {
      headers: { "Authorization": "Bearer " + (token || "") }
    });

    const text = await res.text();
    if (out) out.textContent = text;
  } catch (err) {
    console.error(err);
    const out = document.getElementById("pol_out");
    if (out) out.textContent = "خطأ في جلب السياسات.";
  }
}

// =======================
// تهيئة التطبيق
// =======================
window.addEventListener("DOMContentLoaded", () => {
  const navAuth     = document.getElementById("nav-auth");
  const navProjects = document.getElementById("nav-projects");
  const navFiles    = document.getElementById("nav-files");
  const navChat     = document.getElementById("nav-chat");
  const navVoice    = document.getElementById("nav-voice");
  const navVision   = document.getElementById("nav-vision");
  const navGov      = document.getElementById("nav-gov");

  if (navAuth)     navAuth.onclick     = authView;
  if (navProjects) navProjects.onclick = projectsView;
  if (navFiles)    navFiles.onclick    = filesView;
  if (navChat)     navChat.onclick     = chatView;
  if (navVoice)    navVoice.onclick    = voiceView;
  if (navVision)   navVision.onclick   = visionView;
  if (navGov)      navGov.onclick      = govView;

  authView();

  fetch(`${BACKEND_URL}/api/health`)
    .then((r) => r.json())
    .then((d) => console.log("Backend Connected:", d))
    .catch((e) => console.error("Connection failed:", e));
});
