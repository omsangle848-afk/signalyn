import * as THREE from 'three';

/* ---------- 3D signal network background ---------- */
const canvas = document.getElementById('bg');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
let mouse = { x: 0, y: 0 };

try {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x070914, 0.035);
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.z = 14;

  // central glowing core
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(2.3, 1),
    new THREE.MeshBasicMaterial({ color: 0x7c5cff, wireframe: true, transparent: true, opacity: 0.55 })
  );
  const inner = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.2, 2),
    new THREE.MeshBasicMaterial({ color: 0x00e0c6, wireframe: true, transparent: true, opacity: 0.8 })
  );
  const group = new THREE.Group();
  group.add(core, inner);
  group.position.x = innerWidth > 900 ? 4.5 : 0;
  scene.add(group);

  // floating signal nodes + links
  const N = innerWidth < 700 ? 70 : 140;
  const pos = new Float32Array(N * 3), vel = [];
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 34;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 22;
    vel.push([(Math.random() - 0.5) * 0.008, (Math.random() - 0.5) * 0.008, (Math.random() - 0.5) * 0.008]);
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const points = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.09, transparent: true, opacity: 0.9 }));
  scene.add(points);

  const MAXL = N * 6;
  const lPos = new Float32Array(MAXL * 6);
  const lGeo = new THREE.BufferGeometry();
  lGeo.setAttribute('position', new THREE.BufferAttribute(lPos, 3));
  const lines = new THREE.LineSegments(lGeo, new THREE.LineBasicMaterial({ color: 0x5b8cff, transparent: true, opacity: 0.22 }));
  scene.add(lines);

  // orbiting "signal" rings
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xff5ca8, transparent: true, opacity: 0.5 });
  const rings = [3.6, 4.6].map((r, i) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 8, 160), ringMat);
    m.rotation.x = 1.1 + i * 0.5; group.add(m); return m;
  });

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    group.position.x = w > 900 ? 4.5 : 0;
  }
  addEventListener('resize', resize); resize();
  addEventListener('pointermove', (e) => {
    mouse.x = (e.clientX / innerWidth - 0.5) * 2;
    mouse.y = (e.clientY / innerHeight - 0.5) * 2;
  });

  let scrollY = 0;
  addEventListener('scroll', () => (scrollY = window.scrollY), { passive: true });

  const clock = new THREE.Clock();
  (function loop() {
    const t = clock.getElapsedTime();
    if (!reduce) {
      core.rotation.y = t * 0.25; core.rotation.x = t * 0.12;
      inner.rotation.y = -t * 0.4;
      rings.forEach((r, i) => (r.rotation.z = t * (0.3 + i * 0.15)));
      const s = 1 + Math.sin(t * 2) * 0.03; inner.scale.setScalar(s);
    }
    // drift nodes
    for (let i = 0; i < N; i++) {
      for (let k = 0; k < 3; k++) {
        pos[i * 3 + k] += reduce ? 0 : vel[i][k];
        const lim = k === 0 ? 17 : k === 1 ? 10 : 11;
        if (Math.abs(pos[i * 3 + k]) > lim) vel[i][k] *= -1;
      }
    }
    pGeo.attributes.position.needsUpdate = true;
    // connect near nodes
    let li = 0;
    for (let i = 0; i < N && li < MAXL; i++) {
      for (let j = i + 1; j < N && li < MAXL; j++) {
        const dx = pos[i*3]-pos[j*3], dy = pos[i*3+1]-pos[j*3+1], dz = pos[i*3+2]-pos[j*3+2];
        if (dx*dx + dy*dy + dz*dz < 14) {
          lPos.set([pos[i*3], pos[i*3+1], pos[i*3+2], pos[j*3], pos[j*3+1], pos[j*3+2]], li * 6); li++;
        }
      }
    }
    lGeo.setDrawRange(0, li * 2);
    lGeo.attributes.position.needsUpdate = true;

    // mouse parallax + scroll-driven camera
    camera.position.x += (mouse.x * 2.2 - camera.position.x) * 0.05;
    camera.position.y += (-mouse.y * 1.4 - scrollY * 0.004 - camera.position.y) * 0.05;
    camera.position.z = 14 + Math.min(scrollY * 0.004, 6);
    camera.lookAt(0, -scrollY * 0.002, 0);
    group.rotation.y += (mouse.x * 0.6 - group.rotation.y) * 0.03;

    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  })();
} catch (e) {
  // No WebGL: fall back to a CSS gradient so the page still looks good
  canvas.style.display = 'none';
  document.body.style.background = 'radial-gradient(circle at 70% 20%, #1c1650, #070914 60%)';
}

/* ---------- UI polish ---------- */
document.getElementById('yr').textContent = new Date().getFullYear();

document.querySelectorAll('[data-count]').forEach((el) => {
  const to = +el.dataset.count; let n = 0;
  const id = setInterval(() => { n += Math.max(1, Math.ceil(to / 30)); if (n >= to) { n = to; clearInterval(id); } el.textContent = n; }, 40);
});

document.querySelectorAll('.card,.panel,.section h2').forEach((el) => el.classList.add('reveal'));
const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && (e.target.classList.add('in'), io.unobserve(e.target))), { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

// 3D tilt on cards
if (!reduce && matchMedia('(hover:hover)').matches) {
  document.querySelectorAll('.tilt').forEach((c) => {
    c.addEventListener('pointermove', (e) => {
      const r = c.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      c.style.transform = `perspective(700px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg) translateZ(8px)`;
    });
    c.addEventListener('pointerleave', () => (c.style.transform = ''));
  });
}

/* ---------- Plan / token handling ---------- */
const KEY = 'signalyn_token';
const getToken = () => { try { return localStorage.getItem(KEY) || ''; } catch { return ''; } };
const setToken = (t) => { try { localStorage.setItem(KEY, t); } catch {} };
const headers = () => ({ 'content-type': 'application/json', ...(getToken() ? { authorization: 'Bearer ' + getToken() } : {}) });

async function refreshPlan() {
  try {
    const r = await fetch('/api/me', { headers: headers() });
    const j = await r.json();
    document.getElementById('planBadge').textContent = j.plan === 'free' ? 'Free trial' : j.name + ' plan active';
  } catch {}
}
refreshPlan();

/* ---------- AI demo ---------- */
const out = document.getElementById('out');
const runBtn = document.getElementById('run');

function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

function render(d) {
  out.replaceChildren();
  out.hidden = false;
  const icp = el('div', 'item'); icp.append(el('h4', '', 'Ideal customer'), el('p', '', d.icp || ''));
  out.append(icp);
  const sig = el('div'); sig.append(el('h4', '', 'Buying signals to watch'));
  (d.signals || []).forEach((s) => {
    const it = el('div', 'item'); it.style.marginTop = '8px';
    const b = el('b', '', s.platform + ': '); it.append(b, document.createTextNode('"' + s.query + '"'), el('small', '', s.why));
    sig.append(it);
  });
  out.append(sig);
  const dr = el('div'); dr.append(el('h4', '', 'Outreach drafts'));
  (d.drafts || []).forEach((x) => {
    const it = el('div', 'item'); it.style.marginTop = '8px';
    it.append(el('b', '', 'To ' + x.to), el('p', '', x.text)); dr.append(it);
  });
  out.append(dr);
  if (d.competitors?.length) { const c = el('div', 'item'); c.append(el('h4', '', 'Likely competitors'), el('p', '', d.competitors.join(', '))); out.append(c); }
  if (d.risks?.length) { const c = el('div', 'item'); c.append(el('h4', '', 'Stay compliant'), el('p', '', d.risks.join(' • '))); out.append(c); }
  if (d.note) out.append(el('small', 'muted', d.note));
}

runBtn.addEventListener('click', async () => {
  const product = document.getElementById('product').value.trim();
  if (product.length < 10) { out.hidden = false; out.replaceChildren(el('p', 'err', 'Please describe your product in a sentence or two.')); return; }
  runBtn.disabled = true; runBtn.textContent = 'Scanning…';
  try {
    const r = await fetch('/api/analyze', { method: 'POST', headers: headers(), body: JSON.stringify({ product }) });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'Something went wrong');
    render(j);
  } catch (e) { out.hidden = false; out.replaceChildren(el('p', 'err', e.message)); }
  runBtn.disabled = false; runBtn.textContent = 'Find buyers';
});

/* ---------- Razorpay checkout ---------- */
const payMsg = document.getElementById('payMsg');
function loadRzp() {
  return new Promise((ok, fail) => {
    if (window.Razorpay) return ok();
    const s = document.createElement('script'); s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = ok; s.onerror = () => fail(new Error('Could not load payment window')); document.head.append(s);
  });
}

document.querySelectorAll('.buy').forEach((btn) => btn.addEventListener('click', async () => {
  payMsg.textContent = 'Opening secure checkout…'; btn.disabled = true;
  try {
    const r = await fetch('/api/create-order', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ plan: btn.dataset.plan }) });
    const o = await r.json();
    if (!r.ok) throw new Error(o.error || 'Could not start payment');
    await loadRzp();
    new window.Razorpay({
      key: o.keyId, amount: o.amount, currency: o.currency, order_id: o.orderId,
      name: 'Signalyn', description: o.name + ' plan (30 days)', theme: { color: '#7c5cff' },
      handler: async (resp) => {
        payMsg.textContent = 'Verifying payment…';
        const v = await fetch('/api/verify-payment', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(resp) });
        const j = await v.json();
        if (!v.ok) { payMsg.textContent = j.error || 'Verification failed'; return; }
        setToken(j.token); payMsg.textContent = '🎉 ' + j.name + ' plan activated! Head to the demo above.';
        refreshPlan(); document.getElementById('demo').scrollIntoView();
      },
      modal: { ondismiss: () => { payMsg.textContent = 'Payment cancelled.'; } },
    }).open();
  } catch (e) { payMsg.textContent = e.message; }
  btn.disabled = false;
}));
