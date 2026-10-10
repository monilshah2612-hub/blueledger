'use strict';
(function (App) {
  var $ = App.$, esc = App.esc, money = App.money, r2 = App.r2, icon = App.icon;

  // ---------- navigation ----------
  App.setTab = function (t) {
    App.ui.tab = t;
    App.ui.searchOpen = false; App.ui.search = '';
    App.render();
    var s = $('#screen'); if (s) s.scrollTop = 0;
  };
  App.actions.tab = function (el) { App.setTab(el.dataset.t); };
  App.actions.prevMonth = function () { App.ui.month = App.shiftMonth(App.ui.month, -1); fixSel(); App.render(); };
  App.actions.nextMonth = function () { App.ui.month = App.shiftMonth(App.ui.month, 1); fixSel(); App.render(); };
  function fixSel() {
    var u = App.ui;
    if (u.sel.indexOf(u.month) !== 0) u.sel = (App.today().indexOf(u.month) === 0) ? App.today() : u.month + '-01';
  }
  App.actions.subTab = function (el) { App.ui.sub = el.dataset.v; App.render(); };
  App.actions.toggleSearch = function () {
    App.ui.searchOpen = !App.ui.searchOpen; if (!App.ui.searchOpen) App.ui.search = '';
    App.render();
    if (App.ui.searchOpen) { var i = $('#searchBox'); if (i) i.focus(); }
  };
  App.inputs.search = function (el) { App.ui.search = el.value; App.renderScreen(); };
  App.changes.accFilter = function (el) { App.ui.acc = el.value; App.render(); };
  App.actions.selDay = function (el) { App.ui.sel = el.dataset.d; App.renderScreen(); };

  App.actions.pickMonth = function () { monthSheet(App.ui.month.slice(0, 4)); };
  function monthSheet(year) {
    var cur = App.ui.month;
    var h = '<div class="sheet-h"><button class="ib" data-act="pmYear" data-d="-1">' + icon('back') + '</button><h3>' + year + '</h3><button class="ib" data-act="pmYear" data-d="1">' + icon('fwd') + '</button></div><div class="chips" style="justify-content:center">';
    App.MONTHS.forEach(function (m, i) {
      var mk = year + '-' + App.pad(i + 1);
      h += '<button class="cchip ' + (mk === cur ? 'sel' : '') + '" style="width:30%;justify-content:center" data-act="pmSet" data-mk="' + mk + '">' + m + '</button>';
    });
    App.openSheet(h + '</div>');
  }
  App.actions.pmYear = function (el) {
    var y = $('.sheet-h h3').textContent;
    monthSheet(String(+y + (+el.dataset.d)));
  };
  App.actions.pmSet = function (el) { App.ui.month = el.dataset.mk; fixSel(); App.closeSheet(); App.render(); };

  // ---------- top bar ----------
  App.renderTop = function () {
    var u = App.ui, el = $('#topbar'), h = '';
    if (u.tab === 'accounts' || u.tab === 'more') {
      h = '<div class="tb-row"><div class="tb-title">' + (u.tab === 'more' ? 'More' : 'Accounts') + '</div>' +
        (u.tab === 'accounts' ? '<div class="tb-right"><button class="ib" data-act="addAccount" aria-label="Add account">' + icon('plus') + '</button></div>' : '') + '</div>';
    } else {
      h = '<div class="tb-row"><button class="ib" data-act="prevMonth" aria-label="Previous month">' + icon('back') + '</button>' +
        '<button class="tb-month" data-act="pickMonth">' + App.monthLabel(u.month) + '</button>' +
        '<button class="ib" data-act="nextMonth" aria-label="Next month">' + icon('fwd') + '</button>' +
        '<div class="tb-right">' + (u.tab === 'home' ? '<button class="ib" data-act="toggleSearch" aria-label="Search">' + icon('search') + '</button>' : '') + '</div></div>';
      if (u.tab === 'home') {
        h += '<div class="seg">' + [['daily', 'Daily'], ['calendar', 'Calendar'], ['monthly', 'Monthly']].map(function (s) {
          return '<button class="' + (u.sub === s[0] ? 'on' : '') + '" data-act="subTab" data-v="' + s[0] + '">' + s[1] + '</button>';
        }).join('') + '</div>';
        if (u.searchOpen) h += '<input id="searchBox" class="searchbox" data-input="search" placeholder="Search notes, categories, amounts…" value="' + esc(u.search) + '">';
        if (App.db.accounts.length > 1) {
          h += '<div class="filters"><select class="pill" data-change="accFilter"><option value="all">All accounts</option>' +
            App.db.accounts.map(function (a) { return '<option value="' + a.id + '"' + (u.acc === a.id ? ' selected' : '') + '>' + esc(a.name) + '</option>'; }).join('') + '</select></div>';
        }
        var t = App.totals(u.month, u.acc);
        h += '<div class="cards"><div class="sumcard"><small>Income</small><b>' + money(t.income) + '</b></div><div class="sumcard"><small>Expenses</small><b>' + money(t.expense) + '</b></div>' + '<div class="sumcard bal"><small>Balance</small><b>' + money(t.balance) + '</b></div></div>';
        if (App.db.accounts.length) {
          h += '<div class="carry"><span>↪ Brought forward <b>' + money(App.broughtForward(u.month, u.acc)) + '</b></span><span>Closing <b>' + money(App.broughtForward(App.shiftMonth(u.month, 1), u.acc)) + '</b></span></div>';
        }
      }
    }
    el.innerHTML = h;
  };

  App.renderNav = function () {
    var items = [['home', 'list', 'Records'], ['budget', 'envelope', 'Budget'], ['accounts', 'wallet', 'Accounts'], ['reports', 'chart', 'Reports'], ['more', 'more', 'More']];
    $('#bottomnav').innerHTML = items.map(function (i) {
      return '<button class="' + (App.ui.tab === i[0] ? 'on' : '') + '" data-act="tab" data-t="' + i[0] + '">' + icon(i[1]) + '<span>' + i[2] + '</span></button>';
    }).join('');
    $('#fab').style.display = (App.ui.tab === 'more') ? 'none' : '';
  };

  App.render = function () {
    App.renderTop(); App.renderScreen(); App.renderNav();
    if (App.renderPage && App.ui.page) App.renderPage();
  };

  App.renderScreen = function () {
    var t = App.ui.tab, fn = { home: renderHome, budget: renderBudget, accounts: renderAccounts, reports: renderReports, more: renderMore }[t];
    $('#screen').innerHTML = fn();
  };

  // ---------- shared row ----------
  App.txRow = function (t, showDate) {
    var isT = t.type === 'transfer';
    var c = App.cat(t.categoryId);
    var isSplit = !!(t.splitId || t.settleId);
    var ico = isT ? '🔁' : (c ? c.icon : (t.loanId ? '🤝' : (isSplit ? '👥' : '🏷️')));
    var color = isT ? '#2f80ed' : (c ? c.color : '#94a3b8');
    var title = isT ? 'Transfer' : (c ? c.name : (t.loanId ? 'Loan' : (isSplit ? 'Split' : 'Uncategorised')));
    var a = App.acc(t.accountId), to = App.acc(t.toAccountId);
    var sub = isT ? (a ? esc(a.name) : '?') + ' → ' + (to ? esc(to.name) : '?') : (a ? esc(a.name) : '');
    if (showDate) sub += ' · ' + App.shortDate(t.date);
    var cls = isT ? 'tr' : (t.type === 'income' ? 'in' : 'ex');
    var sign = t.type === 'income' ? '+' : (t.type === 'expense' ? '-' : '');
    return '<div class="row" data-act="editTx" data-id="' + t.id + '"><div class="ico" style="background:' + color + '22;color:' + color + '">' + ico + '</div>' +
      '<div class="row-main"><div class="row-title">' + esc(title) + (t.note ? '<span class="dot">·</span><span class="row-note">' + esc(t.note) + '</span>' : '') + (t.photos && t.photos.length ? ' <span title="Receipt attached">📎</span>' : '') + '</div><div class="row-sub">' + sub + '</div></div>' +
      '<div class="amt ' + cls + '">' + sign + money(t.amount) + '</div></div>';
  };
  function empty(emoji, text) { return '<div class="empty"><div class="big">' + emoji + '</div><p>' + text + '</p></div>'; }

  // ---------- HOME ----------
  function renderHome() {
    var u = App.ui;
    if (u.search) return searchResults();
    if (u.sub === 'calendar') return renderCalendar();
    if (u.sub === 'monthly') return renderMonthly();
    return renderDaily();
  }
  function searchResults() {
    var q = App.ui.search.trim().toLowerCase();
    var list = App.txIn(null, App.ui.acc).filter(function (t) {
      var c = App.cat(t.categoryId);
      return (t.note || '').toLowerCase().indexOf(q) >= 0 || (c && c.name.toLowerCase().indexOf(q) >= 0) || String(t.amount).indexOf(q) >= 0;
    }).slice(0, 100);
    if (!list.length) return empty('🔍', 'No matching transactions');
    return '<div class="daygroup">' + list.map(function (t) { return App.txRow(t, true); }).join('') + '</div>';
  }
  function dayGroups(list) {
    var g = {}, order = [];
    list.forEach(function (t) { if (!g[t.date]) { g[t.date] = []; order.push(t.date); } g[t.date].push(t); });
    return order.map(function (d) {
      var dt = App.parse(d), inc = 0, exp = 0;
      g[d].forEach(function (t) { if (t.noReport) return; if (t.type === 'income') inc += t.amount; else if (t.type === 'expense') exp += t.amount; });
      return '<section class="daygroup"><div class="dayhead"><div class="dnum">' + dt.getDate() + '</div><div class="dmeta"><span class="chip">' + App.DAYS[dt.getDay()] + '</span>' + App.MONTHS[dt.getMonth()] + ' ' + dt.getFullYear() + '</div>' +
        '<div class="dtot">' + (inc ? '<span class="in">+' + money(inc) + '</span>' : '') + (exp ? '<span class="ex">-' + money(exp) + '</span>' : '') + '</div></div>' +
        g[d].map(function (t) { return App.txRow(t); }).join('') + '</section>';
    }).join('');
  }
  function renderDaily() {
    var list = App.txIn(App.ui.month, App.ui.acc);
    if (!list.length) return empty('🧾', 'No transactions in ' + App.monthLabel(App.ui.month) + '.<br>Tap <b>+</b> to add your first one.');
    return dayGroups(list);
  }
  var cf = function (n) {
    n = Math.abs(n);
    if (n >= 1e7) return (n / 1e7).toFixed(1).replace(/\.0$/, '') + 'Cr';
    if (n >= 1e5) return (n / 1e5).toFixed(1).replace(/\.0$/, '') + 'L';
    if (n >= 1e4) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
    return String(Math.round(n));
  };
  function renderCalendar() {
    var u = App.ui, mk = u.month, p = mk.split('-').map(Number);
    fixSel();
    var list = App.txIn(mk, u.acc), agg = {};
    list.forEach(function (t) {
      if (t.type === 'transfer' || t.noReport) return;
      if (u.acc !== 'all' && t.accountId !== u.acc) return;
      var a = agg[t.date] || (agg[t.date] = { i: 0, e: 0 });
      if (t.type === 'income') a.i += t.amount; else a.e += t.amount;
    });
    var first = new Date(p[0], p[1] - 1, 1), off = (first.getDay() + 6) % 7, days = new Date(p[0], p[1], 0).getDate();
    var total = Math.ceil((off + days) / 7) * 7, today = App.today();
    var h = '<div class="cal"><div class="cal-h">' + ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(function (d) { return '<div>' + d + '</div>'; }).join('') + '</div><div class="cal-g">';
    for (var i = 0; i < total; i++) {
      var dt = new Date(p[0], p[1] - 1, 1 - off + i), key = App.ymd(dt), inMonth = dt.getMonth() === p[1] - 1;
      if (!inMonth) { h += '<div class="cell off"><div class="cn">' + dt.getDate() + '</div></div>'; continue; }
      var a = agg[key], net = a ? a.i - a.e : 0;
      h += '<div class="cell ' + (key === u.sel ? 'sel' : '') + ' ' + (key === today ? 'today' : '') + '" data-act="selDay" data-d="' + key + '"><div class="cn">' + dt.getDate() + '</div>' +
        (a ? (a.i ? '<div class="ci">' + cf(a.i) + '</div>' : '') + (a.e ? '<div class="ce">' + cf(a.e) + '</div>' : '') + '<div class="cb">' + (net < 0 ? '-' : '') + cf(net) + '</div>' : '') + '</div>';
    }
    h += '</div></div>';
    var day = list.filter(function (t) { return t.date === u.sel; });
    h += '<div class="day-panel-h"><b>' + App.dateLabel(u.sel) + '</b><button class="btn primary" style="flex:none;padding:8px 14px" data-act="addTxOn" data-d="' + u.sel + '">+ Add</button></div>';
    h += day.length ? '<div class="daygroup">' + day.map(function (t) { return App.txRow(t); }).join('') + '</div>' : '<div class="empty" style="padding:20px">Nothing recorded on this day</div>';
    return h;
  }
  App.actions.addTxOn = function (el) { App.openTx({ date: el.dataset.d }); };

  function renderMonthly() {
    var y = App.ui.month.slice(0, 4), yi = 0, ye = 0, rows = '';
    for (var m = 1; m <= 12; m++) {
      var mk = y + '-' + App.pad(m), t = App.totals(mk, App.ui.acc);
      yi += t.income; ye += t.expense;
      rows += '<div class="mrow ' + (mk === App.ui.month ? 'cur' : '') + '" data-act="gotoMonth" data-mk="' + mk + '"><span><b>' + App.MONTHS[m - 1] + '</b></span><span class="in">' + (t.income ? money(t.income) : '–') + '</span><span class="ex">' + (t.expense ? money(t.expense) : '–') + '</span><span>' + ((t.income || t.expense) ? money(t.balance) : '–') + '</span></div>';
    }
    return '<div class="hero"><small>' + y + ' summary</small><div class="big">' + money(yi - ye) + '</div><div class="hero-grid"><div>Income<b>' + money(yi) + '</b></div><div>Expenses<b>' + money(ye) + '</b></div><div>Saved<b>' + (yi > 0 ? Math.round((yi - ye) / yi * 100) + '%' : '–') + '</b></div></div></div>' +
      '<div class="card" style="padding:8px 8px"><div class="mrow h"><span>Month</span><span>Income</span><span>Expense</span><span>Balance</span></div>' + rows + '</div>';
  }
  App.actions.gotoMonth = function (el) { App.ui.month = el.dataset.mk; App.ui.sub = 'daily'; fixSel(); App.render(); };

  // ---------- BUDGET (envelopes) ----------
  function renderBudget() {
    var mk = App.ui.month, db = App.db;
    var avail = 0, spent = 0, carried = 0, usedCats = [];
    db.envelopes.forEach(function (e) {
      var ci = App.envCarryIn(e, mk);
      carried += ci; avail += e.limit + ci; spent += App.envSpent(e, mk); usedCats = usedCats.concat(e.categoryIds);
    });
    var unb = db.transactions.filter(function (x) { return x.type === 'expense' && !x.noReport && x.date.indexOf(mk) === 0 && usedCats.indexOf(x.categoryId) < 0; });
    var unbTotal = r2(unb.reduce(function (s, x) { return s + x.amount; }, 0));
    var h = '<div class="hero"><small>Left to spend in envelopes</small><div class="big">' + money(avail - spent) + '</div><div class="hero-grid"><div>Budgeted<b>' + money(avail) + '</b></div><div>Spent<b>' + money(spent) + '</b></div><div>Carried in<b>' + money(carried) + '</b></div></div></div>';
    if (!db.envelopes.length) {
      h += empty('✉️', 'Envelopes cap what you spend in each area every month.<br>Create one to get started.');
    }
    db.envelopes.forEach(function (e) {
      var ci = App.envCarryIn(e, mk), av = r2(e.limit + ci), s = App.envSpent(e, mk);
      var pct = av > 0 ? Math.min(100, s / av * 100) : (s > 0 ? 100 : 0), cls = s > av ? 'over' : (pct >= 80 ? 'warn' : ''), left = r2(av - s);
      h += '<div class="env" data-act="envDetail" data-id="' + e.id + '"><div class="env-top"><div class="ico" style="background:var(--b100)">' + e.icon + '</div><div class="env-name">' + esc(e.name) + (e.carry ? ' <span class="badge">↪ carries over</span>' : '') + '</div><div class="env-left ' + (left < 0 ? 'ex' : '') + '">' + (left < 0 ? 'Over ' + money(-left) : money(left) + ' left') + '</div></div>' +
        '<div class="bar ' + cls + '"><i style="width:' + pct + '%"></i></div><div class="env-meta"><span>' + money(s) + ' spent</span><span>of ' + money(av) + (ci > 0 ? ' (incl. ' + money(ci) + ' carried)' : '') + '</span></div></div>';
    });
    if (unbTotal > 0) {
      h += '<div class="env" data-act="unbudgeted"><div class="env-top"><div class="ico" style="background:var(--b100)">📦</div><div class="env-name">Not in any envelope</div><div class="env-left">' + money(unbTotal) + '</div></div></div>';
    }
    h += '<button class="btn primary block" data-act="addEnvelope">+ New envelope</button><p class="muted" style="text-align:center;font-size:12px;margin-top:14px">Each envelope resets on the 1st of every month. Turn on "carry over" in an envelope to keep what you did not spend.</p>';
    return h;
  }

  // ---------- ACCOUNTS ----------
  function renderAccounts() {
    var db = App.db;
    if (!db.accounts.length) return empty('🏦', 'No accounts yet. Tap + to add one.');
    var assets = 0, debts = 0;
    db.accounts.forEach(function (a) { var b = App.accBalance(a); if (b >= 0) assets += b; else debts += b; });
    var h = '<div class="hero"><small>Net worth</small><div class="big">' + money(assets + debts) + '</div><div class="hero-grid"><div>Assets<b>' + money(assets) + '</b></div><div>Owed<b>' + money(-debts) + '</b></div><div>Accounts<b>' + db.accounts.length + '</b></div></div></div>';
    if (db.accounts.length > 1) h += '<button class="btn ghost block" style="margin:0 0 12px" data-act="newTransfer">🔁 Transfer between accounts</button>';
    h += '<div class="daygroup">' + db.accounts.map(function (a) {
      var b = App.accBalance(a);
      return '<div class="row" data-act="accDetail" data-id="' + a.id + '"><div class="ico" style="background:' + a.color + '22;color:' + a.color + '">' + App.accIcon(a) + '</div><div class="row-main"><div class="row-title">' + esc(a.name) + '</div><div class="row-sub">' + (App.ACC_TYPES.filter(function (x) { return x[0] === a.type; })[0] || ['', 'Account'])[1] + '</div></div><div class="amt ' + (b < 0 ? 'ex' : '') + '">' + money(b) + '</div></div>';
    }).join('') + '</div>';
    return h;
  }
  App.actions.newTransfer = function () { App.openTx({ type: 'transfer' }); };

  // ---------- REPORTS ----------
  function barChart(months) {
    var data = months.map(function (m) { return App.totals(m, 'all'); });
    var max = Math.max.apply(null, data.map(function (d) { return Math.max(d.income, d.expense); }).concat([1]));
    var n = months.length, slot = 304 / n, bw = Math.min(18, slot / 2 - 1.5);
    var bars = data.map(function (d, i) {
      var x = 8 + i * slot + (slot - 2 * bw - 3) / 2, hi = d.income / max * 110, he = d.expense / max * 110;
      return '<rect x="' + x + '" y="' + (130 - hi) + '" width="' + bw + '" height="' + hi + '" rx="3" fill="var(--income)"/><rect x="' + (x + bw + 3) + '" y="' + (130 - he) + '" width="' + bw + '" height="' + he + '" rx="3" fill="var(--b500)"/><text x="' + (x + bw + 1.5) + '" y="146">' + App.MONTHS[+months[i].slice(5) - 1] + '</text>';
    }).join('');
    return { data: data, html: '<svg class="bars" viewBox="0 0 320 154" width="100%">' + bars + '</svg><div class="leg" style="justify-content:center;gap:18px"><span style="flex:none"><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:var(--income);margin-right:6px"></i>Income</span><span style="flex:none"><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:var(--b500);margin-right:6px"></i>Expenses</span></div>' };
  }
  function renderReports() {
    var u = App.ui, mk = u.month, year = mk.slice(0, 4), isYear = u.repRange === 'year', prefix = isYear ? year : mk, type = u.repType, db = App.db;
    var list = db.transactions.filter(function (t) { return t.type === type && !t.noReport && t.date.indexOf(prefix) === 0; });
    var byCat = {}, total = 0;
    list.forEach(function (t) { var k = t.categoryId || '_none'; byCat[k] = (byCat[k] || 0) + t.amount; total += t.amount; });
    var items = Object.keys(byCat).map(function (k) {
      var c = App.cat(k);
      return { name: c ? c.name : 'Uncategorised', icon: c ? c.icon : '🏷️', color: c ? c.color : '#94a3b8', v: r2(byCat[k]) };
    }).sort(function (a, b) { return b.v - a.v; });
    // totals for the period
    var months = [], i;
    if (isYear) for (i = 1; i <= 12; i++) months.push(year + '-' + App.pad(i));
    else months.push(mk);
    var inc = 0, exp = 0;
    months.forEach(function (m) { var tt = App.totals(m, 'all'); inc += tt.income; exp += tt.expense; });
    var days = isYear ? (year === App.today().slice(0, 4) ? Math.max(1, Math.round((App.parse(App.today()) - new Date(+year, 0, 1)) / 864e5) + 1) : 365) : new Date(+mk.slice(0, 4), +mk.slice(5), 0).getDate();
    var biggest = db.transactions.filter(function (t) { return t.type === 'expense' && !t.noReport && t.date.indexOf(prefix) === 0; }).sort(function (a, b) { return b.amount - a.amount; })[0];
    var h = '<div class="seg"><button class="' + (!isYear ? 'on' : '') + '" data-act="repRange" data-v="month">Month</button><button class="' + (isYear ? 'on' : '') + '" data-act="repRange" data-v="year">Year ' + year + '</button></div>';
    if (isYear) {
      h += '<div class="hero"><small>' + year + ' – money left after spending</small><div class="big">' + money(inc - exp) + '</div><div class="hero-grid"><div>Income<b>' + money(inc) + '</b></div><div>Expenses<b>' + money(exp) + '</b></div><div>Saved<b>' + (inc > 0 ? Math.round((inc - exp) / inc * 100) + '%' : '–') + '</b></div></div></div>';
    }
    h += '<div class="stats">' + (isYear ? '<div class="stat"><small>Avg / month</small><b>' + money(exp / (year === App.today().slice(0, 4) ? Math.max(1, +App.today().slice(5, 7)) : 12)) + '</b></div>' : '<div class="stat"><small>Saved</small><b>' + (inc > 0 ? Math.round((inc - exp) / inc * 100) + '%' : '–') + '</b></div>') +
      '<div class="stat"><small>Avg / day</small><b>' + money(exp / days) + '</b></div><div class="stat"><small>Biggest</small><b>' + (biggest ? money(biggest.amount) : '–') + '</b></div></div>';
    h += '<div class="seg"><button class="exp ' + (type === 'expense' ? 'on' : '') + '" data-act="repType" data-v="expense">Expenses</button><button class="inc ' + (type === 'income' ? 'on' : '') + '" data-act="repType" data-v="income">Income</button></div>';
    if (!total) {
      h += empty('📊', 'No ' + type + ' recorded in ' + (isYear ? year : App.monthLabel(mk)));
    } else {
      var cum = 0, segs = items.map(function (it) {
        var p = it.v / total * 100, s = '<circle cx="21" cy="21" r="15.9155" fill="none" stroke="' + it.color + '" stroke-width="6" stroke-dasharray="' + p + ' ' + (100 - p) + '" stroke-dashoffset="' + (25 - cum) + '"></circle>';
        cum += p; return s;
      }).join('');
      h += '<div class="card"><svg class="donut" viewBox="0 0 42 42"><circle cx="21" cy="21" r="15.9155" fill="none" stroke="var(--line)" stroke-width="6"/>' + segs + '<text x="21" y="20.5" class="dt1">' + (type === 'expense' ? 'Spent' : 'Earned') + '</text><text x="21" y="26" class="dt2">' + App.fmt(total).replace(/\.00$/, '') + '</text></svg><div style="margin-top:10px">' +
        items.map(function (it) { return '<div class="leg"><i style="background:' + it.color + '"></i><span>' + it.icon + ' ' + esc(it.name) + '</span><em>' + Math.round(it.v / total * 100) + '%</em><b>' + money(it.v) + '</b></div>'; }).join('') + '</div></div>';
    }
    // bars: whole year, or the last 6 months
    var bm = [];
    if (isYear) bm = months; else for (i = 5; i >= 0; i--) bm.push(App.shiftMonth(mk, -i));
    var bc = barChart(bm);
    h += '<div class="card"><h4>Income vs expenses · ' + (isYear ? year : '6 months') + '</h4>' + bc.html + '</div>';
    if (isYear) {
      var best = -1, worst = -1;
      bc.data.forEach(function (d, idx) {
        if (d.expense > 0 && (worst < 0 || d.expense > bc.data[worst].expense)) worst = idx;
        if (d.income > 0 && (best < 0 || d.balance > bc.data[best].balance)) best = idx;
      });
      if (worst >= 0 || best >= 0) {
        h += '<div class="card"><h4>Highlights</h4>' + (worst >= 0 ? '<div class="kv"><span>Highest spending month</span><b class="ex">' + App.MONTHS[worst] + ' · ' + money(bc.data[worst].expense) + '</b></div>' : '') + (best >= 0 ? '<div class="kv"><span>Best saving month</span><b class="in">' + App.MONTHS[best] + ' · ' + money(bc.data[best].balance) + '</b></div>' : '') + '</div>';
      }
      h += '<div class="card" style="padding:8px"><div class="mrow h"><span>Month</span><span>Income</span><span>Expense</span><span>Balance</span></div>' + months.map(function (m, idx) {
        var d = bc.data[idx];
        return '<div class="mrow ' + (m === mk ? 'cur' : '') + '" data-act="gotoMonth" data-mk="' + m + '"><span><b>' + App.MONTHS[idx] + '</b></span><span class="in">' + (d.income ? money(d.income) : '–') + '</span><span class="ex">' + (d.expense ? money(d.expense) : '–') + '</span><span>' + ((d.income || d.expense) ? money(d.balance) : '–') + '</span></div>';
      }).join('') + '</div><button class="btn ghost block" data-act="shareYear" data-y="' + year + '">Share / export ' + year + ' report (CSV)</button>';
    }
    return h;
  }
  App.actions.repType = function (el) { App.ui.repType = el.dataset.v; App.renderScreen(); };
  App.actions.repRange = function (el) { App.ui.repRange = el.dataset.v; App.renderScreen(); };
  App.actions.shareYear = async function (el) { try { await App.exportYearCSV(el.dataset.y); } catch (e) { App.toast('Export failed'); } };

  // ---------- MORE ----------
  function renderMore() {
    var items = [
      ['split', '👥', 'Split with friends', 'Shared expenses and who owes whom'],
      ['bills', '🔔', 'Bills & subscriptions', 'Recurring payments with reminders'],
      ['goals', '🎯', 'Savings goals', 'Track what you are saving for'],
      ['loans', '🤝', 'Loans & lend / borrow', 'Money you owe or are owed'],
      ['categories', '🏷️', 'Categories', 'Create and edit your own'],
      ['backup', '☁️', 'Backup & restore', 'Protect your data'],
      ['settings', '⚙️', 'Settings', 'Name, currency, app lock']
    ];
    return items.map(function (i) {
      return '<button class="menu-item" data-act="openPage" data-p="' + i[0] + '"><div class="ico" style="background:var(--b100)">' + i[1] + '</div><div><b>' + i[2] + '</b><small>' + i[3] + '</small></div></button>';
    }).join('');
  }
})(window.App);
