import { PROJECTS } from './projects.js';

// Google Apps Script Web App URL (see ../apps-script/Code.gs). Empty = form shows "not configured".
const SCRIPT_URL = '';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, el = document) => el.querySelector(s);
const byId = Object.fromEntries(PROJECTS.map(p => [p.id, p]));

/* ---------- Journey stages ---------- */
const STAGES = [
  { short: 'Challenge', title: 'Your Challenge', icon: 'flag',
    text: 'At the end of Trimester I, you share a challenge statement on an industry, social, sustainability or business theme. We allocate it to a diverse student team (by gender, education and work-ex) and assign a faculty mentor.',
    you: 'Share a challenge statement through the form below.',
    eg: 'deloitte', egText: 'Deloitte asked how AI-enabled personal data collection affects privacy.' },
  { short: 'Stakeholders', title: 'Stakeholder Mapping', icon: 'hub',
    text: 'Teams identify everyone the challenge touches (customers, regulators, partners, communities) and how they influence the outcome.',
    you: 'Fine-tune the challenge statement with the faculty mentor.',
    eg: 'kaleidosync', egText: 'Mapped the whole silk value chain, from silkworm and mulberry farmers to traders, weavers and fashion designers.' },
  { short: 'Journey', title: 'Customer Journey', icon: 'route',
    text: 'Teams walk in the user\'s shoes through awareness, consideration, decision and delivery, to find where the experience breaks down.',
    you: null,
    eg: 'deloitte', egText: 'Journeys of a tech employee and a privacy-concerned citizen showed people want control but lack visibility.' },
  { short: 'Insights', title: 'Observations & Insights', icon: 'insights',
    text: 'Primary surveys, interviews and secondary research narrow the problem to three opportunity spaces.',
    you: 'Review the 3 opportunity spaces and give feedback (Phase I).',
    eg: 'idfc', egText: '77% of respondents were comfortable with ESG features in retail banking, and 66% wanted to see the impact of their transactions.' },
  { short: 'Prototype', title: 'Prototyping', icon: 'devices',
    text: 'In Trimester III the chosen opportunity space becomes a working prototype built with relevant new-age technology (AI, apps, chatbots, low-code) and sustainability in mind.',
    you: 'Give feedback on the prototype.',
    eg: 'govardhan', egText: 'A low-code volunteer portal with registration, status tracking and a live dashboard.' },
  { short: 'Solution', title: 'Commercially Feasible Solution', icon: 'rocket_launch',
    text: 'The team presents a solution with a business plan (revenue model, go-to-market, cash needs and ROI) that your organisation can act on.',
    you: 'Attend the final solution presentation.',
    eg: 'aurapay', egText: 'Age-segmented banking app with AI fraud alerts, voice banking and a senior-friendly UI.' },
];

const dots = $('.dots'), stagesEl = $('.stages');
STAGES.forEach((s, i) => {
  const li = document.createElement('li');
  li.innerHTML = `<i>${i === 0 ? '★' : i}</i><span>${s.short}</span>`;
  li.addEventListener('click', () => scrollToStage(i));
  dots.append(li);

  const p = byId[s.eg];
  const card = document.createElement('article');
  card.className = 'stagecard';
  card.innerHTML = `
    <div class="glass">
      <div class="num">${i === 0 ? 'Start' : 'Stage ' + i} · <span class="ms" style="vertical-align:-5px">${s.icon}</span></div>
      <h3>${s.title}</h3>
      <p>${s.text}</p>
      ${s.you ? `<div class="you"><span class="ms">star</span><span><b>Your role:</b> ${s.you}</span></div>` : ''}
    </div>
    <div class="glass eg">
      <h4>Seen in a past project</h4>
      <strong>${p.org}: ${p.title}</strong>
      <p>${s.egText}</p>
      <button class="btn ghost sm" data-open="${p.id}">View project</button>
    </div>`;
  stagesEl.append(card);
});

const journey = $('#journey');
function journeyProgress() {
  const range = journey.offsetHeight - innerHeight;
  return Math.min(1, Math.max(0, (scrollY - journey.offsetTop) / range));
}
function scrollToStage(i) {
  const range = journey.offsetHeight - innerHeight;
  scrollTo({ top: journey.offsetTop + range * (i + 0.5) / STAGES.length, behavior: reduceMotion ? 'auto' : 'smooth' });
}
let activeStage = -1;
function updateStages() {
  const idx = Math.min(STAGES.length - 1, Math.floor(journeyProgress() * STAGES.length));
  if (idx === activeStage) return;
  activeStage = idx;
  [...stagesEl.children].forEach((c, i) => c.classList.toggle('on', i === idx));
  [...dots.children].forEach((d, i) => d.classList.toggle('on', i <= idx));
  dots.style.setProperty('--p', idx / (STAGES.length - 1));
}
addEventListener('scroll', updateStages, { passive: true });
updateStages();

/* ---------- Projects carousel (CSS 3D) ---------- */
const stage3d = $('.stage3d'), ring = $('.ring');
const STEP = 360 / PROJECTS.length;
PROJECTS.forEach((p, i) => {
  const b = document.createElement('button');
  b.className = 'pcard';
  b.style.setProperty('--i', i);
  b.dataset.i = i;
  b.innerHTML = `<img src="${p.image}" alt="" loading="lazy"><div><small>${p.org} · ${p.domain}</small><h3>${p.title}</h3><p>${p.challenge}</p></div>`;
  ring.append(b);
});

let rot = 0;
const setRot = r => { rot = r; ring.style.setProperty('--rot', rot + 'deg'); };
const frontIndex = () => ((Math.round(-rot / STEP) % PROJECTS.length) + PROJECTS.length) % PROJECTS.length;
document.querySelectorAll('.ringnav button').forEach(b =>
  b.addEventListener('click', () => setRot(Math.round(rot / STEP) * STEP - b.dataset.dir * STEP)));

let drag = null, moved = false;
stage3d.addEventListener('pointerdown', e => {
  if (innerWidth <= 900) return;
  drag = { x: e.clientX, rot }; moved = false;
  stage3d.setPointerCapture(e.pointerId);
});
stage3d.addEventListener('pointermove', e => {
  if (!drag) return;
  const dx = e.clientX - drag.x;
  if (Math.abs(dx) > 5) { moved = true; stage3d.classList.add('drag'); }
  if (moved) setRot(drag.rot + dx * 0.25);
});
stage3d.addEventListener('pointerup', e => {
  if (!drag) return;
  stage3d.releasePointerCapture(e.pointerId);
  stage3d.classList.remove('drag');
  drag = null;
  if (moved) { setRot(Math.round(rot / STEP) * STEP); return; }
  // Plain click: pointer capture retargets the click, so hit-test the real element.
  const card = document.elementFromPoint(e.clientX, e.clientY)?.closest('.pcard');
  if (card) cardClick(+card.dataset.i);
});
ring.addEventListener('click', e => {
  // Keyboard (Enter/Space) and mobile taps; pointer clicks are handled above.
  const card = e.target.closest('.pcard');
  if (card && (e.detail === 0 || innerWidth <= 900)) openProject(PROJECTS[card.dataset.i].id);
});
function cardClick(i) {
  if (i === frontIndex()) return openProject(PROJECTS[i].id);
  let delta = ((i - frontIndex()) % PROJECTS.length + PROJECTS.length) % PROJECTS.length;
  if (delta > PROJECTS.length / 2) delta -= PROJECTS.length;
  setRot(Math.round(rot / STEP) * STEP - delta * STEP);
}

/* ---------- Project modal ---------- */
const modal = $('#modal');
function openProject(id) {
  const p = byId[id];
  const rows = [['Challenge', p.challenge], ['Stakeholders', p.stakeholders], ['Insights', p.insight], ['Prototype', p.prototype], ['Solution', p.outcome]];
  $('.mbody', modal).innerHTML = `
    <div class="poster"><img src="${p.image}" alt="${p.org} project poster"></div>
    <div class="info">
      <small>${p.org} · ${p.domain}</small>
      <h3>${p.title}</h3>
      <dl>${rows.map(([k, v], i) => `<div><dt><b>${i + 1}</b>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
      <p class="team">${p.team}${p.mentor ? '<br>' + p.mentor : ''}</p>
    </div>`;
  modal.showModal();
}
document.addEventListener('click', e => {
  const t = e.target.closest('[data-open]');
  if (t) openProject(t.dataset.open);
});
$('.close', modal).addEventListener('click', () => modal.close());
modal.addEventListener('click', e => { if (e.target === modal) modal.close(); });

/* ---------- Partner form ---------- */
const form = $('#form'), status = $('.status', form);
form.addEventListener('submit', async e => {
  e.preventDefault();
  form.classList.add('touched');
  status.className = 'status';
  if (!form.checkValidity()) { form.reportValidity(); return; }
  if (form.website.value) return; // honeypot filled = bot
  if (!SCRIPT_URL) {
    status.className = 'status err';
    status.textContent = 'Submissions are not connected yet. Please email the GCL team in the meantime.';
    return;
  }
  const btn = $('button[type=submit]', form);
  btn.disabled = true; status.textContent = 'Sending…';
  try {
    // no-cors: Apps Script doesn't send CORS headers; the response is opaque but the row is written.
    await fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: new URLSearchParams(new FormData(form)) });
    status.className = 'status ok';
    status.textContent = 'Thank you! Your challenge has been submitted. The GCL team will be in touch.';
    form.reset(); form.classList.remove('touched');
  } catch {
    status.className = 'status err';
    status.textContent = 'Could not send. Please check your connection and try again.';
  } finally { btn.disabled = false; }
});

/* ---------- 3D background (loaded separately so the page works without WebGL/CDN) ---------- */
import('./scene.js')
  .then(m => m.start({ journeyProgress, journey, reduceMotion, stageCount: STAGES.length }))
  .catch(err => { console.warn('3D scene disabled:', err); document.documentElement.classList.add('no-webgl'); });
