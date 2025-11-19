// =========================
// إعدادات عامة
// =========================
const BACKEND_URL = "https://sovereign-backend-rhel.onrender.com";
let token = localStorage.getItem("token") || "";

// دالة لتغيير محتوى منطقة العرض
function setView(html) {
  const view = document.getElementById("view");
  if (view) view.innerHTML = html;
}

// دالة مساعدة لعرض التوكن أسفل الكارت
function renderTokenLine() {
  const t = localStorage.getItem("token") || "—";
  return `<p class="small">التوكن: <code>${t ? t.slice(0, 24) + "..." : "—"}</code></p>`;
}

// =========================
// واجهة الحساب (تسجيل / دخول)
// =========================
function authView() {
  setView(`
    <section class="card">
      <h3>الحساب</h3>
      <div class="row">
        <div class="col">
          <h4>تسجيل مستخدم جديد</h4>
          <input id="r_email" placeholder="email@example.com" />
          <input id="r_name"  placeholder="الاسم" />
          <input id="r_pass"  type="password" placeholder="كلمة المرور" />
          <div class="actions">
            <button onclick="registerUser()">تسجيل</button>
          </div>
        </div>
        <div class="col">
          <h4>دخول مستخدم مسجل</h4>
          <input id="l_email" placeholder="email@example.com" />
          <input id="l_pass"  type="password" placeholder="كلمة المرور" />
          <div class="actions">
            <button onclick="loginUser()">دخول</button>
          </div>
        </div>
      </div>
      ${renderTokenLine()}
    </section>
  `);
}

async function registerUser() {
  try {
    const email = document.getElementById("r_email").value.trim();
    const name  = document.getElementById("r_name").value.trim();
    const pass  = document.getElementById("r_pass").value;

    const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, full_name: name, password: pass })
    });

    if (res.ok) {
      alert("تم تسجيل مستخدم جديد");
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.detail || "فشل التسجيل");
    }
  } catch (err) {
    console.error(err);
    alert("خطأ في الاتصال بالخادم أثناء التسجيل");
  }
}

async function loginUser() {
  try {
    const email = document.getElementById("l_email").value.trim();
    const pass  = document.getElementById("l_pass").value;

    const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pass })
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.access_token) {
      token = data.access_token;
      localStorage.setItem("token", token);
      alert("تم تسجيل الدخول");
      authView(); // لإعادة عرض التوكن المحدّث
    } else {
      alert(data.detail || "فشل تسجيل الدخول");
    }
  } catch (err) {
    console.error(err);
    alert("خطأ في الاتصال بالخادم أثناء الدخول");
  }
}

// =========================
// واجهة المشاريع
// =========================
function projectsView() {
  setView(`
    <section class="card">
      <h3>المشاريع</h3>
      <div class="row">
        <div class="col">
          <input id="p_name" placeholder="اسم المشروع" />
        </div>
        <div class="col">
          <input id="p_desc" placeholder="وصف المشروع" />
        </div>
      </div>
      <div class="actions">
        <button onclick="createProject()">إنشاء</button>
        <button onclick="listProjects()">تحديث القائمة</button>
      </div>
      <div id="projects_list" class="card small">—</div>
    </section>
  `);
}

async function createProject() {
  const listBox = document.getElementById("projects_list");
  try {
    const name = document.getElementById("p_name").value.trim();
    const desc = document.getElementById("p_desc").value.trim();

    const url = `${BACKEND_URL}/api/projects`;
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
    const url = `${BACKEND_URL}/api/projects`;

    const res = await fetch(url, {
      headers: { "Authorization": "Bearer " + (token || "") }
    });

    const data = await res.json().catch(() => []);

    if (!res.ok) {
      if (listBox) listBox.textContent = `Status: ${res.status} - فشل جلب المشاريع`;
      return;
    }

    if (Array.isArray(data) && listBox) {
      listBox.innerHTML =
        "<ul>" +
        data
          .map(p => `<li>${p.id} — ${p.name} (${p.description || ""})</li>`)
          .join("") +
        "</ul>";
    }
  } catch (err) {
    console.error(err);
    if (listBox) listBox.textContent = "خطأ في الاتصال أثناء جلب المشاريع.";
  }
}

// =========================
// واجهات باقي الأقسام (مبسّطة)
// =========================
function filesView() {
  setView(`
    <section class="card">
      <h3>الملفات</h3>
      <p class="small">سيتم تفعيل رفع الملفات بعد التأكد من عمل المشاريع والدردشة.</p>
    </section>
  `);
}

function chatView() {
  setView(`
    <section class="card">
      <h3>الدردشة</h3>
      <p class="small">الدردشة مربوطة بالذكاء الاصطناعي من الخلفية. بعد التأكد من المشاريع سنفعّل الواجهة هنا.</p>
    </section>
  `);
}

function voiceView() {
  setView(`
    <section class="card">
      <h3>الصوت</h3>
      <p class="small">ميزة الصوت تجريبية وسيتم تفعيلها لاحقًا.</p>
    </section>
  `);
}

function visionView() {
  setView(`
    <section class="card">
      <h3>الكاميرا</h3>
      <p class="small">ميزة الكاميرا تجريبية وسيتم تفعيلها لاحقًا.</p>
    </section>
  `);
}

function govView() {
  setView(`
    <section class="card">
      <h3>الحوكمة</h3>
      <p class="small">سيتم لاحقًا عرض سياسات الحوكمة هنا.</p>
    </section>
  `);
}

// =========================
// ربط الأزرار بعد تحميل الصفحة
// =========================
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

  // عرض صفحة الحساب افتراضياً
  authView();

  // فحص صحي للخلفية (اختياري – يظهر فقط في الكونسول)
  fetch(`${BACKEND_URL}/api/health`)
    .then(r => r.ok ? r.json() : Promise.reject(r.status))
    .then(d => console.log("Backend health:", d))
    .catch(e => console.log("Health check failed:", e));
});
