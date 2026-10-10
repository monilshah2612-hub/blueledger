'use strict';
window.App = window.App || {};
(function (App) {
  var KEY = 'blueledger.v1';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var ymd = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var parse = function (s) { var p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2] || 1); };
  var today = function () { return ymd(new Date()); };
  var r2 = function (n) { return Math.round((Number(n) + Number.EPSILON) * 100) / 100; };
  var uid = function () { return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var nf = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var fmt = function (n) { return nf.format(r2(n)); };
  var money = function (n) {
    n = r2(n);
    return (n < 0 ? '-' : '') + App.db.settings.currency + nf.format(Math.abs(n));
  };
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var monthLabel = function (mk) { var p = mk.split('-'); return MONTHS[+p[1] - 1] + ' ' + p[0]; };
  var shiftMonth = function (mk, n) {
    var p = mk.split('-').map(Number);
    var d = new Date(p[0], p[1] - 1 + n, 1);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1);
  };
  var dateLabel = function (s) {
    var d = parse(s);
    return DAYS[d.getDay()] + ', ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  };
  var shortDate = function (s) { var d = parse(s); return d.getDate() + ' ' + MONTHS[d.getMonth()]; };
  Object.assign(App, { $: $, $$: $$, pad: pad, ymd: ymd, parse: parse, today: today, r2: r2, uid: uid, esc: esc,
    fmt: fmt, money: money, MONTHS: MONTHS, DAYS: DAYS, monthLabel: monthLabel, shiftMonth: shiftMonth,
    dateLabel: dateLabel, shortDate: shortDate });

  // ---------- constants ----------
  App.COLORS = ['#1e63e9', '#2f80ed', '#0ea5e9', '#06b6d4', '#3b5bdb', '#4f46e5', '#14b8a6', '#22c55e', '#f59e0b', '#f97316', '#ef4444', '#ec4899', '#8b5cf6', '#64748b'];
  App.EMOJIS = ['🍔', '🛒', '🚌', '⛽', '🏠', '💡', '📱', '🛍️', '💊', '🎬', '✈️', '🎓', '🔁', '💈', '🎁', '📈', '🏦', '🏷️', '💼', '💻', '🏪', '💰', '↩️', '☕', '🍕', '🚕', '🚗', '🏋️', '🐶', '👶', '🎮', '📚', '🧾', '🔧', '🎉', '🌴', '💳', '🪙', '🧴', '🍺'];
  App.SUG_EXP = [['Food & Dining', '🍔'], ['Groceries', '🛒'], ['Transport', '🚌'], ['Fuel', '⛽'], ['Rent', '🏠'], ['Bills & Utilities', '💡'], ['Mobile & Internet', '📱'], ['Shopping', '🛍️'], ['Health', '💊'], ['Entertainment', '🎬'], ['Travel', '✈️'], ['Education', '🎓'], ['Subscriptions', '🔁'], ['Personal Care', '💈'], ['Gifts & Donations', '🎁'], ['Investments', '📈'], ['EMI / Loans', '🏦'], ['Others', '🏷️']];
  App.SUG_INC = [['Salary', '💼'], ['Freelance', '💻'], ['Business', '🏪'], ['Interest', '🏦'], ['Rental Income', '🏠'], ['Gifts', '🎁'], ['Refunds', '↩️'], ['Others', '💰']];
  App.ACC_TYPES = [['cash', 'Cash', '💵'], ['bank', 'Bank account', '🏦'], ['card', 'Credit card', '💳'], ['wallet', 'UPI / Wallet', '👛'], ['savings', 'Savings', '🐖'], ['invest', 'Investment', '📈'], ['other', 'Other', '💼']];
  App.accIcon = function (type) {
    var t = App.ACC_TYPES.filter(function (x) { return x[0] === type; })[0];
    return t ? t[2] : '💼';
  };

  var ICONS = {
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    envelope: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    wallet: '<path d="M3 7a2 2 0 0 1 2-2h13v4"/><path d="M3 7v11a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H5a2 2 0 0 1-2-2z"/><circle cx="16.5" cy="14.5" r="1"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    more: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    back: '<path d="m15 18-6-6 6-6"/>',
    fwd: '<path d="m9 18 6-6-6-6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
    check: '<path d="m5 12 5 5L20 7"/>'
  };
  App.icon = function (n) {
    return '<svg class="svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[n] || '') + '</svg>';
  };

  // ---------- state ----------
  function blank() {
    return {
      v: 1,
      settings: { name: '', currency: '₹', onboarded: false, autoBackup: true, backupEveryDays: 7, lastBackup: null, lastAutoBackup: null, lastShared: null, remindBackup: true, reminders: true, pin: null, notifAsked: false, lastAcc: null },
      accounts: [], categories: [], transactions: [], envelopes: [], bills: [], goals: [], loans: []
    };
  }
  App.blank = blank;
  function normalize(d) {
    var b = blank();
    var out = Object.assign(b, d || {});
    out.settings = Object.assign(blank().settings, (d && d.settings) || {});
    ['accounts', 'categories', 'transactions', 'envelopes', 'bills', 'goals', 'loans'].forEach(function (k) {
      if (!Array.isArray(out[k])) out[k] = [];
    });
    return out;
  }
  App.normalize = normalize;
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) return normalize(JSON.parse(raw));
    } catch (e) { /* fall through */ }
    return blank();
  }
  App.db = load();
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(App.db)); }
    catch (e) {
      if (!App._storeWarned) { App._storeWarned = true; App.toast('This view cannot store data – changes are kept only until you close it'); }
    }
  }
  App.persist = persist;
  var saveT;
  App.save = function () {
    persist();
    clearTimeout(saveT);
    saveT = setTimeout(function () {
      if (App.maybeAutoBackup) App.maybeAutoBackup();
      if (App.scheduleReminders) App.scheduleReminders();
    }, 3000);
  };
  App.resetAll = function () { App.db = blank(); persist(); };

  App.ui = { tab: 'home', sub: 'daily', month: today().slice(0, 7), acc: 'all', sel: today(), search: '', searchOpen: false, repType: 'expense', page: null, loanDir: 'lent', catType: 'expense' };

  // ---------- lookups & maths ----------
  App.acc = function (id) { return App.db.accounts.filter(function (a) { return a.id === id; })[0]; };
  App.cat = function (id) { return App.db.categories.filter(function (c) { return c.id === id; })[0]; };
  App.accBalance = function (a) {
    var b = a.opening || 0;
    App.db.transactions.forEach(function (t) {
      if (t.type === 'income' && t.accountId === a.id) b += t.amount;
      else if (t.type === 'expense' && t.accountId === a.id) b -= t.amount;
      else if (t.type === 'transfer') {
        if (t.accountId === a.id) b -= t.amount;
        if (t.toAccountId === a.id) b += t.amount;
      }
    });
    return r2(b);
  };
  var sortTx = function (a, b) { return b.date.localeCompare(a.date) || (b.ts || 0) - (a.ts || 0); };
  App.sortTx = sortTx;
  App.txIn = function (mk, accId) {
    return App.db.transactions.filter(function (t) {
      if (mk && t.date.indexOf(mk) !== 0) return false;
      if (accId && accId !== 'all' && t.accountId !== accId && t.toAccountId !== accId) return false;
      return true;
    }).sort(sortTx);
  };
  App.totals = function (mk, accId) {
    var inc = 0, exp = 0;
    App.txIn(mk, accId).forEach(function (t) {
      if (accId && accId !== 'all' && t.accountId !== accId) return;
      if (t.type === 'income') inc += t.amount;
      else if (t.type === 'expense') exp += t.amount;
    });
    return { income: r2(inc), expense: r2(exp), balance: r2(inc - exp) };
  };
  App.catUsage = function (id) {
    return App.db.transactions.filter(function (t) { return t.categoryId === id; }).length;
  };
  App.envSpent = function (env, mk) {
    return r2(App.db.transactions.filter(function (t) {
      return t.type === 'expense' && t.date.indexOf(mk) === 0 && env.categoryIds.indexOf(t.categoryId) >= 0;
    }).reduce(function (s, t) { return s + t.amount; }, 0));
  };
  App.addTx = function (o) {
    var t = Object.assign({ id: uid(), ts: Date.now(), note: '' }, o, { amount: r2(o.amount) });
    App.db.transactions.push(t);
    return t;
  };
  App.evalAmount = function (str) {
    var s = String(str || '').replace(/,/g, '').replace(/×/g, '*').replace(/÷/g, '/').trim();
    if (!s) return NaN;
    if (/^[\d.+\-*/() ]+$/.test(s)) {
      try {
        var v = Function('"use strict";return (' + s + ')')();
        return isFinite(v) ? r2(v) : NaN;
      } catch (e) { return NaN; }
    }
    return NaN;
  };

  // ---------- recurring bills ----------
  App.nextDate = function (dateStr, freq, day) {
    var d = parse(dateStr);
    if (freq === 'weekly') { d.setDate(d.getDate() + 7); return ymd(d); }
    var y = d.getFullYear() + (freq === 'yearly' ? 1 : 0);
    var m = d.getMonth() + (freq === 'yearly' ? 0 : 1);
    var dim = new Date(y, m + 1, 0).getDate();
    return ymd(new Date(y, m, Math.min(day || d.getDate(), dim)));
  };
  App.processBills = function () {
    var added = 0, t = today();
    App.db.bills.forEach(function (b) {
      if (!b.auto) return;
      var guard = 0;
      while (b.nextDue <= t && guard++ < 60) {
        App.addTx({ type: b.type, amount: b.amount, date: b.nextDue, accountId: b.accountId, categoryId: b.categoryId || '', note: b.title, billId: b.id });
        b.nextDue = App.nextDate(b.nextDue, b.freq, b.day);
        added++;
      }
    });
    if (added) { App.save(); }
    return added;
  };
  App.payBill = function (id) {
    var b = App.db.bills.filter(function (x) { return x.id === id; })[0];
    if (!b) return;
    App.addTx({ type: b.type, amount: b.amount, date: today(), accountId: b.accountId, categoryId: b.categoryId || '', note: b.title, billId: b.id });
    b.nextDue = App.nextDate(b.nextDue, b.freq, b.day);
    App.save();
  };

  // ---------- native bridge ----------
  App.cap = function (name) {
    try {
      var C = window.Capacitor;
      if (C && C.isNativePlatform && C.isNativePlatform() && C.Plugins && C.Plugins[name]) return C.Plugins[name];
    } catch (e) { /* not native */ }
    return null;
  };

  // ---------- backup / restore / export ----------
  var stamp = function () { var d = new Date(); return ymd(d) + '_' + pad(d.getHours()) + pad(d.getMinutes()); };
  function payload() {
    return JSON.stringify({ app: 'BlueLedger', version: 1, exportedAt: new Date().toISOString(), data: App.db });
  }
  function download(name, text, mime) {
    var b = new Blob([text], { type: mime || 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  async function prune(FS, dir, folder) {
    try {
      var r = await FS.readdir({ path: folder, directory: dir });
      var files = r.files.map(function (f) { return f.name || f; }).filter(function (n) { return /-auto\.json$/.test(n); }).sort();
      while (files.length > 10) await FS.deleteFile({ path: folder + files.shift(), directory: dir });
    } catch (e) { /* best effort */ }
  }
  App.backupNow = async function (auto) {
    var name = 'BlueLedger-' + stamp() + (auto ? '-auto' : '') + '.json';
    var text = payload();
    var FS = App.cap('Filesystem');
    var where = 'Downloads';
    if (FS) {
      var ok = false;
      var tries = [['DOCUMENTS', 'BlueLedger/', 'Documents/BlueLedger'], ['EXTERNAL', 'BlueLedger/', 'app folder'], ['DATA', 'backups/', 'app storage']];
      for (var i = 0; i < tries.length && !ok; i++) {
        try {
          await FS.writeFile({ path: tries[i][1] + name, data: text, directory: tries[i][0], encoding: 'utf8', recursive: true });
          where = tries[i][2]; ok = true;
          if (auto) prune(FS, tries[i][0], tries[i][1]);
        } catch (e) { /* try next location */ }
      }
      if (!ok) throw new Error('Could not write the backup file');
    } else {
      download(name, text);
    }
    App.db.settings.lastBackup = new Date().toISOString();
    if (auto) App.db.settings.lastAutoBackup = App.db.settings.lastBackup;
    persist();
    return { name: name, where: where };
  };
  App.shareBackup = async function () {
    var name = 'BlueLedger-' + stamp() + '.json';
    var text = payload();
    var FS = App.cap('Filesystem'), SH = App.cap('Share');
    if (FS && SH) {
      var r = await FS.writeFile({ path: name, data: text, directory: 'CACHE', encoding: 'utf8' });
      await SH.share({ title: 'BlueLedger backup', text: 'BlueLedger backup', url: r.uri, dialogTitle: 'Save backup to…' });
    } else {
      download(name, text);
    }
    App.db.settings.lastShared = new Date().toISOString();
    persist();
  };
  App.maybeAutoBackup = async function () {
    var s = App.db.settings;
    if (!s.autoBackup || !s.onboarded || !App.db.accounts.length) return;
    if (!App.cap('Filesystem')) return;
    var last = s.lastAutoBackup ? new Date(s.lastAutoBackup).getTime() : 0;
    if ((Date.now() - last) / 864e5 < s.backupEveryDays) return;
    try { await App.backupNow(true); } catch (e) { /* ignore */ }
  };
  App.restoreFromText = function (text) {
    var o;
    try { o = JSON.parse(text); } catch (e) { throw new Error('That file is not a valid backup'); }
    var d = o && o.data ? o.data : o;
    if (!d || !Array.isArray(d.accounts) || !Array.isArray(d.transactions)) throw new Error('That file is not a BlueLedger backup');
    App.db = normalize(d);
    persist();
  };
  App.exportCSV = async function () {
    var q = function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; };
    var rows = [['Date', 'Type', 'Account', 'To account', 'Category', 'Amount', 'Note'].map(q).join(',')];
    App.db.transactions.slice().sort(sortTx).forEach(function (t) {
      var a = App.acc(t.accountId), to = App.acc(t.toAccountId), c = App.cat(t.categoryId);
      rows.push([t.date, t.type, a ? a.name : '', to ? to.name : '', c ? c.name : '', t.amount, t.note].map(q).join(','));
    });
    var name = 'BlueLedger-transactions-' + stamp() + '.csv';
    var text = rows.join('\n');
    var FS = App.cap('Filesystem'), SH = App.cap('Share');
    if (FS && SH) {
      var r = await FS.writeFile({ path: name, data: text, directory: 'CACHE', encoding: 'utf8' });
      await SH.share({ title: 'Transactions CSV', url: r.uri, dialogTitle: 'Export transactions' });
    } else {
      download(name, text, 'text/csv');
    }
  };

  // ---------- reminders (local notifications) ----------
  App.scheduleReminders = async function () {
    var LN = App.cap('LocalNotifications');
    if (!LN) return;
    var s = App.db.settings;
    try {
      var pend = await LN.getPending();
      if (pend.notifications && pend.notifications.length) await LN.cancel({ notifications: pend.notifications });
      if (!s.onboarded || (!s.reminders && !s.remindBackup)) return;
      var perm = await LN.checkPermissions();
      if (perm.display !== 'granted') {
        if (s.notifAsked) return;
        s.notifAsked = true; persist();
        var r = await LN.requestPermissions();
        if (r.display !== 'granted') return;
      }
      var list = [], n = 100;
      if (s.reminders) {
        App.db.bills.forEach(function (b) {
          if (b.remind == null || b.remind < 0) return;
          var d = parse(b.nextDue);
          d.setDate(d.getDate() - b.remind);
          d.setHours(9, 0, 0, 0);
          if (d.getTime() > Date.now()) {
            list.push({ id: n++, title: 'Due: ' + b.title, body: (b.remind ? 'Due in ' + b.remind + ' day(s) · ' : 'Due today · ') + money(b.amount), schedule: { at: d, allowWhileIdle: true } });
          }
        });
      }
      if (s.remindBackup) {
        var every = s.backupEveryDays >= 30 ? { day: 1, hour: 10, minute: 0 } : (s.backupEveryDays <= 1 ? { hour: 10, minute: 0 } : { weekday: 1, hour: 10, minute: 0 });
        list.push({ id: 1, title: 'Back up your BlueLedger data', body: 'More → Backup → Share backup to save it to Google Drive.', schedule: { on: every, allowWhileIdle: true } });
      }
      if (list.length) await LN.schedule({ notifications: list });
    } catch (e) { /* notifications are best effort */ }
  };

  // ---------- sheets, toast, actions ----------
  App.actions = {}; App.changes = {}; App.inputs = {};
  App.openSheet = function (html, mount) {
    var root = $('#sheetRoot');
    root.innerHTML = '<div class="scrim" data-act="closeSheet"></div><div class="sheet" role="dialog"><div class="grab"></div>' + html + '</div>';
    root.classList.add('open');
    document.body.classList.add('noscroll');
    App._sheetOpen = true;
    if (mount) mount($('.sheet', root));
  };
  App.closeSheet = function () {
    var root = $('#sheetRoot');
    root.classList.remove('open');
    root.innerHTML = '';
    document.body.classList.remove('noscroll');
    App._sheetOpen = false;
  };
  App.actions.closeSheet = function () { App.closeSheet(); };
  App.toast = function (msg, undo) {
    var t = $('#toast');
    t.innerHTML = esc(msg) + (undo ? ' <button id="undoBtn">Undo</button>' : '');
    t.className = 'show';
    clearTimeout(App._tt);
    if (undo) $('#undoBtn').onclick = function () { undo(); t.className = ''; };
    App._tt = setTimeout(function () { t.className = ''; }, undo ? 5000 : 2400);
  };
  App.confirmSheet = function (title, text, okLabel, onOk) {
    App.openSheet('<div class="sheet-h"><h3>' + esc(title) + '</h3></div><p class="muted">' + esc(text) + '</p><div class="btn-row"><button class="btn ghost" data-act="closeSheet">Cancel</button><button class="btn danger" id="confirmOk">' + esc(okLabel) + '</button></div>',
      function (el) { $('#confirmOk', el).onclick = function () { App.closeSheet(); onOk(); }; });
  };

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el) return;
    var fn = App.actions[el.dataset.act];
    if (fn) fn(el, e);
  });
  document.addEventListener('change', function (e) {
    var el = e.target.closest('[data-change]');
    if (el && App.changes[el.dataset.change]) App.changes[el.dataset.change](el, e);
  });
  document.addEventListener('input', function (e) {
    var el = e.target.closest('[data-input]');
    if (el && App.inputs[el.dataset.input]) App.inputs[el.dataset.input](el, e);
  });
})(window.App);
