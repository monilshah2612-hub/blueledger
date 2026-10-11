'use strict';
// Cloud sync between devices (phone app + web app).
// Every record (account, transaction, ...) is synced on its own, newest edit wins.
// Deletes travel as "tombstones". Works offline: changes are sent once you are back online.
(function (App) {
  var META_KEY = 'blueledger.sync.v1';
  var COLS = ['accounts', 'categories', 'transactions', 'envelopes', 'bills', 'goals', 'loans', 'friends', 'splits', 'settlements'];
  var $ = App.$, esc = App.esc;

  function freshMeta() { return { uid: '', email: '', initialDone: false, snap: {}, tombs: {}, settings: { h: '', u: 0, p: true }, lastSync: null, photosPushed: {} }; }
  function loadMeta() {
    try { var m = JSON.parse(localStorage.getItem(META_KEY)); if (m && m.snap) return Object.assign(freshMeta(), m); } catch (e) { /* none */ }
    return freshMeta();
  }
  var meta = loadMeta();
  function saveMeta() { try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch (e) { /* ignore */ } }

  // fast 53-bit string hash (change detection only)
  function h53(str) {
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57, ch;
    for (var i = 0; i < str.length; i++) { ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }
  var settingsPayload = function () { var s = App.db.settings; return JSON.stringify({ name: s.name || '', currency: s.currency || '₹' }); };

  var adapter = null, unsub = null, user = null, started = false;
  var st = { status: 'off', error: '' };           // off | idle | syncing | offline | error
  var firstResolve = null, firstP = null, firstDone = false;
  var running = false, queued = false, timer = null, inited = false;

  function notify() { if (App.ui && App.ui.page === 'sync' && App.renderPage) App.renderPage(); }
  function setStatus(s, err) { st.status = s; st.error = err || ''; notify(); }

  // ---------- detect what changed on this device ----------
  function scan() {
    var now = Date.now(), seen = {}, changed = 0;
    COLS.forEach(function (c) {
      App.db[c].forEach(function (r) {
        var key = c + '~' + r.id; seen[key] = 1;
        var hh = h53(JSON.stringify(r)), s = meta.snap[key];
        if (!s) { meta.snap[key] = { h: hh, u: now, p: false, c: c }; delete meta.tombs[key]; changed++; }
        else if (s.h !== hh) { s.h = hh; s.u = now; s.p = false; changed++; }
      });
    });
    Object.keys(meta.snap).forEach(function (key) {
      if (!seen[key]) { meta.tombs[key] = { u: now, p: false, c: meta.snap[key].c }; delete meta.snap[key]; changed++; }
    });
    if (App.db.settings.onboarded) {
      var sh = h53(settingsPayload());
      if (meta.settings.h !== sh) { meta.settings = { h: sh, u: now, p: false }; changed++; }
    }
    return changed;
  }
  function pendingCount() {
    var n = 0;
    Object.keys(meta.snap).forEach(function (k) { if (!meta.snap[k].p) n++; });
    Object.keys(meta.tombs).forEach(function (k) { if (!meta.tombs[k].p) n++; });
    if (!meta.settings.p) n++;
    return n;
  }

  // ---------- apply what other devices changed ----------
  function applySettings(d, firstTime) {
    var cur = meta.settings;
    if (!firstTime && cur.u && d.u <= cur.u) return false;
    var p; try { p = JSON.parse(d.data); } catch (e) { return false; }
    var s = App.db.settings, chg = (s.name !== (p.name || '') || s.currency !== (p.currency || '₹'));
    s.name = p.name || ''; s.currency = p.currency || '₹';
    meta.settings = { h: h53(settingsPayload()), u: d.u, p: true };
    return chg;
  }
  function merge(docs, firstTime) {
    var changed = 0, maps = {}, touched = {}, added = {};
    COLS.forEach(function (c) { var m = {}; App.db[c].forEach(function (r) { m[r.id] = r; }); maps[c] = m; added[c] = []; });
    docs.forEach(function (d) {
      if (!d || !d.c) return;
      if (d.c === 'settings') { if (applySettings(d, firstTime)) changed++; return; }
      if (COLS.indexOf(d.c) < 0) return;
      var key = d.c + '~' + d.id, local = meta.snap[key] || meta.tombs[key], existing = maps[d.c][d.id];
      if (local && d.u <= local.u) return;                 // our copy is newer (or the same): keep it
      if (d.del) {
        if (existing) { delete maps[d.c][d.id]; touched[d.c] = 1; changed++; }
        delete meta.snap[key]; meta.tombs[key] = { u: d.u, p: true, c: d.c };
        return;
      }
      var rec; try { rec = JSON.parse(d.data); } catch (e) { return; }
      if (!rec || rec.id !== d.id) return;
      var hh = h53(JSON.stringify(rec));
      if (!(existing && h53(JSON.stringify(existing)) === hh)) {
        if (existing) maps[d.c][d.id] = rec; else { maps[d.c][d.id] = rec; added[d.c].push(d.id); }
        touched[d.c] = 1; changed++;
      }
      meta.snap[key] = { h: hh, u: d.u, p: true, c: d.c }; delete meta.tombs[key];
    });
    Object.keys(touched).forEach(function (c) {
      var m = maps[c], out = [], have = {};
      App.db[c].forEach(function (r) { have[r.id] = 1; if (m[r.id]) out.push(m[r.id]); });
      added[c].forEach(function (id) { if (m[id] && !have[id]) out.push(m[id]); });
      App.db[c] = out;
    });
    return changed;
  }
  function afterRemote() {
    var db = App.db;
    if (db.accounts.length && !db.settings.onboarded) {
      db.settings.onboarded = true;
      var w = $('#wizard'); if (w) { w.classList.add('hidden'); w.innerHTML = ''; }
    }
    App.persist();
    App.render();
    if (App.scheduleReminders) App.scheduleReminders();
  }

  function onDocs(docs, isFirst) {
    if (meta.initialDone) scan();                          // timestamp our own pending edits first
    var changed = merge(docs, !meta.initialDone);
    if (isFirst) meta.initialDone = true;
    if (changed || isFirst) afterRemote();
    saveMeta();
    if (isFirst) { firstDone = true; if (firstResolve) firstResolve(); }
    else if (pendingCount()) touch();
  }

  // ---------- send our changes ----------
  function withTimeout(p, ms, msg) {
    return Promise.race([p, new Promise(function (_, rej) { setTimeout(function () { rej(new Error(msg)); }, ms); })]);
  }
  async function push() {
    var idx = {}, docs = [];
    COLS.forEach(function (c) { var m = {}; App.db[c].forEach(function (r) { m[r.id] = r; }); idx[c] = m; });
    Object.keys(meta.snap).forEach(function (key) {
      var s = meta.snap[key]; if (s.p) return;
      var id = key.slice(key.indexOf('~') + 1), rec = idx[s.c] && idx[s.c][id];
      if (rec) docs.push({ key: key, c: s.c, id: id, u: s.u, del: false, data: JSON.stringify(rec) });
    });
    Object.keys(meta.tombs).forEach(function (key) {
      var s = meta.tombs[key]; if (s.p) return;
      docs.push({ key: key, c: s.c, id: key.slice(key.indexOf('~') + 1), u: s.u, del: true, data: '' });
    });
    var sentSettings = null;
    if (!meta.settings.p && App.db.settings.onboarded) {
      sentSettings = meta.settings.u;
      docs.push({ key: 'settings~main', c: 'settings', id: 'main', u: meta.settings.u, del: false, data: settingsPayload() });
    }
    if (!docs.length) return;
    await withTimeout(adapter.push(docs), 20000, 'Could not reach the sync server');
    docs.forEach(function (d) {
      if (d.c === 'settings') { if (meta.settings.u === sentSettings) meta.settings.p = true; return; }
      var s = d.del ? meta.tombs[d.key] : meta.snap[d.key];
      if (s && s.u === d.u) s.p = true;
    });
  }
  async function syncPhotos() {
    var ids = {};
    App.db.transactions.forEach(function (t) { (t.photos || []).forEach(function (id) { ids[id] = 1; }); });
    var keys = Object.keys(ids), pulled = 0;
    for (var i = 0; i < keys.length; i++) {
      var id = keys[i], local = await App.photos.get(id);
      if (local) {
        if (!meta.photosPushed[id]) { await withTimeout(adapter.putPhoto(id, local), 30000, 'Photo upload timed out'); meta.photosPushed[id] = 1; }
      } else {
        var remote = await withTimeout(adapter.getPhoto(id), 30000, 'Photo download timed out');
        if (remote) { await App.photos.put(id, remote); meta.photosPushed[id] = 1; pulled++; }
      }
    }
    if (pulled && App.render) App.render();
  }

  // ---------- run a sync round ----------
  function waitFirst() {
    if (firstDone) return Promise.resolve();
    return withTimeout(firstP, 25000, 'Could not reach the sync server');
  }
  async function run() {
    if (!adapter || !user) return;
    if (running) { queued = true; return; }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) { setStatus('offline'); return; }
    running = true; setStatus('syncing');
    try {
      await waitFirst();
      scan();
      await push();
      await syncPhotos();
      meta.lastSync = new Date().toISOString();
      setStatus('idle');
    } catch (e) {
      setStatus((typeof navigator !== 'undefined' && navigator.onLine === false) ? 'offline' : 'error', friendly(e));
    } finally {
      running = false; saveMeta();
      if (queued) { queued = false; setTimeout(run, 300); }
    }
  }
  function touch() { clearTimeout(timer); timer = setTimeout(run, 1500); }

  function start() {
    if (started || !adapter || !user) return;
    started = true; firstDone = false;
    firstP = new Promise(function (res) { firstResolve = res; });
    try {
      unsub = adapter.subscribe(onDocs, function (err) { setStatus('error', friendly(err)); });
    } catch (e) { setStatus('error', friendly(e)); return; }
    run();
  }
  function stop() {
    started = false; firstDone = false;
    if (unsub) { try { unsub(); } catch (e) { /* ignore */ } unsub = null; }
  }

  var MSG = {
    'auth/invalid-email': 'That email address does not look right.',
    'auth/missing-password': 'Enter your password.',
    'auth/weak-password': 'Choose a password with at least 6 characters.',
    'auth/email-already-in-use': 'That email already has an account. Try Sign in instead.',
    'auth/invalid-credential': 'Wrong email or password.',
    'auth/wrong-password': 'Wrong email or password.',
    'auth/user-not-found': 'No account with that email. Try Create account.',
    'auth/too-many-requests': 'Too many tries. Wait a few minutes and try again.',
    'auth/network-request-failed': 'No internet connection.',
    'auth/operation-not-allowed': 'Email sign-in is not switched on in your Firebase project (see the setup guide).',
    'permission-denied': 'The cloud database refused access. Check the security rules in the setup guide.',
    'unavailable': 'Cannot reach the sync server right now.'
  };
  function friendly(e) {
    if (!e) return 'Something went wrong';
    var code = e.code ? String(e.code).replace('firestore/', '') : '';
    return MSG[code] || e.message || 'Something went wrong';
  }

  // ---------- public API ----------
  var S = App.sync = {
    configured: function () { return !!(window.BL_FIREBASE && window.BLFirebase); },
    isOn: function () { return !!user; },
    state: function () { return { on: !!user, email: user ? user.email : '', status: st.status, error: st.error, lastSync: meta.lastSync, pending: pendingCount() }; },
    summary: function () { return user ? 'Signed in as ' + user.email : 'Use BlueLedger on phone and web together'; },
    run: run,
    touch: function () { if (user) touch(); },
    init: function () {
      if (inited) return; inited = true;
      if (!S.configured()) return;
      try { adapter = window.BLFirebase.create(window.BL_FIREBASE); } catch (e) { setStatus('error', friendly(e)); return; }
      adapter.onAuth(function (u) {
        if (u) {
          if (meta.uid !== u.uid) { meta = freshMeta(); meta.uid = u.uid; }
          meta.email = u.email || ''; user = u; saveMeta();
          setStatus('syncing'); start();
        } else { stop(); user = null; setStatus('off'); }
      });
      window.addEventListener('online', function () { if (user) touch(); });
      document.addEventListener('visibilitychange', function () { if (!document.hidden && user) touch(); });
      setInterval(function () { if (user && !running) run(); }, 90000);
    },
    signIn: async function (email, pw) { if (!adapter) throw new Error('Sync is not set up'); await adapter.signIn(email, pw); },
    signUp: async function (email, pw) { if (!adapter) throw new Error('Sync is not set up'); await adapter.signUp(email, pw); },
    resetPassword: async function (email) { if (!adapter) throw new Error('Sync is not set up'); await adapter.resetPassword(email); },
    friendly: friendly,
    // wait until the first download after signing in has been merged
    whenReady: async function () {
      var t0 = Date.now();
      while (Date.now() - t0 < 25000) {
        if (user && firstDone) return true;
        await new Promise(function (r) { setTimeout(r, 150); });
      }
      return false;
    },
    // stop syncing on this device without touching the data on it or in the cloud
    disconnect: async function () {
      stop(); user = null; meta = freshMeta(); saveMeta(); setStatus('off');
      if (adapter) { try { await adapter.signOut(); } catch (e) { /* ignore */ } }
    },
    // test hooks
    _meta: function () { return meta; }
  };

  // ---------- sign-in sheet (also used from the setup wizard) ----------
  S.signInSheet = function (onDone) {
    if (!S.configured()) { App.toast('Sync is not set up yet – see FIREBASE-SETUP.md'); return; }
    App.openSheet('<div class="sheet-h"><h3>Sign in to sync</h3><button class="ib" data-act="closeSheet">' + App.icon('close') + '</button></div>' +
      '<p class="muted" style="margin:0 0 4px;font-size:13px">Use the same email and password on every device. New here? Choose Create account.</p>' +
      '<label class="lbl">Email</label><input class="inp" id="sy-email" type="email" autocomplete="email" inputmode="email">' +
      '<label class="lbl">Password</label><input class="inp" id="sy-pass" type="password" autocomplete="current-password" placeholder="At least 6 characters">' +
      '<div id="sy-msg" style="min-height:20px;margin-top:8px;font-size:13px;color:var(--expense)"></div>' +
      '<div class="btn-row" style="margin-top:6px"><button class="btn ghost" id="sy-up">Create account</button><button class="btn primary" id="sy-in">Sign in</button></div>' +
      '<p style="text-align:center;margin:12px 0 0"><button id="sy-reset" style="color:var(--b600);font-weight:700">Forgot password?</button></p>',
      function (el) {
        var msg = function (t, good) { var m = $('#sy-msg', el); m.textContent = t; m.style.color = good ? 'var(--income)' : 'var(--expense)'; };
        var go = async function (kind) {
          var email = $('#sy-email', el).value.trim(), pw = $('#sy-pass', el).value;
          if (!email || !pw) { msg('Enter your email and password.'); return; }
          msg('Signing in…', true);
          try {
            if (kind === 'up') await S.signUp(email, pw); else await S.signIn(email, pw);
            msg('Getting your data…', true);
            await S.whenReady();
            App.closeSheet(); App.render(); notify();
            if (App.sync.state().on) App.toast('Sync is on');
            if (onDone) onDone();
          } catch (e) { msg(friendly(e)); }
        };
        $('#sy-in', el).onclick = function () { go('in'); };
        $('#sy-up', el).onclick = function () { go('up'); };
        $('#sy-reset', el).onclick = async function () {
          var email = $('#sy-email', el).value.trim();
          if (!email) { msg('Type your email above first.'); return; }
          try { await S.resetPassword(email); msg('Password reset email sent. Check your inbox.', true); } catch (e) { msg(friendly(e)); }
        };
      });
  };

  // ---------- Sync page (More > Sync across devices) ----------
  var when = function (iso) { return iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Not yet'; };
  App.pages.sync = function () {
    var body = '';
    if (!S.configured()) {
      body = '<div class="empty"><div class="big">🔄</div><p><b>Sync is not set up yet.</b><br>It lets this app and the web version share the same data. Follow <b>FIREBASE-SETUP.md</b> once (about 10 minutes), rebuild, and this page will turn on.</p></div>';
    } else if (!user) {
      body = '<div class="hero"><small>Sync across devices</small><div class="big" style="font-size:22px">Off</div><small>Sign in to keep your phone and the web app in step.</small></div>' +
        '<button class="btn primary block" data-act="syncSignIn">Sign in / Create account</button>' +
        '<p class="muted" style="font-size:13px;line-height:1.5;margin-top:14px">Your data is stored in <b>your own</b> Firebase project, not anywhere else. On a new device, sign in <b>before</b> doing the setup questions and your accounts and transactions appear by themselves.</p>';
    } else {
      var s = S.state(), label = { idle: 'Up to date', syncing: 'Syncing…', offline: 'Offline – will sync when connected', error: 'Problem', off: 'Off' }[s.status];
      body = '<div class="hero"><small>Signed in as ' + esc(s.email) + '</small><div class="big" style="font-size:22px">' + label + '</div><div class="hero-grid" style="grid-template-columns:1fr 1fr"><div>Last synced<b>' + when(s.lastSync) + '</b></div><div>Waiting to send<b>' + s.pending + '</b></div></div></div>' +
        (s.error ? '<div class="card" style="color:var(--expense)"><b>' + esc(s.error) + '</b></div>' : '') +
        '<button class="btn primary block" data-act="syncNow">Sync now</button>' +
        '<button class="btn ghost block" data-act="syncOut">Sign out on this device</button>' +
        '<p class="muted" style="font-size:13px;line-height:1.5;margin-top:14px">Changes are sent automatically a moment after you make them, and new changes from your other devices appear on their own. If two devices edit the same entry, the newest edit wins. Signing out keeps all your data on this device.</p>';
    }
    return { title: 'Sync across devices', body: body };
  };
  App.actions.syncSignIn = function () { S.signInSheet(); };
  App.actions.syncNow = function () { S.run(); };
  App.actions.syncOut = function () {
    App.confirmSheet('Sign out of sync?', 'Your data stays on this device. It just stops syncing until you sign in again.', 'Sign out', function () { S.disconnect().then(function () { App.render(); }); });
  };
})(window.App);
