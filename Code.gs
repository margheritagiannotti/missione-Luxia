/**
 * Missione Luxia · la "base" del gioco (Google Apps Script)
 * Salva giocatori, stato della partita e domande. Non serve nessun account per giocare.
 *
 * 1. script.google.com → Nuovo progetto → incolla tutto questo file
 * 2. Cambia il PIN qui sotto (serve solo a chi gestisce il proiettore e le domande)
 * 3. Distribuisci → Nuovo deployment → tipo "App web"
 *      Esegui come: Me    ·    Chi ha accesso: Chiunque
 * 4. Copia l'URL (finisce con /exec) e incollalo nel file config.js del sito su GitHub
 */
const PIN = 'luxia2026';

const DEFAULT_QUESTIONS = [
  { q: 'Vivibanca POC was delivered?', a: ['Yes', 'No'], c: 0 },
  { q: 'Would you define Luxia more as:', a: ['Suppliers', 'AI Partners'], c: 1 },
  { q: 'Which one is correct?', a: ['Luxia is an Italian Applied AI Lab that guides its clients in integrating and using AI within their own systems, automating their processes through agents', 'Luxia is a no-code platform to automatize processes'], c: 0 }
];
const DEFAULT_STATE = { status: 'lobby', round: 1, mainLen: 6, detourLen: 2, penaltySec: 3, startedAt: 0 };

function doGet() { return out_(snapshot_()); }

function doPost(e) {
  let b = {};
  try { b = JSON.parse(e.postData.contents || '{}'); } catch (err) { return out_({ error: 'bad json' }); }
  if (b.action === 'check') return out_({ ok: b.pin === PIN });
  const lock = LockService.getScriptLock();
  lock.waitLock(8000);
  try {
    const P = PropertiesService.getScriptProperties();
    if (b.action === 'player') {
      const id = String(b.id || '').replace(/[^\w-]/g, '').slice(0, 40);
      const p = b.p || {};
      if (!id || !p.name) return out_({ error: 'bad player' });
      const clean = {
        name: String(p.name).slice(0, 14), color: String(p.color || '#FFC857').slice(0, 9),
        round: +p.round || 1, main: +p.main || 0, detour: +p.detour || 0, qi: +p.qi || 0,
        correct: +p.correct || 0, wrong: +p.wrong || 0, finishedAt: p.finishedAt ? +p.finishedAt : null,
        joinedAt: +p.joinedAt || Date.now(), updatedAt: Date.now()
      };
      P.setProperty('p_' + id, JSON.stringify(clean));
    } else {
      if (b.pin !== PIN) return out_({ error: 'pin' });
      if (b.action === 'state') P.setProperty('state', JSON.stringify(Object.assign({}, DEFAULT_STATE, b.state || {})));
      else if (b.action === 'questions') P.setProperty('questions', JSON.stringify((b.list || []).slice(0, 60)));
      else if (b.action === 'clear') {
        Object.keys(P.getProperties()).filter(k => k.indexOf('p_') === 0).forEach(k => P.deleteProperty(k));
        const s = JSON.parse(P.getProperty('state') || JSON.stringify(DEFAULT_STATE));
        P.setProperty('state', JSON.stringify(Object.assign(s, { status: 'lobby', round: (s.round || 1) + 1, startedAt: 0 })));
      } else return out_({ error: 'unknown action' });
    }
  } finally { lock.releaseLock(); }
  return out_(snapshot_());
}

function snapshot_() {
  const all = PropertiesService.getScriptProperties().getProperties();
  const players = [];
  Object.keys(all).forEach(k => { if (k.indexOf('p_') === 0) { try { const p = JSON.parse(all[k]); p.id = k.slice(2); players.push(p); } catch (e) {} } });
  return {
    state: all.state ? JSON.parse(all.state) : DEFAULT_STATE,
    questions: all.questions ? JSON.parse(all.questions) : DEFAULT_QUESTIONS,
    players: players
  };
}
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/** Esegui questa funzione una volta a mano per azzerare tutto (giocatori, stato, domande). */
function azzeraTutto() { PropertiesService.getScriptProperties().deleteAllProperties(); }
