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
  // 20 preset colours (blues first), used for accounts and categories
  App.COLORS = ['#1e63e9', '#2f80ed', '#0ea5e9', '#06b6d4', '#3b5bdb', '#4f46e5', '#0f3a8f', '#5aa0ff', '#14b8a6', '#22c55e', '#84cc16', '#eab308', '#f59e0b', '#f97316', '#ef4444', '#ec4899', '#d946ef', '#8b5cf6', '#64748b', '#78716c'];
  // Need / Want / Savings classification (no targets – just tracking)
  App.CLASSES = [['need', 'Need', '#1e63e9'], ['want', 'Want', '#f59e0b'], ['saving', 'Savings', '#14b8a6']];
  App.clsInfo = function (k) { return App.CLASSES.filter(function (c) { return c[0] === k; })[0]; };
  // class of a transaction: its own choice, else its category's, else ''
  App.txClass = function (t) {
    if (t.cls) return t.cls;
    var c = App.cat(t.categoryId);
    return (c && c.cls) || '';
  };
  App.ACC_EMOJIS = ['💵', '🏦', '💳', '👛', '🐖', '📈', '💼', '🏠', '🚗', '🎓', '🛍️', '✈️', '💰', '🪙', '💎', '🏧', '📱', '🧾', '🏪', '🌐', '🔒', '🎁', '⭐', '🏢'];
  App.EMOJIS = ['🍔', '🛒', '🚌', '⛽', '🏠', '💡', '📱', '🛍️', '💊', '🎬', '✈️', '🎓', '🔁', '💈', '🎁', '📈', '🏦', '🏷️', '💼', '💻', '🏪', '💰', '↩️', '☕', '🍕', '🚕', '🚗', '🏋️', '🐶', '👶', '🎮', '📚', '🧾', '🔧', '🎉', '🌴', '💳', '🪙', '🧴', '🍺'];
  App.SUG_EXP = [['Food & Dining', '🍔'], ['Groceries', '🛒'], ['Transport', '🚌'], ['Fuel', '⛽'], ['Rent', '🏠'], ['Bills & Utilities', '💡'], ['Mobile & Internet', '📱'], ['Shopping', '🛍️'], ['Health', '💊'], ['Entertainment', '🎬'], ['Travel', '✈️'], ['Education', '🎓'], ['Subscriptions', '🔁'], ['Personal Care', '💈'], ['Gifts & Donations', '🎁'], ['Investments', '📈'], ['EMI / Loans', '🏦'], ['Others', '🏷️']];
  App.SUG_INC = [['Salary', '💼'], ['Freelance', '💻'], ['Business', '🏪'], ['Interest', '🏦'], ['Rental Income', '🏠'], ['Gifts', '🎁'], ['Refunds', '↩️'], ['Others', '💰']];
  App.ACC_TYPES = [['cash', 'Cash', '💵'], ['bank', 'Bank account', '🏦'], ['card', 'Credit card', '💳'], ['wallet', 'UPI / Wallet', '👛'], ['savings', 'Savings', '🐖'], ['invest', 'Investment', '📈'], ['other', 'Other', '💼']];
  // accepts an account (uses its own icon if set) or just a type string
  App.accIcon = function (x) {
    if (x && typeof x === 'object' && x.icon) return x.icon;
    var type = x && typeof x === 'object' ? x.type : x;
    var t = App.ACC_TYPES.filter(function (y) { return y[0] === type; })[0];
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
    check: '<path d="m5 12 5 5L20 7"/>',
    camera: '<path d="M4 8h3l2-2.5h6L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><path d="M16 5.2a3 3 0 0 1 0 5.6M18 14.8c1.8.7 3 2.4 3 5.2"/>'
  };
  App.icon = function (n) {
    return '<svg class="svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[n] || '') + '</svg>';
  };

  // ---------- state ----------
  function blank() {
    return {
      v: 1,
      settings: { name: '', currency: '₹', onboarded: false, autoBackup: true, backupEveryDays: 7, lastBackup: null, lastAutoBackup: null, lastShared: null, remindBackup: true, reminders: true, pin: null, notifAsked: false, lastAcc: null, backupPhotos: true },
      accounts: [], categories: [], transactions: [], envelopes: [], bills: [], goals: [], loans: [],
      friends: [], splits: [], settlements: []
    };
  }
  App.blank = blank;
  function normalize(d) {
    var b = blank();
    var out = Object.assign(b, d || {});
    out.settings = Object.assign(blank().settings, (d && d.settings) || {});
    ['accounts', 'categories', 'transactions', 'envelopes', 'bills', 'goals', 'loans', 'friends', 'splits', 'settlements'].forEach(function (k) {
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
  // balance of one account; with `before` (YYYY-MM-DD) only transactions dated earlier count
  App.accBalance = function (a, before) {
    var b = a.opening || 0;
    App.db.transactions.forEach(function (t) {
      if (t.noBalance) return;
      if (before && t.date >= before) return;
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
  // transactions that count as real income/expense (loan/split money movements are balance-only)
  App.isRep = function (t) { return !t.noReport; };
  // money brought forward into month mk (YYYY-MM): balance of the account(s) at the start of that month
  App.broughtForward = function (mk, accId) {
    var start = mk + '-01', sum = 0;
    App.db.accounts.forEach(function (a) {
      if (accId && accId !== 'all' && a.id !== accId) return;
      sum += App.accBalance(a, start);
    });
    return r2(sum);
  };
  App.totals = function (mk, accId) {
    var inc = 0, exp = 0;
    App.txIn(mk, accId).forEach(function (t) {
      if (t.noReport) return;
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
      return t.type === 'expense' && !t.noReport && t.date.indexOf(mk) === 0 && env.categoryIds.indexOf(t.categoryId) >= 0;
    }).reduce(function (s, t) { return s + t.amount; }, 0));
  };
  // unused money carried into month mk (only for envelopes with carry on); starts counting from env.since
  App.envCarryIn = function (env, mk) {
    if (!env.carry) return 0;
    var since = env.since || mk, m = since, carry = 0, guard = 0;
    while (m < mk && guard++ < 240) {
      carry = Math.max(0, r2(env.limit + carry - App.envSpent(env, m)));
      m = App.shiftMonth(m, 1);
    }
    return carry;
  };
  // everything available to spend in an envelope this month = limit + carried in
  App.envAvail = function (env, mk) { return r2(env.limit + App.envCarryIn(env, mk)); };
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

  // ---------- split with friends ----------
  App.friend = function (id) { return App.db.friends.filter(function (f) { return f.id === id; })[0]; };
  // positive = friend owes you, negative = you owe the friend
  App.friendBalance = function (fid) {
    var b = 0;
    App.db.splits.forEach(function (s) {
      if (s.paidBy === 'me') s.shares.forEach(function (x) { if (x.who === fid) b += x.amount; });
      else if (s.paidBy === fid) s.shares.forEach(function (x) { if (x.who === 'me') b -= x.amount; });
    });
    App.db.settlements.forEach(function (st) {
      if (st.friendId === fid) b += (st.dir === 'received' ? -st.amount : st.amount);
    });
    return r2(b);
  };
  // equal shares in whole paise; the leftover paise go to the first person
  App.equalShares = function (total, who) {
    var n = who.length, base = Math.floor(total * 100 / n) / 100, rem = r2(total - base * n);
    return who.map(function (w, i) { return { who: w, amount: r2(base + (i === 0 ? rem : 0)) }; });
  };
  App.addSplit = function (o) {
    var id = uid(), mine = 0;
    o.shares.forEach(function (x) { if (x.who === 'me') mine += x.amount; });
    mine = r2(mine);
    var split = { id: id, title: o.title, total: r2(o.total), date: o.date, paidBy: o.paidBy, accountId: o.accountId || '', categoryId: o.categoryId || '', shares: o.shares.map(function (x) { return { who: x.who, amount: r2(x.amount) }; }), txIds: [] };
    if (o.paidBy === 'me') {
      // my own share is a real expense; the part I paid for friends only moves money
      if (mine > 0) split.txIds.push(App.addTx({ type: 'expense', amount: mine, date: o.date, accountId: o.accountId, categoryId: o.categoryId || '', note: o.title, splitId: id }).id);
      var others = r2(split.total - mine);
      if (others > 0) split.txIds.push(App.addTx({ type: 'expense', amount: others, date: o.date, accountId: o.accountId, categoryId: '', note: 'Paid for friends: ' + o.title, splitId: id, noReport: true }).id);
    } else if (mine > 0) {
      // a friend paid: my share is an expense now, but no money leaves my account until I settle up
      split.txIds.push(App.addTx({ type: 'expense', amount: mine, date: o.date, accountId: '', categoryId: o.categoryId || '', note: o.title + ' (paid by friend)', splitId: id, noBalance: true }).id);
    }
    App.db.splits.push(split);
    return split;
  };
  App.deleteSplit = function (id) {
    App.db.transactions = App.db.transactions.filter(function (t) { return t.splitId !== id; });
    App.db.splits = App.db.splits.filter(function (s) { return s.id !== id; });
  };
  App.addSettlement = function (o) {
    var id = uid(), f = App.friend(o.friendId);
    var st = { id: id, friendId: o.friendId, amount: r2(o.amount), date: o.date, dir: o.dir, accountId: o.accountId || '' };
    if (o.accountId) {
      App.addTx({ type: o.dir === 'received' ? 'income' : 'expense', amount: o.amount, date: o.date, accountId: o.accountId, categoryId: '', note: (o.dir === 'received' ? 'Received from ' : 'Paid to ') + (f ? f.name : 'friend'), settleId: id, noReport: true });
    }
    App.db.settlements.push(st);
    return st;
  };
  App.deleteSettlement = function (id) {
    App.db.transactions = App.db.transactions.filter(function (t) { return t.settleId !== id; });
    App.db.settlements = App.db.settlements.filter(function (s) { return s.id !== id; });
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
  // ---------- receipt photos (IndexedDB, with in-memory fallback) ----------
  App.photos = (function () {
    var mem = {}, dbp = null;
    function open() {
      if (dbp) return dbp;
      dbp = new Promise(function (res, rej) {
        if (!window.indexedDB) { rej(new Error('no indexedDB')); return; }
        var rq = indexedDB.open('blueledger-photos', 1);
        rq.onupgradeneeded = function () { rq.result.createObjectStore('p'); };
        rq.onsuccess = function () { res(rq.result); };
        rq.onerror = function () { rej(rq.error); };
      });
      return dbp;
    }
    function run(mode, fn) {
      return open().then(function (db) {
        return new Promise(function (res, rej) {
          var t = db.transaction('p', mode), r = fn(t.objectStore('p'));
          t.oncomplete = function () { res(r && r.result); };
          t.onerror = function () { rej(t.error); };
        });
      });
    }
    var api = {
      put: function (id, data) { return run('readwrite', function (s) { return s.put(data, id); }).catch(function () { mem[id] = data; }); },
      get: function (id) { return run('readonly', function (s) { return s.get(id); }).then(function (v) { return v || mem[id] || null; }).catch(function () { return mem[id] || null; }); },
      del: function (id) { delete mem[id]; return run('readwrite', function (s) { return s.delete(id); }).catch(function () { }); },
      keys: function () { return run('readonly', function (s) { return s.getAllKeys(); }).then(function (k) { return (k || []).concat(Object.keys(mem)); }).catch(function () { return Object.keys(mem); }); },
      // shrink a photo so thousands of receipts fit comfortably on the phone
      compress: function (file) {
        return new Promise(function (res) {
          var fr = new FileReader();
          fr.onerror = function () { res(null); };
          fr.onload = function () {
            var img = new Image();
            img.onerror = function () { res(fr.result); };
            img.onload = function () {
              try {
                var s = Math.min(1, 1400 / Math.max(img.width, img.height)), c = document.createElement('canvas');
                c.width = Math.max(1, Math.round(img.width * s)); c.height = Math.max(1, Math.round(img.height * s));
                c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
                res(c.toDataURL('image/jpeg', 0.72));
              } catch (e) { res(fr.result); }
            };
            img.src = fr.result;
          };
          fr.readAsDataURL(file);
        });
      },
      // delete stored photos that no transaction refers to any more
      prune: async function () {
        var used = {};
        App.db.transactions.forEach(function (t) { (t.photos || []).forEach(function (id) { used[id] = 1; }); });
        var keys = await api.keys();
        for (var i = 0; i < keys.length; i++) if (!used[keys[i]]) await api.del(keys[i]);
      }
    };
    return api;
  })();

  async function payload(withPhotos) {
    var out = { app: 'BlueLedger', version: 2, exportedAt: new Date().toISOString(), data: App.db };
    if (withPhotos) {
      out.photos = {};
      var ids = {};
      App.db.transactions.forEach(function (t) { (t.photos || []).forEach(function (id) { ids[id] = 1; }); });
      var keys = Object.keys(ids);
      for (var i = 0; i < keys.length; i++) { var d = await App.photos.get(keys[i]); if (d) out.photos[keys[i]] = d; }
    }
    return JSON.stringify(out);
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
    // automatic backups are data-only (small and fast); manual ones can include receipt photos
    var text = await payload(!auto && App.db.settings.backupPhotos !== false);
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
    var text = await payload(App.db.settings.backupPhotos !== false);
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
    var ph = o && o.photos;
    if (ph) Object.keys(ph).forEach(function (id) { App.photos.put(id, ph[id]); });
  };
  var csvQ = function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; };
  async function shareFile(name, text, mime, title) {
    var FS = App.cap('Filesystem'), SH = App.cap('Share');
    if (FS && SH) {
      var r = await FS.writeFile({ path: name, data: text, directory: 'CACHE', encoding: 'utf8' });
      await SH.share({ title: title, url: r.uri, dialogTitle: title });
    } else {
      download(name, text, mime);
    }
  }
  App.exportCSV = async function () {
    var rows = [['Date', 'Type', 'Account', 'To account', 'Category', 'Amount', 'Note'].map(csvQ).join(',')];
    App.db.transactions.slice().sort(sortTx).forEach(function (t) {
      var a = App.acc(t.accountId), to = App.acc(t.toAccountId), c = App.cat(t.categoryId);
      rows.push([t.date, t.type, a ? a.name : '', to ? to.name : '', c ? c.name : '', t.amount, t.note].map(csvQ).join(','));
    });
    await shareFile('BlueLedger-transactions-' + stamp() + '.csv', rows.join('\n'), 'text/csv', 'Export transactions');
  };
  // yearly report as a CSV: month-by-month totals, then category totals
  App.exportYearCSV = async function (year) {
    var rows = [['Yearly report ' + year].map(csvQ).join(','), '', ['Month', 'Income', 'Expenses', 'Balance'].map(csvQ).join(',')];
    var ti = 0, te = 0;
    for (var m = 1; m <= 12; m++) {
      var t = App.totals(year + '-' + pad(m), 'all'); ti += t.income; te += t.expense;
      rows.push([MONTHS[m - 1], t.income, t.expense, t.balance].join(','));
    }
    rows.push(['Total', r2(ti), r2(te), r2(ti - te)].join(','), '', ['Type', 'Category', 'Amount'].map(csvQ).join(','));
    ['expense', 'income'].forEach(function (type) {
      var by = {};
      App.db.transactions.forEach(function (x) {
        if (x.type !== type || x.noReport || x.date.indexOf(year) !== 0) return;
        var c = App.cat(x.categoryId), k = c ? c.name : 'Uncategorised';
        by[k] = (by[k] || 0) + x.amount;
      });
      Object.keys(by).sort(function (a, b) { return by[b] - by[a]; }).forEach(function (k) { rows.push([type, k, r2(by[k])].map(csvQ).join(',')); });
    });
    await shareFile('BlueLedger-report-' + year + '.csv', rows.join('\n'), 'text/csv', 'Yearly report ' + year);
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
