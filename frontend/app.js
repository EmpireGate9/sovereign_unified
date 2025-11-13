async function sendRegister(email, name, password){ const body={email:email,password:password,full_name:name}; const res=await fetch(BACKEND_URL+REGISTER_PATH,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}); return res;}
const REGISTER_PATH = "/api/auth/register";
const BACKEND_URL = "https://sovereign-backend-rhel.onrender.com";
let token = localStorage.getItem('token') || '';

function setView(html){ document.getElementById('view').innerHTML = html; }

function authView(){
  setView(`
  <section class="card">
    <div class="row">
      <div class="col">
        <h3>تسجيل</h3>
        <input id="r_email" placeholder="email@example.com" />
        <input id="r_name" placeholder="الاسم" />
        <input id="r_pass" type="password" placeholder="كلمة المرور" />
        <div class="actions"><button onclick="register()">تسجيل</button></div>
      </div>
      <div class="col">
        <h3>دخول</h3>
        <input id="l_email" placeholder="email@example.com" />
        <input id="l_pass" type="password" placeholder="كلمة المرور" />
        <div class="actions"><button onclick="login()">دخول</button></div>
      </div>
    </div>
    <p class="small">التوكن: <code>${token ? token.slice(0,16)+'...' : '—'}</code></p>
  </section>`);
}

async function register(){
  const res = await fetch('http://localhost:8080/api/api/auth/register',{
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({email: r_email.value, password: r_pass.value, full_name: r_name.value})
  });
  alert(res.ok ? 'تم التسجيل' : 'فشل التسجيل');
}

async function login(){
  const res = await fetch('http://localhost:8080/auth/login',{
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({email: l_email.value, password: l_pass.value})
  });
  const data = await res.json();
  if(res.ok){
    token = data.access_token; localStorage.setItem('token', token);
    alert('تم الدخول');
  } else { alert(data.detail || 'فشل'); }
}

function projectsView(){
  setView(`
  <section class="card">
    <h3>المشاريع</h3>
    <div class="row">
      <div class="col"><input id="p_name" placeholder="اسم المشروع"/></div>
      <div class="col"><input id="p_desc" placeholder="وصف"/></div>
    </div>
    <div class="actions"><button onclick="createProject()">إنشاء</button> <button onclick="listProjects()">تحديث القائمة</button></div>
    <div id="projects_list" class="card small">—</div>
  </section>`);
}

async function createProject(){
  const res = await fetch('http://localhost:8080/projects',{
    method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
    body: JSON.stringify({name: p_name.value, description: p_desc.value})
  });
  alert(res.ok ? 'تم إنشاء المشروع' : 'فشل');
}

async function listProjects(){
  const res = await fetch('http://localhost:8080/projects', {headers:{'Authorization':'Bearer '+token}});
  const data = await res.json();
  projects_list.innerHTML = '<ul>'+data.map(p=>`<li>${p.id} — ${p.name}</li>`).join('')+'</ul>';
}

function filesView(){
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

async function uploadFile(){
  const fd = new FormData();
  fd.append('project_id', f_pid.value);
  fd.append('f', file_input.files[0]);
  const res = await fetch('http://localhost:8080/files/upload',{method:'POST', headers:{'Authorization':'Bearer '+token}, body:fd});
  file_resp.textContent = await res.text();
}

function chatView(){
  setView(`
  <section class="card">
    <h3>الدردشة</h3>
    <div class="row">
      <div class="col"><input id="c_pid" placeholder="Project ID"/></div>
      <div class="col"><input id="c_text" placeholder="اكتب رسالة"/></div>
    </div>
    <div class="actions"><button onclick="sendMsg()">إرسال</button> <button onclick="loadHistory()">تحديث</button></div>
    <pre id="chat_box" class="small">—</pre>
  </section>`);
}

async function sendMsg(){
  const res = await fetch('http://localhost:8080/chat/send',{method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+token}, body: JSON.stringify({project_id: c_pid.value, content: c_text.value})});
  alert(res.ok ? 'تم الإرسال' : 'فشل');
}
async function loadHistory(){
  const res = await fetch('http://localhost:8080/chat/history?project_id='+encodeURIComponent(c_pid.value), {headers:{'Authorization':'Bearer '+token}});
  chat_box.textContent = await res.text();
}

function voiceView(){
  setView(`
  <section class="card">
    <h3>الصوت (تجريبي)</h3>
    <div class="row"><div class="col"><input id="v_pid" placeholder="Project ID"/></div></div>
    <div class="actions"><button id="rec_btn">بدء التسجيل</button> <button onclick="uploadAudio()">رفع المقطع</button></div>
    <p class="small">يحتاج المتصفح دعم MediaRecorder.</p>
    <pre id="voice_resp" class="small">—</pre>
  </section>`);

  window._chunks = [];
  let mediaRecorder;
  const btn = document.getElementById('rec_btn');
  btn.onclick = async () => {
    if(!mediaRecorder){
      const stream = await navigator.mediaDevices.getUserMedia({audio:true});
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = e => _chunks.push(e.data);
      mediaRecorder.start();
      btn.textContent = 'إيقاف التسجيل';
    } else {
      mediaRecorder.stop();
      btn.textContent = 'بدء التسجيل';
      mediaRecorder = null;
    }
  };
}

async function uploadAudio(){
  if(!_chunks || !_chunks.length){ alert('لا يوجد تسجيل'); return; }
  const blob = new Blob(_chunks, {type:'audio/webm'});
  const fd = new FormData();
  fd.append('project_id', v_pid.value);
  fd.append('audio', blob, 'voice.webm');
  const res = await fetch('http://localhost:8080/voice/upload', {method:'POST', headers:{'Authorization':'Bearer '+token}, body: fd});
  voice_resp.textContent = await res.text();
  _chunks = [];
}

function visionView(){
  setView(`
  <section class="card">
    <h3>الكاميرا (تجريبي)</h3>
    <div class="row"><div class="col"><input id="i_pid" placeholder="Project ID"/></div></div>
    <video id="vid" autoplay playsinline style="max-width:100%;border-radius:12px;border:1px solid #333"></video>
    <div class="actions"><button id="cam_btn">تشغيل/إيقاف</button> <button onclick="snap()">التقاط & رفع</button></div>
    <canvas id="cv" style="display:none"></canvas>
    <pre id="img_resp" class="small">—</pre>
  </section>`);
  let stream;
  const v = document.getElementById('vid');
  const btn = document.getElementById('cam_btn');
  btn.onclick = async () => {
    if(!stream){
      stream = await navigator.mediaDevices.getUserMedia({video:true});
      v.srcObject = stream;
    } else {
      stream.getTracks().forEach(t=>t.stop()); stream=null; v.srcObject=null;
    }
  };
}

async function snap(){
  const v = document.getElementById('vid');
  if(!v.srcObject){ alert('شغل الكاميرا'); return; }
  const cv = document.getElementById('cv');
  cv.width = v.videoWidth; cv.height = v.videoHeight;
  cv.getContext('2d').drawImage(v,0,0);
  const blob = await new Promise(r=>cv.toBlob(r,'image/png'));
  const fd = new FormData();
  fd.append('project_id', i_pid.value);
  fd.append('image', blob, 'snap.png');
  const res = await fetch('http://localhost:8080/vision/upload', {method:'POST', headers:{'Authorization':'Bearer '+token}, body: fd});
  img_resp.textContent = await res.text();
}

function govView(){
  setView(`
  <section class="card">
    <h3>الحوكمة</h3>
    <input id="pol_name" placeholder="اسم السياسة (admin فقط)"/>
    <textarea id="pol_rules" placeholder='{"allow":["admin"],"deny":["*"]}'></textarea>
    <div class="actions"><button onclick="createPolicy()">إنشاء سياسة</button></div>
    <div class="actions"><button onclick="listPolicies()">عرض السياسات</button></div>
    <pre id="pol_out" class="small">—</pre>
  </section>`);
}

async function createPolicy(){
  const res = await fetch('http://localhost:8080/governance/policies', {method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+token}, body: JSON.stringify({name: pol_name.value, rules: JSON.parse(pol_rules.value||"{}")})});
  pol_out.textContent = await res.text();
}
async function listPolicies(){
  const res = await fetch('http://localhost:8080/governance/policies', {headers:{'Authorization':'Bearer '+token}});
  pol_out.textContent = await res.text();
}

document.getElementById('nav-auth').onclick = authView;
document.getElementById('nav-projects').onclick = projectsView;
document.getElementById('nav-files').onclick = filesView;
document.getElementById('nav-chat').onclick = chatView;
document.getElementById('nav-voice').onclick = voiceView;
document.getElementById('nav-vision').onclick = visionView;
document.getElementById('nav-gov').onclick = govView;

authView();

fetch(`${BACKEND_URL}/health`)
  .then(r => r.json())
  .then(d => console.log("Backend Connected:", d))
  .catch(e => console.error("Connection failed:", e));


// === Injected by deploy script ===
(() => {
  const BACKEND_URL = "https://sovereign-backend-rhel.onrender.com";

  // محاولة وسم الحقول والأزرار تلقائياً حسب ترتيبها الظاهر في الصفحة
  const inputs = Array.from(document.querySelectorAll('input'));
  // نتوقع أول 3 للتسجيل، وبعدها 2 للدخول (حسب الواجهة الحالية)
  const [regEmail, regName, regPass, loginEmail, loginPass] = inputs;

  // وسم أزرار "تسجيل" و"دخول" بالاعتماد على نص الزر
  const buttons = Array.from(document.querySelectorAll('button'));
  const regBtn   = buttons.find(b => /تسجيل/.test(b.textContent || b.innerText));
  const loginBtn = buttons.find(b => /دخول/.test(b.textContent || b.innerText));

  // مكان عرض التوكن إن وجد، أو إنشاؤه
  let tokenBox = document.querySelector('#tokenDisplay');
  if (!tokenBox) {
    tokenBox = document.createElement('div');
    tokenBox.id = 'tokenDisplay';
    tokenBox.style.cssText = 'margin-top:16px;font-size:14px;direction:rtl;color:#9ae6b4';
    const container = document.body || document.documentElement;
    container.appendChild(tokenBox);
  }
  const setToken = (t) => {
    if (t) localStorage.setItem('token', t);
    const v = localStorage.getItem('token') || '—';
    tokenBox.textContent = `التوكن: ${v}`;
  };
  setToken(); // عرض المخزّن إن وُجد

  const call = async (path, data, withAuth=false) => {
    const url = `${BACKEND_URL}${path}`;
    const headers = {'Content-Type': 'application/json'};
    if (withAuth) {
      const t = localStorage.getItem('token');
      if (t) headers['Authorization'] = `Bearer ${t}`;
    }
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data||{})
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  };

  // ربط التسجيل
  if (regBtn && regEmail && regName && regPass) {
    regBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        const payload = { email: regEmail.value, name: regName.value, password: regPass.value };
        // جرّب مسارات شائعة للتسجيل
        const endpoints = ['/register', '/api/api/auth/register', '/api/api/auth/register'];
        let resp;
        for (const ep of endpoints) {
          try { resp = await call(ep, payload); break; } catch {}
        }
        if (!resp) throw new Error('No register endpoint worked');
        // لو رجّع توكن
        const token = resp.token || resp.access_token || resp.jwt;
        if (token) setToken(token);
        alert('تم التسجيل بنجاح');
      } catch (err) {
        console.error(err); alert('فشل التسجيل');
      }
    });
  }

  // ربط الدخول
  if (loginBtn && loginEmail && loginPass) {
    loginBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        const payload = { email: loginEmail.value, password: loginPass.value };
        const endpoints = ['/login', '/auth/login', '/auth/login', '/token'];
        let resp;
        for (const ep of endpoints) {
          try { resp = await call(ep, payload); break; } catch {}
        }
        if (!resp) throw new Error('No login endpoint worked');
        const token = resp.token || resp.access_token || resp.jwt;
        if (token) setToken(token);
        alert('تم تسجيل الدخول');
      } catch (err) {
        console.error(err); alert('فشل تسجيل الدخول');
      }
    });
  }

  // فحص سريع للباكند
  fetch(`${BACKEND_URL}/health`)
    .then(r => r.ok ? r.json() : Promise.reject(r.status))
    .then(d => console.log('Backend OK:', d))
    .catch(() => console.log('Health check not found, continuing...'));
})();
