// ===================== إعدادات عامة =====================
const BACKEND_URL   = "https://sovereign-backend-rhel.onrender.com";
const REGISTER_PATH = "/api/auth/register";
const LOGIN_PATH    = "/api/auth/login";

let token = localStorage.getItem("token") || "";

// ===================== أداة عرض الواجهة =====================
function setView(html) {
  document.getElementById("view").innerHTML = html;
}

// ===================== صفحة الحساب الرئيسية =====================
function accountMainView() {
  setView(`
    <section class="card">
      <h3>الحساب</h3>
      <div class="actions">
        <button onclick="showRegister()">تسجيل مستخدم جديد</button>
        <button onclick="showLogin()">دخول مستخدم مسجل</button>
      </div>
      <p class="small">التوكن: <code>${token ? token.slice(0,16)+"..." : "—"}</code></p>
    </section>
  `);
}

// ===================== نموذج التسجيل =====================
function showRegister() {
  setView(`
    <section class="card">
      <h3>تسجيل مستخدم جديد</h3>
      <input id="r_email" placeholder="email@example.com" />
      <input id="r_name"  placeholder="الاسم" />
      <input id="r_pass"  type="password" placeholder="كلمة المرور" />
      <div class="actions">
        <button onclick="register()">تسجيل</button>
        <button onclick="accountMainView()">رجوع</button>
      </div>
    </section>
  `);
}

async function register() {
  const email     = r_email.value;
  const full_name = r_name.value;
  const password  = r_pass.value;

  const res = await fetch(`${BACKEND_URL}${REGISTER_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, full_name, password })
  });

  if (res.ok) {
    alert("تم التسجيل بنجاح");
    accountMainView();
  } else {
    let msg = "فشل التسجيل";
    try {
      const data = await res.json();
      msg = data.detail || msg;
    } catch (_) {}
    alert(msg);
  }
}

// ===================== نموذج الدخول =====================
function showLogin() {
  setView(`
    <section class="card">
      <h3>دخول مستخدم مسجل</h3>
      <input id="l_email" placeholder="email@example.com" />
      <input id="l_pass"  type="password" placeholder="كلمة المرور" />
      <div class="actions">
        <button onclick="login()">دخول</button>
        <button onclick="accountMainView()">رجوع</button>
      </div>
    </section>
  `);
}

async function login() {
  const email    = l_email.value;
  const password = l_pass.value;

  const res = await fetch(`${BACKEND_URL}${LOGIN_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json().catch(() => ({ detail: "خطأ" }));

  if (res.ok) {
    token = data.access_token || data.token || "";
    if (token) localStorage.setItem("token", token);
    alert("تم تسجيل الدخول");
    accountMainView();
  } else {
    alert(data.detail || "فشل الدخول");
  }
}

// ===================== المشاريع =====================
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
  </section>`);
}

async function createProject() {
  const res = await fetch(`${BACKEND_URL}/projects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify({ name: p_name.value, description: p_desc.value })
  });
  alert(res.ok ? "تم إنشاء المشروع" : "فشل إنشاء المشروع");
}

async function listProjects() {
  const res = await fetch(`${BACKEND_URL}/projects`, {
    headers: { "Authorization": "Bearer " + token }
  });
  const data = await res.json();
  projects_list.innerHTML =
    "<ul>" + data.map(p => `<li>${p.id} — ${p.name}</li>`).join("") + "</ul>";
}

// ===================== الملفات =====================
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
  </section>`);
}

async function uploadFile() {
  const fd = new FormData();
  fd.append("project_id", f_pid.value);
  fd.append("f", file_input.files[0]);

  const res = await fetch(`${BACKEND_URL}/files/upload`, {
    method: "POST",
    headers: { "Authorization": "Bearer " + token },
    body: fd
  });

  file_resp.textContent = await res.text();
}

// ===================== الدردشة =====================
function chatView() {
  setView(`
  <section class="card">
    <h3>الدردشة</h3>
    <div class="row">
      <div class="col"><input id="c_pid"  placeholder="Project ID"/></div>
      <div class="col"><input id="c_text" placeholder="اكتب رسالة"/></div>
    </div>
    <div class="actions">
      <button onclick="sendMsg()">إرسال</button>
      <button onclick="loadHistory()">تحديث</button>
    </div>
    <pre id="chat_box" class="small">—</pre>
  </section>`);
}

async function sendMsg() {
  const res = await fetch(`${BACKEND_URL}/chat/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify({ project_id: c_pid.value, content: c_text.value })
  });
  alert(res.ok ? "تم الإرسال" : "فشل الإرسال");
}

async function loadHistory() {
  const res = await fetch(
    `${BACKEND_URL}/chat/history?project_id=` + encodeURIComponent(c_pid.value),
    { headers: { "Authorization": "Bearer " + token } }
  );
  chat_box.textContent = await res.text();
}

// ===================== الصوت =====================
function voiceView() {
  setView(`
  <section class="card">
    <h3>الصوت (تجريبي)</h3>
    <div class="row"><div class="col"><input id="v_pid" placeholder="Project ID"/></div></div>
    <div class="actions">
      <button id="rec_btn">بدء التسجيل</button>
      <button onclick="uploadAudio()">رفع المقطع</button>
    </div>
    <p class="small">يحتاج المتصفح دعم MediaRecorder.</p>
    <pre id="voice_resp" class="small">—</pre>
  </section>`);

  window._chunks = [];
  let mediaRecorder;
  const btn = document.getElementById("rec_btn");

  btn.onclick = async () => {
    if (!mediaRecorder) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = e => _chunks.push(e.data);
      mediaRecorder.start();
      btn.textContent = "إيقاف التسجيل";
    } else {
      mediaRecorder.stop();
      btn.textContent = "بدء التسجيل";
      mediaRecorder = null;
    }
  };
}

async function uploadAudio() {
  if (!_chunks || !_chunks.length) { alert("لا يوجد تسجيل"); return; }

  const blob = new Blob(_chunks, { type: "audio/webm" });
  const fd = new FormData();
  fd.append("project_id", v_pid.value);
  fd.append("audio", blob, "voice.webm");

  const res = await fetch(`${BACKEND_URL}/voice/upload`, {
    method: "POST",
    headers: { "Authorization": "Bearer " + token },
    body: fd
  });

  voice_resp.textContent = await res.text();
  _chunks = [];
}

// ===================== الكاميرا =====================
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
  </section>`);

  let stream;
  const v = document.getElementById("vid");
  const btn = document.getElementById("cam_btn");

  btn.onclick = async () => {
    if (!stream) {
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      v.srcObject = stream;
    } else {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
      v.srcObject = null;
    }
  };
}

async function snap() {
  const v = document.getElementById("vid");
  if (!v.srcObject) { alert("شغل الكاميرا"); return; }

  const cv = document.getElementById("cv");
  cv.width  = v.videoWidth;
  cv.height = v.videoHeight;
  cv.getContext("2d").drawImage(v, 0, 0);

  const blob = await new Promise(r => cv.toBlob(r, "image/png"));
  const fd = new FormData();
  fd.append("project_id", i_pid.value);
  fd.append("image", blob, "snap.png");

  const res = await fetch(`${BACKEND_URL}/vision/upload`, {
    method: "POST",
    headers: { "Authorization": "Bearer " + token },
    body: fd
  });

  img_resp.textContent = await res.text();
}

// ===================== الحوكمة =====================
function govView() {
  setView(`
  <section class="card">
    <h3>الحوكمة</h3>
    <input id="pol_name"  placeholder="اسم السياسة (admin فقط)"/>
    <textarea id="pol_rules" placeholder='{"allow":["admin"],"deny":["*"]}'></textarea>
    <div class="actions"><button onclick="createPolicy()">إنشاء سياسة</button></div>
    <div class="actions"><button onclick="listPolicies()">عرض السياسات</button></div>
    <pre id="pol_out" class="small">—</pre>
  </section>`);
}

async function createPolicy() {
  const rulesText = pol_rules.value || "{}";
  const res = await fetch(`${BACKEND_URL}/governance/policies`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify({ name: pol_name.value, rules: JSON.parse(rulesText) })
  });
  pol_out.textContent = await res.text();
}

async function listPolicies() {
  const res = await fetch(`${BACKEND_URL}/governance/policies`, {
    headers: { "Authorization": "Bearer " + token }
  });
  pol_out.textContent = await res.text();
}

// ===================== ربط أزرار التنقل =====================
document.getElementById("nav-auth").onclick     = accountMainView;
document.getElementById("nav-projects").onclick = projectsView;
document.getElementById("nav-files").onclick    = filesView;
document.getElementById("nav-chat").onclick     = chatView;
document.getElementById("nav-voice").onclick    = voiceView;
document.getElementById("nav-vision").onclick   = visionView;
document.getElementById("nav-gov").onclick      = govView;

// عرض صفحة الحساب أولاً
accountMainView();

// فحص الاتصال بالخلفية
fetch(`${BACKEND_URL}/health`)
  .then(r => r.json())
  .then(d => console.log("Backend Connected:", d))
  .catch(e => console.error("Connection failed:", e));
