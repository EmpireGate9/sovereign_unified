// =======================
// إعدادات عامة
// =======================
const BACKEND_URL   = "https://sovereign-backend-rhel.onrender.com";
const REGISTER_PATH = "/api/auth/register";
const LOGIN_PATH    = "/api/auth/login";

let token = localStorage.getItem("token") || "";

// =======================
// دوال عرض الواجهات
// =======================
function setView(html) {
  const v = document.getElementById("view");
  if (v) v.innerHTML = html;
}

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
    <p class="small">التوكن: <code>${token ? token.slice(0, 16) + "..." : "—"}</code></p>
  </section>
  `);
}

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

function filesView() {
  setView(`
  <section class="card">
    <h3>رفع الملفات</h3>
    <div class="row">
      <div class="col"><input id="f_pid" placeholder="Project ID"/></div>
      <div class="col"><input id="file_input" type="file"/></div>
    </div>
    <div class="actions"><button onclick="uploadFile()">رفع</button></div>
    <pre id="file_resp" class="small">—</pre>
  </section>
  `);
}

function chatView() {
  setView(`
  <section class="card">
    <h3>الدردشة</h3>
    <div class="row">
      <div class="col"><input id="c_pid" placeholder="Project ID (يمكن تركه فارغ للضيف)"/></div>
      <div class="col"><input id="c_text" placeholder="اكتب رسالة"/></div>
    </div>
    <div class="actions">
      <button onclick="sendMsg()">إرسال</button>
      <button onclick="loadHistory()">تحديث</button>
    </div>
    <pre id="chat_box" class="small">—</pre>
  </section>
  `);
}

function voiceView() {
  setView(`
  <section class="card">
    <h3>الصوت (تجريبي)</h3>
    <div class="row">
      <div class="col"><input id="v_pid" placeholder="Project ID"/></div>
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
        alert("حدث خطأ في الميكروفون");
      }
    };
  }
}

function visionView() {
  setView(`
  <section class="card">
    <h3>الكاميرا (تجريبي)</h3>
    <div class="row"><div class="col"><input id="i_pid" placeholder="Project ID"/></div></div>
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
        alert("حدث خطأ في الكاميرا");
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
      alert(text || "فشل التسجيل");
    }
  } catch (err) {
    console.error(err);
    alert("فشل التسجيل (خطأ اتصال)");
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
      authView(); // لتحديث عرض التوكن في الكرت
    } else {
      alert(data.detail || "فشل تسجيل الدخول");
    }
  } catch (err) {
    console.error(err);
    alert("فشل تسجيل الدخول (خطأ اتصال)");
  }
}

// =======================
// دوال المشاريع
// =======================
async function createProject() {
  const listBox = document.getElementById("projects_list");
  try {
    const name = document.getElementById("p_name").value.trim();
    const desc = document.getElementById("p_desc").value.trim();

    // انتبه: الراوتر في الباك إند prefix="/api/projects" + prefix="/api" في main
    const url = `${BACKEND_URL}/api/api/projects`;
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

    if (listBox) {
      listBox.innerHTML =
        `<pre>Status: ${res.status}\nURL: ${url}\nRequest body: ${JSON.stringify(payload)}\nResponse:\n${text}</pre>`;
    }

    if (res.ok) {
      alert("تم إنشاء المشروع");
      listProjects();
    } else {
      alert("فشل إنشاء المشروع");
    }
  } catch (err) {
    console.error(err);
    if (listBox) listBox.textContent = "خطأ في الاتصال بالخادم.";
    alert("حدث خطأ أثناء إنشاء المشروع");
  }
}

async function listProjects() {
  const listBox = document.getElementById("projects_list");
  try {
    const url = `${BACKEND_URL}/api/api/projects`;

    const res = await fetch(url, {
      headers: { "Authorization": "Bearer " + (token || "") }
    });

    if (!res.ok) {
      if (listBox) {
        listBox.textContent = `Status: ${res.status} - فشل جلب المشاريع`;
      }
      return;
    }

    const data = await res.json().catch(() => []);

    if (Array.isArray(data) && listBox) {
      listBox.innerHTML =
        "<ul>" +
        data
          .map(
            (p) =>
              `<li>${p.id} — ${p.name}${p.description ? " (" + p.description + ")" : ""}</li>`
          )
          .join("") +
        "</ul>";
    }
  } catch (err) {
    console.error(err);
    if (listBox) listBox.textContent = "خطأ في الاتصال أثناء جلب المشاريع.";
  }
}

// =======================
// دوال الملفات
// =======================
async function uploadFile() {
  try {
    const pidInput = document.getElementById("f_pid");
    const fileInput = document.getElementById("file_input");
    const out = document.getElementById("file_resp");

    const fd = new FormData();
    fd.append("project_id", pidInput.value);
    fd.append("f", fileInput.files[0]);

    const url = `${BACKEND_URL}/api/files/upload`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Authorization": "Bearer " + (token || "") },
      body: fd
    });

    const text = await res.text();
    if (out) out.textContent = text;
  } catch (err) {
    console.error(err);
    const out = document.getElementById("file_resp");
    if (out) out.textContent = "خطأ في رفع الملف.";
  }
}

// =======================
// دوال الدردشة
// =======================
async function sendMsg() {
  try {
    const pid  = document.getElementById("c_pid").value.trim() || null;
    const text = document.getElementById("c_text").value.trim();

    const url = `${BACKEND_URL}/api/chat/send`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + (token || "")
      },
      body: JSON.stringify({ project_id: pid, content: text })
    });

    if (res.ok) {
      alert("تم الإرسال");
      loadHistory();
    } else {
      const t = await res.text();
      alert(t || "فشل الإرسال");
    }
  } catch (err) {
    console.error(err);
    alert("خطأ في إرسال الرسالة");
  }
}

async function loadHistory() {
  try {
    const pid  = document.getElementById("c_pid").value.trim();
    const box  = document.getElementById("chat_box");
    const url  = `${BACKEND_URL}/api/chat/history` +
      (pid ? `?project_id=${encodeURIComponent(pid)}` : "");

    const res  = await fetch(url, {
      headers: { "Authorization": "Bearer " + (token || "") }
    });

    const text = await res.text();
    if (box) box.textContent = text;
  } catch (err) {
    console.error(err);
    const box = document.getElementById("chat_box");
    if (box) box.textContent = "خطأ في جلب السجل.";
  }
}

// =======================
// دوال الصوت
// =======================
async function uploadAudio() {
  try {
    if (!window._chunks || !_chunks.length) {
      alert("لا يوجد تسجيل");
      return;
    }
    const pid = document.getElementById("v_pid").value.trim();
    const blob = new Blob(_chunks, { type: "audio/webm" });
    const fd = new FormData();
    fd.append("project_id", pid);
    fd.append("audio", blob, "voice.webm");

    const url = `${BACKEND_URL}/api/voice/upload`;

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
// دوال الكاميرا / الرؤية
// =======================
async function snap() {
  try {
    const v = document.getElementById("vid");
    if (!v || !v.srcObject) {
      alert("شغّل الكاميرا أولاً");
      return;
    }
    const cv = document.getElementById("cv");
    cv.width = v.videoWidth;
    cv.height = v.videoHeight;
    cv.getContext("2d").drawImage(v, 0, 0);

    const blob = await new Promise((r) => cv.toBlob(r, "image/png"));
    const fd = new FormData();
    fd.append("project_id", document.getElementById("i_pid").value.trim());
    fd.append("image", blob, "snap.png");

    const url = `${BACKEND_URL}/api/vision/upload`;

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
// دوال الحوكمة
// =======================
async function createPolicy() {
  try {
    const name  = document.getElementById("pol_name").value.trim();
    const rules = document.getElementById("pol_rules").value.trim() || "{}";
    const out   = document.getElementById("pol_out");

    const url = `${BACKEND_URL}/api/governance/policies`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + (token || "")
      },
      body: JSON.stringify({ name, rules: JSON.parse(rules) })
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
    const url = `${BACKEND_URL}/api/governance/policies`;

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
// ربط أزرار التنقل + تهيئة
// =======================
document.getElementById("nav-auth").onclick    = authView;
document.getElementById("nav-projects").onclick = projectsView;
document.getElementById("nav-files").onclick    = filesView;
document.getElementById("nav-chat").onclick     = chatView;
document.getElementById("nav-voice").onclick    = voiceView;
document.getElementById("nav-vision").onclick   = visionView;
document.getElementById("nav-gov").onclick      = govView;

// عرض صفحة الحساب افتراضياً
authView();

// فحص اتصال الباك إند
fetch(`${BACKEND_URL}/api/health`)
  .then((r) => r.json())
  .then((d) => console.log("Backend Connected:", d))
  .catch((e) => console.error("Connection failed:", e));
