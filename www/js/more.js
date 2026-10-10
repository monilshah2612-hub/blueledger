'use strict';
(function (App) {
  var $ = App.$, $$ = App.$$, esc = App.esc, money = App.money, r2 = App.r2, icon = App.icon;
  var H = function () { return App.formHelpers; };

  // ---------- page shell ----------
  var PAGES = {};
  App.actions.openPage = function (el) { App.openPage(el.dataset.p); };
  App.openPage = function (name) { App.ui.page = name; $('#page').classList.remove('hidden'); App.renderPage(); };
  App.closePage = function () { App.ui.page = null; $('#page').classList.add('hidden'); $('#page').innerHTML = ''; App.render(); };
  App.actions.closePage = function () { App.closePage(); };
  App.renderPage = function () {
    var p = PAGES[App.ui.page];
    if (!p) return;
    var pg = p(), el = $('#page'), top = el.querySelector('.page-b') ? el.querySelector('.page-b').scrollTop : 0;
    el.innerHTML = '<div class="page-h"><button class="ib" data-act="closePage" aria-label="Back">' + icon('back') + '</button><h2>' + pg.title + '</h2>' + (pg.right || '') + '</div><div class="page-b">' + pg.body + '</div>';
    el.querySelector('.page-b').scrollTop = top;
  };
  var plus = function (act) { return '<button class="ib" data-act="' + act + '" aria-label="Add">' + icon('plus') + '</button>'; };
  var empty = function (e, t) { return '<div class="empty"><div class="big">' + e + '</div><p>' + t + '</p></div>'; };
  var daysUntil = function (d) { return Math.round((App.parse(d) - App.parse(App.today())) / 864e5); };

  // ---------- BILLS ----------
  var FREQ = { weekly: 'Every week', monthly: 'Every month', yearly: 'Every year' };
  PAGES.bills = function () {
    var db = App.db, list = db.bills.slice().sort(function (a, b) { return a.nextDue.localeCompare(b.nextDue); });
    var monthly = 0;
    db.bills.forEach(function (b) { if (b.type === 'expense') monthly += b.freq === 'weekly' ? b.amount * 52 / 12 : (b.freq === 'yearly' ? b.amount / 12 : b.amount); });
    var body = '<div class="hero"><small>Monthly commitments</small><div class="big">' + money(monthly) + '</div><small>' + db.bills.length + ' recurring item' + (db.bills.length === 1 ? '' : 's') + '</small></div>';
    if (!list.length) body += empty('🔔', 'Add rent, EMIs, subscriptions or salary.<br>They can be added automatically and remind you before they are due.');
    body += '<div class="daygroup">' + list.map(function (b) {
      var d = daysUntil(b.nextDue), c = App.cat(b.categoryId), a = App.acc(b.accountId);
      var badge = d < 0 ? '<span class="badge red">Overdue ' + (-d) + 'd</span>' : (d === 0 ? '<span class="badge green">Due today</span>' : '<span class="badge">in ' + d + 'd</span>');
      return '<div class="row" data-act="editBill" data-id="' + b.id + '"><div class="ico" style="background:var(--b100)">' + (c ? c.icon : '🔔') + '</div><div class="row-main"><div class="row-title">' + esc(b.title) + '</div><div class="row-sub">' + FREQ[b.freq] + ' · ' + App.shortDate(b.nextDue) + (a ? ' · ' + esc(a.name) : '') + (b.auto ? ' · auto' : '') + '</div></div><div style="text-align:right"><div class="amt ' + (b.type === 'income' ? 'in' : 'ex') + '">' + money(b.amount) + '</div>' + badge + '</div>' +
        (!b.auto && d <= 0 ? '<button class="badge green" style="margin-left:6px" data-act="payBill" data-id="' + b.id + '">Mark paid</button>' : '') + '</div>';
    }).join('') + '</div>';
    return { title: 'Bills & subscriptions', right: plus('addBill'), body: body };
  };
  App.actions.payBill = function (el, e) {
    e.stopPropagation(); App.payBill(el.dataset.id); App.render(); App.toast('Recorded');
  };
  App.actions.addBill = function () { openBill({}); };
  App.actions.editBill = function (el) { openBill({ id: el.dataset.id }); };
  function openBill(o) {
    var db = App.db;
    if (!db.accounts.length) { App.toast('Add an account first'); return; }
    var b = o.id ? db.bills.filter(function (x) { return x.id === o.id; })[0] : { title: '', type: 'expense', amount: '', accountId: db.accounts[0].id, categoryId: '', freq: 'monthly', nextDue: App.today(), auto: false, remind: 1 };
    var draw = function (type) {
      var cats = db.categories.filter(function (c) { return c.type === type; });
      var h = '<div class="sheet-h"><h3>' + (o.id ? 'Edit' : 'New') + ' recurring item</h3><button class="ib" data-act="closeSheet">' + icon('close') + '</button></div>' +
        '<div class="seg" id="b-type">' + [['expense', 'Bill / expense', 'exp'], ['income', 'Income', 'inc']].map(function (s) { return '<button class="' + s[2] + ' ' + (type === s[0] ? 'on' : '') + '" data-v="' + s[0] + '">' + s[1] + '</button>'; }).join('') + '</div>' +
        '<label class="lbl">Title</label><input class="inp" id="b-title" value="' + esc(b.title) + '" placeholder="e.g. Rent, Netflix, Salary" maxlength="40">' +
        '<div class="two"><div><label class="lbl">Amount</label><input class="inp" id="b-amt" inputmode="decimal" value="' + (b.amount || '') + '"></div><div><label class="lbl">Repeats</label><select class="inp" id="b-freq">' + Object.keys(FREQ).map(function (f) { return '<option value="' + f + '"' + (b.freq === f ? ' selected' : '') + '>' + FREQ[f] + '</option>'; }).join('') + '</select></div></div>' +
        '<div class="two"><div><label class="lbl">Next due</label><input class="inp" type="date" id="b-due" value="' + b.nextDue + '"></div><div><label class="lbl">Account</label><select class="inp" id="b-acc">' + H().accOptions(b.accountId) + '</select></div></div>' +
        '<label class="lbl">Category</label><select class="inp" id="b-cat"><option value="">None</option>' + cats.map(function (c) { return '<option value="' + c.id + '"' + (b.categoryId === c.id ? ' selected' : '') + '>' + c.icon + ' ' + esc(c.name) + '</option>'; }).join('') + '</select>' +
        '<label class="lbl">Remind me</label><select class="inp" id="b-rem">' + [[-1, 'No reminder'], [0, 'On the day'], [1, '1 day before'], [3, '3 days before']].map(function (r) { return '<option value="' + r[0] + '"' + (b.remind === r[0] ? ' selected' : '') + '>' + r[1] + '</option>'; }).join('') + '</select>' +
        '<div class="tog"><span>Add to my records automatically on the due date</span><input type="checkbox" id="b-auto"' + (b.auto ? ' checked' : '') + '></div>' +
        '<div class="btn-row">' + (o.id ? '<button class="btn danger" id="b-del" style="flex:none;padding:14px 18px">' + icon('trash') + '</button>' : '') + '<button class="btn primary" id="b-save">Save</button></div>';
      App.openSheet(h, function (el) {
        $$('#b-type button', el).forEach(function (btn) {
          btn.onclick = function () {
            b.title = $('#b-title', el).value; b.amount = $('#b-amt', el).value; b.freq = $('#b-freq', el).value; b.nextDue = $('#b-due', el).value || b.nextDue;
            b.accountId = $('#b-acc', el).value; b.remind = +$('#b-rem', el).value; b.auto = $('#b-auto', el).checked; b.categoryId = '';
            draw(btn.dataset.v);
          };
        });
        $('#b-save', el).onclick = function () {
          var title = $('#b-title', el).value.trim(), amt = App.evalAmount($('#b-amt', el).value), due = $('#b-due', el).value;
          if (!title) { App.toast('Enter a title'); return; }
          if (!(amt > 0)) { App.toast('Enter an amount'); return; }
          if (!due) { App.toast('Pick the next due date'); return; }
          var rec = { title: title, type: $('#b-type .on', el).dataset.v, amount: amt, accountId: $('#b-acc', el).value, categoryId: $('#b-cat', el).value, freq: $('#b-freq', el).value, nextDue: due, day: App.parse(due).getDate(), auto: $('#b-auto', el).checked, remind: +$('#b-rem', el).value };
          if (o.id) Object.assign(db.bills.filter(function (x) { return x.id === o.id; })[0], rec); else db.bills.push(Object.assign({ id: App.uid() }, rec));
          if (rec.auto) App.processBills();
          App.save(); App.closeSheet(); App.render();
        };
        var del = $('#b-del', el);
        if (del) del.onclick = function () {
          App.confirmSheet('Delete "' + b.title + '"?', 'Past transactions stay in your records.', 'Delete', function () {
            db.bills = db.bills.filter(function (x) { return x.id !== o.id; }); App.save(); App.render();
          });
        };
      });
    };
    draw(b.type);
  }

  // ---------- GOALS ----------
  PAGES.goals = function () {
    var db = App.db, body = '';
    var saved = db.goals.reduce(function (s, g) { return s + g.saved; }, 0), target = db.goals.reduce(function (s, g) { return s + g.target; }, 0);
    body += '<div class="hero"><small>Total saved towards goals</small><div class="big">' + money(saved) + '</div><small>of ' + money(target) + '</small></div>';
    if (!db.goals.length) body += empty('🎯', 'Set a goal – a trip, a gadget, an emergency fund – and watch it fill up.');
    db.goals.forEach(function (g) {
      var pct = g.target > 0 ? Math.min(100, g.saved / g.target * 100) : 0, extra = '';
      if (g.deadline && g.saved < g.target) {
        var months = Math.max(1, Math.ceil(daysUntil(g.deadline) / 30));
        extra = daysUntil(g.deadline) < 0 ? '<span class="badge red">Past deadline</span>' : '<span>Save ' + money((g.target - g.saved) / months) + '/month to finish by ' + App.shortDate(g.deadline) + '</span>';
      }
      body += '<div class="env" data-act="goalDetail" data-id="' + g.id + '"><div class="env-top"><div class="ico" style="background:var(--b100)">' + g.icon + '</div><div class="env-name">' + esc(g.name) + '</div><div class="env-left">' + Math.round(pct) + '%</div></div><div class="bar"><i style="width:' + pct + '%"></i></div><div class="env-meta"><span>' + money(g.saved) + ' saved</span><span>of ' + money(g.target) + '</span></div>' + (extra ? '<div class="env-meta" style="margin-top:6px">' + extra + '</div>' : '') + '</div>';
    });
    return { title: 'Savings goals', right: plus('addGoal'), body: body };
  };
  App.actions.addGoal = function () { openGoal({}); };
  function openGoal(o) {
    var g = o.id ? App.db.goals.filter(function (x) { return x.id === o.id; })[0] : { name: '', icon: '🎯', target: '', saved: '', deadline: '' };
    var h = '<div class="sheet-h"><h3>' + (o.id ? 'Edit' : 'New') + ' goal</h3><button class="ib" data-act="closeSheet">' + icon('close') + '</button></div>' +
      '<label class="lbl">Goal</label><input class="inp" id="g-name" value="' + esc(g.name) + '" placeholder="e.g. Goa trip" maxlength="30">' +
      '<div class="two"><div><label class="lbl">Target</label><input class="inp" id="g-target" inputmode="decimal" value="' + (g.target || '') + '"></div><div><label class="lbl">Saved so far</label><input class="inp" id="g-saved" inputmode="decimal" value="' + (g.saved || '') + '"></div></div>' +
      '<label class="lbl">Target date (optional)</label><input class="inp" type="date" id="g-date" value="' + (g.deadline || '') + '">' +
      '<label class="lbl">Icon</label>' + H().emojiGrid(g.icon) +
      '<div class="btn-row">' + (o.id ? '<button class="btn danger" id="g-del" style="flex:none;padding:14px 18px">' + icon('trash') + '</button>' : '') + '<button class="btn primary" id="g-save">Save</button></div>';
    App.openSheet(h, function (el) {
      $('#g-save', el).onclick = function () {
        var name = $('#g-name', el).value.trim(), target = App.evalAmount($('#g-target', el).value), saved = $('#g-saved', el).value.trim() ? App.evalAmount($('#g-saved', el).value) : 0;
        if (!name) { App.toast('Name your goal'); return; }
        if (!(target > 0)) { App.toast('Enter a target amount'); return; }
        if (isNaN(saved)) { App.toast('Saved amount is not a number'); return; }
        var rec = { name: name, target: target, saved: saved, deadline: $('#g-date', el).value, icon: H().pickedEmoji() };
        if (o.id) Object.assign(g, rec); else App.db.goals.push(Object.assign({ id: App.uid() }, rec));
        App.save(); App.closeSheet(); App.render();
      };
      var del = $('#g-del', el);
      if (del) del.onclick = function () {
        App.confirmSheet('Delete "' + g.name + '"?', 'This cannot be undone.', 'Delete', function () { App.db.goals = App.db.goals.filter(function (x) { return x.id !== o.id; }); App.save(); App.render(); });
      };
    });
  }
  App.actions.goalDetail = function (el) {
    var g = App.db.goals.filter(function (x) { return x.id === el.dataset.id; })[0];
    App.openSheet('<div class="sheet-h"><h3>' + g.icon + ' ' + esc(g.name) + '</h3><button class="ib" data-act="closeSheet">' + icon('close') + '</button></div>' +
      '<div class="kv"><span>Saved</span><b>' + money(g.saved) + '</b></div><div class="kv"><span>Target</span><b>' + money(g.target) + '</b></div><div class="kv"><span>Remaining</span><b>' + money(Math.max(0, g.target - g.saved)) + '</b></div>' +
      '<label class="lbl">Add or withdraw</label><div class="amt-box"><span>' + esc(App.db.settings.currency) + '</span><input id="g-amt" inputmode="decimal" placeholder="0.00"></div>' +
      '<div class="btn-row"><button class="btn ghost" id="g-wd">Withdraw</button><button class="btn primary" id="g-add">Add money</button></div><button class="btn ghost block" data-act="editGoal" data-id="' + g.id + '">Edit goal</button>',
      function (s) {
        var go = function (sign) {
          var v = App.evalAmount($('#g-amt', s).value);
          if (!(v > 0)) { App.toast('Enter an amount'); return; }
          g.saved = Math.max(0, r2(g.saved + sign * v)); App.save(); App.closeSheet(); App.render();
        };
        $('#g-add', s).onclick = function () { go(1); }; $('#g-wd', s).onclick = function () { go(-1); };
      });
  };
  App.actions.editGoal = function (el) { App.closeSheet(); openGoal({ id: el.dataset.id }); };

  // ---------- LOANS ----------
  var outstanding = function (l) { return r2(l.amount - l.payments.reduce(function (s, p) { return s + p.amount; }, 0)); };
  PAGES.loans = function () {
    var db = App.db, dir = App.ui.loanDir;
    var recv = 0, owe = 0;
    db.loans.forEach(function (l) { var o = outstanding(l); if (l.dir === 'lent') recv += o; else owe += o; });
    var body = '<div class="hero"><small>Net position</small><div class="big">' + money(recv - owe) + '</div><div class="hero-grid" style="grid-template-columns:1fr 1fr"><div>To receive<b>' + money(recv) + '</b></div><div>To pay<b>' + money(owe) + '</b></div></div></div>' +
      '<div class="seg"><button class="' + (dir === 'lent' ? 'on' : '') + '" data-act="loanDir" data-v="lent">I lent</button><button class="' + (dir === 'borrowed' ? 'on' : '') + '" data-act="loanDir" data-v="borrowed">I borrowed</button></div>';
    var list = db.loans.filter(function (l) { return l.dir === dir; }).sort(function (a, b) { return (outstanding(b) > 0) - (outstanding(a) > 0) || b.date.localeCompare(a.date); });
    if (!list.length) body += empty('🤝', dir === 'lent' ? 'Nobody owes you anything.' : 'You do not owe anyone.');
    body += '<div class="daygroup">' + list.map(function (l) {
      var o = outstanding(l), d = l.due ? daysUntil(l.due) : null;
      return '<div class="row" data-act="loanDetail" data-id="' + l.id + '"><div class="ico" style="background:var(--b100)">👤</div><div class="row-main"><div class="row-title">' + esc(l.person) + '</div><div class="row-sub">' + App.shortDate(l.date) + (l.due ? ' · due ' + App.shortDate(l.due) : '') + (l.note ? ' · ' + esc(l.note) : '') + '</div></div><div style="text-align:right"><div class="amt ' + (l.dir === 'lent' ? 'in' : 'ex') + '">' + money(o) + '</div>' + (o <= 0 ? '<span class="badge green">Settled</span>' : (d !== null && d < 0 ? '<span class="badge red">Overdue</span>' : '')) + '</div></div>';
    }).join('') + '</div>';
    return { title: 'Loans', right: plus('addLoan'), body: body };
  };
  App.actions.loanDir = function (el) { App.ui.loanDir = el.dataset.v; App.renderPage(); };
  App.actions.addLoan = function () { openLoan({}); };
  function openLoan(o) {
    var db = App.db;
    var l = o.id ? db.loans.filter(function (x) { return x.id === o.id; })[0] : { dir: App.ui.loanDir, person: '', amount: '', date: App.today(), due: '', note: '', payments: [] };
    var h = '<div class="sheet-h"><h3>' + (o.id ? 'Edit' : 'New') + ' loan</h3><button class="ib" data-act="closeSheet">' + icon('close') + '</button></div>' +
      '<div class="seg" id="l-dir">' + [['lent', 'I lent'], ['borrowed', 'I borrowed']].map(function (s) { return '<button class="' + (l.dir === s[0] ? 'on' : '') + '" data-v="' + s[0] + '">' + s[1] + '</button>'; }).join('') + '</div>' +
      '<label class="lbl">Person</label><input class="inp" id="l-person" value="' + esc(l.person) + '" maxlength="40" placeholder="Name">' +
      '<div class="two"><div><label class="lbl">Amount</label><input class="inp" id="l-amt" inputmode="decimal" value="' + (l.amount || '') + '"></div><div><label class="lbl">Date</label><input class="inp" type="date" id="l-date" value="' + l.date + '"></div></div>' +
      '<div class="two"><div><label class="lbl">Due (optional)</label><input class="inp" type="date" id="l-due" value="' + (l.due || '') + '"></div><div><label class="lbl">Note</label><input class="inp" id="l-note" value="' + esc(l.note) + '" maxlength="60"></div></div>' +
      (o.id ? '' : '<label class="lbl">Also record in an account?</label><select class="inp" id="l-acc"><option value="">No – just track it here</option>' + H().accOptions('') + '</select>') +
      '<div class="btn-row">' + (o.id ? '<button class="btn danger" id="l-del" style="flex:none;padding:14px 18px">' + icon('trash') + '</button>' : '') + '<button class="btn primary" id="l-save">Save</button></div>';
    App.openSheet(h, function (el) {
      $$('#l-dir button', el).forEach(function (b) { b.onclick = function () { $$('#l-dir button', el).forEach(function (x) { x.classList.toggle('on', x === b); }); }; });
      $('#l-save', el).onclick = function () {
        var person = $('#l-person', el).value.trim(), amt = App.evalAmount($('#l-amt', el).value), dir = $('#l-dir .on', el).dataset.v;
        if (!person) { App.toast('Enter the person\'s name'); return; }
        if (!(amt > 0)) { App.toast('Enter an amount'); return; }
        var rec = { dir: dir, person: person, amount: amt, date: $('#l-date', el).value || App.today(), due: $('#l-due', el).value, note: $('#l-note', el).value.trim() };
        if (o.id) Object.assign(l, rec);
        else {
          var nl = Object.assign({ id: App.uid(), payments: [] }, rec); db.loans.push(nl);
          var acc = $('#l-acc', el).value;
          if (acc) App.addTx({ type: dir === 'lent' ? 'expense' : 'income', amount: amt, date: rec.date, accountId: acc, categoryId: '', note: (dir === 'lent' ? 'Lent to ' : 'Borrowed from ') + person, loanId: nl.id, noReport: true });
        }
        App.ui.loanDir = dir; App.save(); App.closeSheet(); App.render();
      };
      var del = $('#l-del', el);
      if (del) del.onclick = function () {
        App.confirmSheet('Delete this loan?', 'Records already added to accounts stay as they are.', 'Delete', function () { db.loans = db.loans.filter(function (x) { return x.id !== o.id; }); App.save(); App.render(); });
      };
    });
  }
  App.actions.loanDetail = function (el) { loanDetail(el.dataset.id); };
  function loanDetail(id) {
    var db = App.db, l = db.loans.filter(function (x) { return x.id === id; })[0], o = outstanding(l);
    var h = '<div class="sheet-h"><h3>' + esc(l.person) + '</h3><button class="ib" data-act="closeSheet">' + icon('close') + '</button></div>' +
      '<div class="kv"><span>' + (l.dir === 'lent' ? 'Lent' : 'Borrowed') + '</span><b>' + money(l.amount) + '</b></div><div class="kv"><span>Outstanding</span><b class="' + (l.dir === 'lent' ? 'in' : 'ex') + '">' + money(o) + '</b></div>' +
      (l.payments.length ? '<div class="section-t" style="margin-top:12px">Payments</div>' + l.payments.map(function (p) { return '<div class="kv"><span>' + App.dateLabel(p.date) + '</span><b>' + money(p.amount) + '</b></div>'; }).join('') : '') +
      (o > 0 ? '<label class="lbl">' + (l.dir === 'lent' ? 'Received back' : 'Paid back') + '</label><div class="amt-box"><span>' + esc(db.settings.currency) + '</span><input id="p-amt" inputmode="decimal" value="' + o + '"></div><div class="two"><div><label class="lbl">Date</label><input class="inp" type="date" id="p-date" value="' + App.today() + '"></div><div><label class="lbl">Record in</label><select class="inp" id="p-acc"><option value="">Just track</option>' + H().accOptions('') + '</select></div></div><button class="btn primary block" id="p-save">Record payment</button>' : '<p class="muted" style="text-align:center;margin-top:14px">🎉 Settled</p>') +
      '<button class="btn ghost block" data-act="editLoan" data-id="' + l.id + '">Edit loan</button>';
    App.openSheet(h, function (s) {
      var b = $('#p-save', s);
      if (b) b.onclick = function () {
        var v = App.evalAmount($('#p-amt', s).value);
        if (!(v > 0)) { App.toast('Enter an amount'); return; }
        var date = $('#p-date', s).value || App.today(), acc = $('#p-acc', s).value;
        l.payments.push({ id: App.uid(), date: date, amount: v });
        if (acc) App.addTx({ type: l.dir === 'lent' ? 'income' : 'expense', amount: v, date: date, accountId: acc, categoryId: '', note: (l.dir === 'lent' ? 'Repayment from ' : 'Repaid ') + l.person, loanId: l.id, noReport: true });
        App.save(); App.closeSheet(); App.render();
      };
    });
  }
  App.actions.editLoan = function (el) { App.closeSheet(); openLoan({ id: el.dataset.id }); };

  // ---------- CATEGORIES ----------
  PAGES.categories = function () {
    var t = App.ui.catType, list = App.db.categories.filter(function (c) { return c.type === t; });
    var body = '<div class="seg"><button class="' + (t === 'expense' ? 'on' : '') + '" data-act="catTab" data-v="expense">Expense</button><button class="' + (t === 'income' ? 'on' : '') + '" data-act="catTab" data-v="income">Income</button></div>';
    if (!list.length) body += empty('🏷️', 'No ' + t + ' categories yet. Tap + to create one.');
    body += '<div class="daygroup">' + list.map(function (c) {
      return '<div class="row" data-act="editCat" data-id="' + c.id + '"><div class="ico" style="background:' + c.color + '22;color:' + c.color + '">' + c.icon + '</div><div class="row-main"><div class="row-title">' + esc(c.name) + '</div><div class="row-sub">' + App.catUsage(c.id) + ' transactions</div></div>' + icon('fwd') + '</div>';
    }).join('') + '</div>';
    return { title: 'Categories', right: plus('addCat'), body: body };
  };
  App.actions.catTab = function (el) { App.ui.catType = el.dataset.v; App.renderPage(); };
  App.actions.addCat = function () { App.openCategory({ type: App.ui.catType }); };
  App.actions.editCat = function (el) { App.openCategory({ id: el.dataset.id }); };

  // ---------- BACKUP ----------
  var when = function (iso) { return iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'; };
  PAGES.backup = function () {
    var s = App.db.settings, native = !!App.cap('Filesystem');
    var body = '<div class="card"><div class="kv"><span>Last backup</span><b>' + when(s.lastBackup) + '</b></div><div class="kv"><span>Last shared to Drive/other</span><b>' + when(s.lastShared) + '</b></div></div>' +
      '<button class="btn primary block" data-act="doBackup">Back up now</button>' +
      '<button class="btn ghost block" data-act="doShare">Share backup (Google Drive, WhatsApp…)</button>' +
      '<button class="btn ghost block" data-act="pickRestore">Restore from a backup file</button>' +
      '<input type="file" id="restoreFile" class="hidden" accept=".json,application/json" data-change="restoreFile">' +
      '<div class="section-t">Automatic backups</div><div class="card">' +
      '<div class="tog"><span>Save a backup file automatically</span><input type="checkbox" data-change="setAuto"' + (s.autoBackup ? ' checked' : '') + '></div>' +
      '<div class="tog"><span>How often</span><select class="inp" style="width:auto" data-change="setFreq">' + [[1, 'Daily'], [7, 'Weekly'], [30, 'Monthly']].map(function (f) { return '<option value="' + f[0] + '"' + (s.backupEveryDays === f[0] ? ' selected' : '') + '>' + f[1] + '</option>'; }).join('') + '</select></div>' +
      '<div class="tog"><span>Remind me to share a copy to Drive</span><input type="checkbox" data-change="setRemindBackup"' + (s.remindBackup ? ' checked' : '') + '></div></div>' +
      '<div class="tog"><span>Include receipt photos in backups I save or share<br><small class="muted">Makes the file bigger. Automatic backups never include photos.</small></span><input type="checkbox" data-change="setBackupPhotos"' + (s.backupPhotos !== false ? ' checked' : '') + '></div>' +
      '<p class="muted" style="font-size:13px;line-height:1.5">' + (native ? 'Automatic backups are saved on your phone (Documents/BlueLedger) whenever you open the app and one is due; the last 10 are kept. Android\'s own Auto Backup to your Google account may also protect app data. To be safe against a lost phone, use <b>Share backup</b> to put a copy in Google Drive.' : 'You are running in a browser preview: backups download as a file.') + '</p>' +
      '<div class="section-t">Export</div><button class="btn ghost block" data-act="doCsv">Export all transactions (CSV)</button>';
    return { title: 'Backup & restore', body: body };
  };
  App.actions.doBackup = async function () {
    try { var r = await App.backupNow(false); App.toast('Saved ' + r.name + ' → ' + r.where); } catch (e) { App.toast(e.message || 'Backup failed'); }
    App.renderPage();
  };
  App.actions.doShare = async function () { try { await App.shareBackup(); } catch (e) { /* cancelled */ } App.renderPage(); };
  App.actions.doCsv = async function () { try { await App.exportCSV(); } catch (e) { App.toast('Export failed'); } };
  App.actions.pickRestore = function () { $('#restoreFile').click(); };
  App.changes.restoreFile = function (el) {
    var f = el.files && el.files[0]; if (!f) return;
    var rd = new FileReader();
    rd.onload = function () {
      try { var probe = JSON.parse(rd.result); var d = probe.data || probe; if (!d.accounts || !d.transactions) throw 0; }
      catch (e) { App.toast('That file is not a BlueLedger backup'); return; }
      App.confirmSheet('Replace all current data?', 'Everything in the app will be replaced with the contents of this backup.', 'Restore', function () {
        try { App.restoreFromText(rd.result); App.ui.page = null; $('#page').classList.add('hidden'); App.render(); App.scheduleReminders(); App.toast('Backup restored'); } catch (e2) { App.toast(e2.message); }
      });
    };
    rd.readAsText(f); el.value = '';
  };
  App.changes.setAuto = function (el) { App.db.settings.autoBackup = el.checked; App.save(); if (el.checked) App.maybeAutoBackup(); };
  App.changes.setFreq = function (el) { App.db.settings.backupEveryDays = +el.value; App.save(); };
  App.changes.setRemindBackup = function (el) { App.db.settings.remindBackup = el.checked; App.save(); };
  App.changes.setBackupPhotos = function (el) { App.db.settings.backupPhotos = el.checked; App.save(); };


  // ---------- SPLIT WITH FRIENDS ----------
  var friendColor = function (f) { var i = App.db.friends.indexOf(f); return App.COLORS[(i < 0 ? 0 : i * 3) % App.COLORS.length]; };
  var avatar = function (f) { return '<div class="avatar" style="background:' + friendColor(f) + '">' + esc((f.name || '?').charAt(0).toUpperCase()) + '</div>'; };
  var whoName = function (w) { if (w === 'me') return 'You'; var f = App.friend(w); return f ? f.name : 'Someone'; };
  PAGES.split = function () {
    var db = App.db, owed = 0, owe = 0;
    var rows = db.friends.map(function (f) { var b = App.friendBalance(f.id); if (b > 0) owed += b; else owe -= b; return { f: f, b: b }; });
    var body = '<div class="hero"><small>Net balance</small><div class="big">' + money(owed - owe) + '</div><div class="hero-grid" style="grid-template-columns:1fr 1fr"><div>You are owed<b>' + money(owed) + '</b></div><div>You owe<b>' + money(owe) + '</b></div></div></div>';
    if (!db.friends.length) body += empty('👥', 'Add the friends you share costs with, then split a dinner, a trip or the rent.');
    else {
      body += '<button class="btn primary block" style="margin:0 0 12px" data-act="addSplit">+ Split an expense</button><div class="daygroup">' + rows.map(function (r) {
        var cls = r.b > 0 ? 'in' : (r.b < 0 ? 'ex' : '');
        return '<div class="row" data-act="friendDetail" data-id="' + r.f.id + '">' + avatar(r.f) + '<div class="row-main"><div class="row-title">' + esc(r.f.name) + '</div><div class="row-sub">' + (r.b > 0 ? 'owes you' : (r.b < 0 ? 'you owe' : 'settled up')) + '</div></div><div class="amt ' + cls + '">' + (r.b === 0 ? '–' : money(Math.abs(r.b))) + '</div></div>';
      }).join('') + '</div>';
      var recent = db.splits.slice().sort(function (a, b) { return b.date.localeCompare(a.date); }).slice(0, 10);
      if (recent.length) {
        body += '<div class="section-t">Recent shared expenses</div><div class="daygroup">' + recent.map(function (sp) {
          return '<div class="row" data-act="splitDetail" data-id="' + sp.id + '"><div class="ico" style="background:var(--b100)">🧾</div><div class="row-main"><div class="row-title">' + esc(sp.title) + '</div><div class="row-sub">' + App.shortDate(sp.date) + ' · ' + esc(whoName(sp.paidBy)) + ' paid</div></div><div class="amt">' + money(sp.total) + '</div></div>';
        }).join('') + '</div>';
      }
    }
    return { title: 'Split with friends', right: plus('addFriend'), body: body };
  };

  App.actions.addFriend = function () { friendSheet({}); };
  function friendSheet(o, after) {
    var f = o.id ? App.friend(o.id) : { name: '' };
    App.openSheet('<div class="sheet-h"><h3>' + (o.id ? 'Rename friend' : 'Add a friend') + '</h3><button class="ib" data-act="closeSheet">' + icon('close') + '</button></div><label class="lbl">Name</label><input class="inp" id="fr-name" value="' + esc(f.name) + '" maxlength="30" placeholder="e.g. Rahul"><div class="btn-row"><button class="btn primary" id="fr-save">Save</button></div>', function (el) {
      $('#fr-save', el).onclick = function () {
        var name = $('#fr-name', el).value.trim();
        if (!name) { App.toast('Enter a name'); return; }
        if (o.id) f.name = name; else App.db.friends.push({ id: App.uid(), name: name });
        App.save(); App.closeSheet(); App.render();
        if (after) after();
      };
    });
  }

  App.actions.friendDetail = function (el) { friendDetail(el.dataset.id); };
  function friendDetail(id) {
    var db = App.db, f = App.friend(id), b = App.friendBalance(id);
    var hist = [];
    db.splits.forEach(function (sp) {
      var mine = 0, theirs = 0;
      sp.shares.forEach(function (x) { if (x.who === 'me') mine += x.amount; if (x.who === id) theirs += x.amount; });
      if (sp.paidBy === 'me' && theirs > 0) hist.push({ date: sp.date, title: sp.title, amt: theirs, act: 'splitDetail', id: sp.id, sub: 'You paid · their share' });
      else if (sp.paidBy === id && mine > 0) hist.push({ date: sp.date, title: sp.title, amt: -mine, act: 'splitDetail', id: sp.id, sub: f.name + ' paid · your share' });
    });
    db.settlements.forEach(function (st) {
      if (st.friendId === id) hist.push({ date: st.date, title: st.dir === 'received' ? 'They paid you back' : 'You paid them back', amt: st.dir === 'received' ? -st.amount : st.amount, act: 'delSettle', id: st.id, sub: 'Settlement – tap to delete' });
    });
    hist.sort(function (a, c) { return c.date.localeCompare(a.date); });
    var dir = b < 0 ? 'paid' : 'received';
    var h = '<div class="sheet-h"><h3>' + esc(f.name) + '</h3><button class="ib" data-act="closeSheet">' + icon('close') + '</button></div>' +
      '<div class="hero" style="margin:4px 0 10px"><small>' + (b > 0 ? esc(f.name) + ' owes you' : (b < 0 ? 'You owe ' + esc(f.name) : 'All settled up')) + '</small><div class="big" style="margin-bottom:0">' + money(Math.abs(b)) + '</div></div>' +
      '<div class="section-t" style="margin-top:6px">Settle up</div>' +
      '<div class="seg" id="st-dir"><button class="' + (dir === 'received' ? 'on' : '') + '" data-v="received">They paid me</button><button class="' + (dir === 'paid' ? 'on' : '') + '" data-v="paid">I paid them</button></div>' +
      '<div class="two"><div><label class="lbl" style="margin-top:0">Amount</label><input class="inp" id="st-amt" inputmode="decimal" value="' + (b !== 0 ? Math.abs(b) : '') + '"></div><div><label class="lbl" style="margin-top:0">Date</label><input class="inp" type="date" id="st-date" value="' + App.today() + '"></div></div>' +
      '<label class="lbl">Record in account</label><select class="inp" id="st-acc"><option value="">Just track here</option>' + (db.accounts.length ? H().accOptions('') : '') + '</select>' +
      '<button class="btn primary block" id="st-save">Record payment</button>' +
      '<div class="btn-row"><button class="btn ghost" data-act="renameFriend" data-id="' + id + '">Rename</button><button class="btn danger" data-act="delFriend" data-id="' + id + '">Remove friend</button></div>' +
      (hist.length ? '<div class="section-t">History</div><div class="daygroup" style="box-shadow:none">' + hist.map(function (x) {
        return '<div class="row" data-act="' + x.act + '" data-id="' + x.id + '"><div class="row-main"><div class="row-title">' + esc(x.title) + '</div><div class="row-sub">' + App.shortDate(x.date) + ' · ' + esc(x.sub) + '</div></div><div class="amt ' + (x.amt > 0 ? 'in' : 'ex') + '">' + (x.amt > 0 ? '+' : '-') + money(Math.abs(x.amt)) + '</div></div>';
      }).join('') + '</div>' : '');
    App.openSheet(h, function (el) {
      $$('#st-dir button', el).forEach(function (bt) { bt.onclick = function () { $$('#st-dir button', el).forEach(function (x) { x.classList.toggle('on', x === bt); }); }; });
      $('#st-save', el).onclick = function () {
        var amt = App.evalAmount($('#st-amt', el).value);
        if (!(amt > 0)) { App.toast('Enter an amount'); return; }
        App.addSettlement({ friendId: id, amount: amt, date: $('#st-date', el).value || App.today(), dir: $('#st-dir .on', el).dataset.v, accountId: $('#st-acc', el).value });
        App.save(); App.closeSheet(); App.render(); App.toast('Recorded');
      };
    });
  }
  App.actions.renameFriend = function (el) { App.closeSheet(); friendSheet({ id: el.dataset.id }); };
  App.actions.delFriend = function (el) {
    var id = el.dataset.id, db = App.db;
    var used = db.splits.some(function (sp) { return sp.paidBy === id || sp.shares.some(function (x) { return x.who === id; }); }) || db.settlements.some(function (x) { return x.friendId === id; });
    if (used) { App.toast('Delete their shared expenses and settlements first'); return; }
    App.confirmSheet('Remove ' + App.friend(id).name + '?', 'This cannot be undone.', 'Remove', function () {
      db.friends = db.friends.filter(function (x) { return x.id !== id; }); App.save(); App.render();
    });
  };
  App.actions.delSettle = function (el) {
    var id = el.dataset.id;
    App.confirmSheet('Delete this settlement?', 'The matching record in your account (if any) is removed too.', 'Delete', function () { App.deleteSettlement(id); App.save(); App.render(); });
  };
  App.actions.splitDetail = function (el) {
    var sp = App.db.splits.filter(function (x) { return x.id === el.dataset.id; })[0];
    if (!sp) return;
    var c = App.cat(sp.categoryId);
    App.openSheet('<div class="sheet-h"><h3>🧾 ' + esc(sp.title) + '</h3><button class="ib" data-act="closeSheet">' + icon('close') + '</button></div>' +
      '<div class="kv"><span>Date</span><b>' + App.dateLabel(sp.date) + '</b></div><div class="kv"><span>Total</span><b>' + money(sp.total) + '</b></div><div class="kv"><span>Paid by</span><b>' + esc(whoName(sp.paidBy)) + '</b></div>' + (c ? '<div class="kv"><span>Category</span><b>' + c.icon + ' ' + esc(c.name) + '</b></div>' : '') +
      '<div class="section-t">Shares</div>' + sp.shares.map(function (x) { return '<div class="kv"><span>' + esc(whoName(x.who)) + '</span><b>' + money(x.amount) + '</b></div>'; }).join('') +
      '<div class="btn-row"><button class="btn danger" data-act="delSplit" data-id="' + sp.id + '">Delete this split</button></div>');
  };
  App.actions.delSplit = function (el) {
    var id = el.dataset.id;
    App.confirmSheet('Delete this shared expense?', 'Its records in your accounts are removed and balances are recalculated.', 'Delete', function () { App.deleteSplit(id); App.save(); App.render(); });
  };

  App.actions.addSplit = function () {
    var db = App.db;
    if (!db.friends.length) { friendSheet({}, App.actions.addSplit); return; }
    if (!db.accounts.length) { App.toast('Add an account first'); return; }
    var st = { mode: 'equal', who: { me: true }, vals: {} };
    var cats = db.categories.filter(function (c) { return c.type === 'expense'; });
    var h = '<div class="sheet-h"><h3>Split an expense</h3><button class="ib" data-act="closeSheet">' + icon('close') + '</button></div>' +
      '<label class="lbl" style="margin-top:0">What was it for?</label><input class="inp" id="sp-title" placeholder="e.g. Dinner at Toit" maxlength="40">' +
      '<div class="amt-box"><span>' + esc(db.settings.currency) + '</span><input id="sp-total" inputmode="decimal" placeholder="Total bill" autocomplete="off"></div>' +
      '<div class="two"><div><label class="lbl">Date</label><input class="inp" type="date" id="sp-date" value="' + App.today() + '"></div><div><label class="lbl">Paid by</label><select class="inp" id="sp-by"><option value="me">You</option>' + db.friends.map(function (f) { return '<option value="' + f.id + '">' + esc(f.name) + '</option>'; }).join('') + '</select></div></div>' +
      '<div id="sp-acc-wrap"><label class="lbl">Paid from account</label><select class="inp" id="sp-acc">' + H().accOptions(db.settings.lastAcc || db.accounts[0].id) + '</select></div>' +
      '<label class="lbl">Category (for your share)</label><select class="inp" id="sp-cat"><option value="">None</option>' + cats.map(function (c) { return '<option value="' + c.id + '">' + c.icon + ' ' + esc(c.name) + '</option>'; }).join('') + '</select>' +
      '<label class="lbl">Split between</label><div class="chips" id="sp-who"><button class="cchip sel" data-w="me">You</button>' + db.friends.map(function (f) { return '<button class="cchip" data-w="' + f.id + '">' + esc(f.name) + '</button>'; }).join('') + '<button class="cchip add" id="sp-newfriend">+ Friend</button></div>' +
      '<div class="seg" style="margin-top:12px" id="sp-mode"><button class="on" data-v="equal">Equally</button><button data-v="exact">Exact amounts</button></div><div id="sp-shares"></div>' +
      '<div class="btn-row"><button class="btn primary" id="sp-save">Save</button></div>';
    App.openSheet(h, function (el) {
      var order = function () { return ['me'].concat(db.friends.map(function (f) { return f.id; })).filter(function (w) { return st.who[w]; }); };
      var total = function () { var v = App.evalAmount($('#sp-total', el).value); return v > 0 ? v : 0; };
      var drawShares = function () {
        var box = $('#sp-shares', el), who = order(), t = total();
        if (st.mode === 'equal') {
          var sh = who.length ? App.equalShares(t, who) : [];
          box.innerHTML = t && who.length ? sh.map(function (x) { return '<div class="kv"><span>' + esc(whoName(x.who)) + '</span><b>' + money(x.amount) + '</b></div>'; }).join('') : '<p class="muted" style="font-size:13px">Enter the total and pick who shares it.</p>';
        } else {
          box.innerHTML = who.map(function (w) { return '<div class="kv"><span>' + esc(whoName(w)) + '</span><input class="inp" style="width:120px;text-align:right" inputmode="decimal" data-sv="' + w + '" value="' + esc(st.vals[w] || '') + '"></div>'; }).join('') + '<div class="kv"><span class="muted">Left to assign</span><b id="sp-left"></b></div>';
          var upd = function () { var sum = 0; who.forEach(function (w) { var v = App.evalAmount(st.vals[w] || ''); if (v > 0) sum += v; }); $('#sp-left', el).textContent = money(total() - sum); };
          $$('[data-sv]', box).forEach(function (i) { i.oninput = function () { st.vals[i.dataset.sv] = i.value; upd(); }; });
          upd();
        }
      };
      $('#sp-total', el).oninput = drawShares;
      $('#sp-by', el).onchange = function () { $('#sp-acc-wrap', el).style.display = this.value === 'me' ? '' : 'none'; };
      $$('#sp-who [data-w]', el).forEach(function (b) {
        b.onclick = function () { st.who[b.dataset.w] = !st.who[b.dataset.w]; b.classList.toggle('sel', !!st.who[b.dataset.w]); drawShares(); };
      });
      $$('#sp-mode button', el).forEach(function (b) {
        b.onclick = function () { st.mode = b.dataset.v; $$('#sp-mode button', el).forEach(function (x) { x.classList.toggle('on', x === b); }); drawShares(); };
      });
      $('#sp-newfriend', el).onclick = function () { App.closeSheet(); friendSheet({}, App.actions.addSplit); };
      $('#sp-save', el).onclick = function () {
        var t = total(), who = order(), by = $('#sp-by', el).value, title = $('#sp-title', el).value.trim() || 'Shared expense';
        if (!(t > 0)) { App.toast('Enter the total amount'); return; }
        if (who.length < 2 && !(who.length === 1 && who[0] !== 'me')) { App.toast('Pick at least one friend to split with'); return; }
        if (by !== 'me' && !st.who.me) { App.toast('Include yourself, or choose "You" as the payer'); return; }
        var shares;
        if (st.mode === 'equal') shares = App.equalShares(t, who);
        else {
          var sum = 0; shares = who.map(function (w) { var v = App.evalAmount(st.vals[w] || ''); v = v > 0 ? v : 0; sum += v; return { who: w, amount: v }; });
          if (Math.abs(sum - t) > 0.01) { App.toast('Shares add up to ' + money(sum) + ', but the total is ' + money(t)); return; }
        }
        App.addSplit({ title: title, total: t, date: $('#sp-date', el).value || App.today(), paidBy: by, accountId: by === 'me' ? $('#sp-acc', el).value : '', categoryId: $('#sp-cat', el).value, shares: shares });
        if (by === 'me') App.db.settings.lastAcc = $('#sp-acc', el).value;
        App.save(); App.closeSheet(); App.render(); App.toast('Split saved');
      };
      drawShares();
    });
  };

  // ---------- SETTINGS & PIN ----------
  var hashPin = function (p) { var h = 5381, s = 'bl' + p; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return String(h); };
  PAGES.settings = function () {
    var s = App.db.settings;
    var body = '<div class="card"><label class="lbl" style="margin-top:0">Your name</label><input class="inp" data-change="setName" value="' + esc(s.name) + '" maxlength="30">' +
      '<label class="lbl">Currency symbol</label><select class="inp" data-change="setCur">' + ['₹', '$', '€', '£', '¥', 'AED ', 'Rs '].map(function (c) { return '<option value="' + c + '"' + (s.currency === c ? ' selected' : '') + '>' + c.trim() + '</option>'; }).join('') + '</select></div>' +
      '<div class="card"><div class="tog"><span>Bill reminders</span><input type="checkbox" data-change="setRem"' + (s.reminders ? ' checked' : '') + '></div>' +
      '<div class="tog"><span>App lock (PIN)</span><button class="badge" data-act="togglePin">' + (s.pin ? 'On – tap to remove' : 'Off – tap to set') + '</button></div></div>' +
      '<button class="btn danger block" data-act="eraseAll">Erase all data</button>' +
      '<p class="muted" style="text-align:center;font-size:12px;margin-top:16px">BlueLedger 1.1 · all data stays on your phone</p>';
    return { title: 'Settings', body: body };
  };
  App.changes.setName = function (el) { App.db.settings.name = el.value.trim(); App.save(); };
  App.changes.setCur = function (el) { App.db.settings.currency = el.value; App.save(); App.render(); };
  App.changes.setRem = function (el) { App.db.settings.reminders = el.checked; App.save(); };
  App.actions.togglePin = function () {
    var s = App.db.settings;
    if (s.pin) {
      App.pinPad('Enter PIN to remove', function (pin) {
        if (hashPin(pin) !== s.pin) return false;
        s.pin = null; App.save(); App.hideLock(); App.renderPage(); App.toast('App lock removed'); return true;
      }, true);
    } else {
      App.pinPad('Choose a 4-digit PIN', function (pin1) {
        App.pinPad('Confirm your PIN', function (pin2) {
          if (pin1 !== pin2) { App.hideLock(); App.toast('PINs did not match'); return true; }
          s.pin = hashPin(pin1); App.save(); App.hideLock(); App.renderPage(); App.toast('App lock on'); return true;
        }, true);
        return 'keep';
      }, true);
    }
  };
  App.actions.eraseAll = function () {
    App.confirmSheet('Erase everything?', 'All accounts, transactions, budgets and settings will be deleted. Back up first if unsure.', 'Erase all', function () {
      App.resetAll(); App.ui.page = null; $('#page').classList.add('hidden'); App.ui.tab = 'home'; App.render(); App.startWizard();
    });
  };

  // PIN pad: cb(pin) returns true (done), false (wrong → shake/clear) or 'keep' (leave pad open for next prompt)
  App.pinPad = function (title, cb, cancellable) {
    var el = $('#lock'), pin = '';
    el.classList.remove('hidden');
    var draw = function (msg) {
      el.innerHTML = '<div><div style="font-size:42px">🔒</div><h2 style="margin:8px 0 0">' + esc(title) + '</h2><div class="pin-dots">' + [0, 1, 2, 3].map(function (i) { return '<i class="' + (i < pin.length ? 'on' : '') + '"></i>'; }).join('') + '</div><div style="height:22px;opacity:.9">' + (msg || '') + '</div><div class="keypad">' +
        [1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map(function (k) { return k === '' ? '<span></span>' : '<button data-k="' + k + '">' + k + '</button>'; }).join('') + '</div>' +
        (cancellable ? '<p><button data-k="x" style="margin-top:18px;color:#cfe0ff;font-weight:700">Cancel</button></p>' : '') + '</div>';
      $$('button', el).forEach(function (b) {
        b.onclick = function () {
          var k = b.dataset.k;
          if (k === 'x') { App.hideLock(); return; }
          if (k === '⌫') pin = pin.slice(0, -1); else if (pin.length < 4) pin += k;
          if (pin.length === 4) {
            var res = cb(pin);
            if (res === false) { pin = ''; draw('Wrong PIN, try again'); } else if (res === 'keep') { /* next prompt drew itself */ }
            return;
          }
          draw();
        };
      });
    };
    draw();
  };
  App.hideLock = function () { var el = $('#lock'); el.classList.add('hidden'); el.innerHTML = ''; };
  App.lockIfNeeded = function () {
    var s = App.db.settings;
    if (!s.pin || !s.onboarded) return;
    App.pinPad('Enter PIN', function (pin) { if (hashPin(pin) !== s.pin) return false; App.hideLock(); return true; }, false);
  };

  // ---------- SETUP WIZARD ----------
  var wz = null;
  App.startWizard = function () {
    wz = { step: 0, name: '', currency: '₹', accounts: [], expSel: {}, expCustom: [], incSel: {}, incCustom: [], limits: {}, auto: true, freq: 7, remindBackup: true, reminders: true };
    $('#wizard').classList.remove('hidden');
    drawWz();
  };
  var STEPS = [
    ['Welcome 👋', 'Let\'s set things up your way – it takes about a minute.'],
    ['Your accounts', 'Add every place your money lives: cash, banks, cards, wallets.'],
    ['Your categories', 'Pick what you spend on and earn from. You can add your own.'],
    ['Your envelopes', 'Set a monthly limit for the categories you want to control. Leave blank to skip.'],
    ['Backups & reminders', 'Keep your data safe and never miss a bill.']
  ];
  function readWz() {
    var w = $('#wizard');
    if (wz.step === 0) { wz.name = ($('#w-name', w).value || '').trim(); wz.currency = $('#w-cur', w).value; }
    if (wz.step === 1) {
      wz.accounts = $$('.acc-edit', w).map(function (r) {
        return { name: $('.w-an', r).value.trim(), type: $('.w-at', r).value, opening: $('.w-ao', r).value };
      });
    }
    if (wz.step === 3) { $$('.w-limit', w).forEach(function (i) { wz.limits[i.dataset.n] = i.value; }); }
    if (wz.step === 4) { wz.auto = $('#w-auto', w).checked; wz.freq = +$('#w-freq', w).value; wz.remindBackup = $('#w-rb', w).checked; wz.reminders = $('#w-rem', w).checked; }
  }
  function expNames() { return App.SUG_EXP.map(function (x) { return x[0]; }).concat(wz.expCustom).filter(function (n) { return wz.expSel[n]; }); }
  function chipsFor(t) {
    var sug = t === 'exp' ? App.SUG_EXP : App.SUG_INC, custom = t === 'exp' ? wz.expCustom : wz.incCustom, sel = t === 'exp' ? wz.expSel : wz.incSel;
    var all = sug.map(function (x) { return x[0]; }).concat(custom);
    return '<div class="chips">' + all.map(function (n) {
      var em = (sug.filter(function (x) { return x[0] === n; })[0] || [0, '🏷️'])[1];
      return '<button class="cchip ' + (sel[n] ? 'sel' : '') + '" data-act="wzToggle" data-t="' + t + '" data-n="' + esc(n) + '"><span>' + em + '</span>' + esc(n) + '</button>';
    }).join('') + '</div><div class="two" style="grid-template-columns:1fr auto;margin-top:10px"><input class="inp" id="w-new-' + t + '" placeholder="Add your own…" maxlength="26"><button class="btn ghost" style="flex:none;padding:0 18px" data-act="wzAdd" data-t="' + t + '">Add</button></div>';
  }
  function drawWz() {
    var w = $('#wizard'), s = wz.step, body = '';
    if (s === 0) {
      body = '<label class="lbl">What should we call you?</label><input class="inp" id="w-name" placeholder="Your name" value="' + esc(wz.name) + '" maxlength="30">' +
        '<label class="lbl">Currency</label><select class="inp" id="w-cur">' + ['₹', '$', '€', '£', '¥', 'AED ', 'Rs '].map(function (c) { return '<option value="' + c + '"' + (wz.currency === c ? ' selected' : '') + '>' + c.trim() + '</option>'; }).join('') + '</select>' +
        '<p class="muted" style="margin-top:20px;line-height:1.5">Your data stays on this phone. Nothing is uploaded unless you choose to share a backup.</p>';
    } else if (s === 1) {
      body = '<div class="chips" style="margin-bottom:12px">' + [['Cash', 'cash'], ['Bank account', 'bank'], ['Credit card', 'card'], ['UPI wallet', 'wallet'], ['Savings', 'savings']].map(function (p) { return '<button class="cchip add" data-act="wzAcc" data-n="' + p[0] + '" data-t="' + p[1] + '">+ ' + p[0] + '</button>'; }).join('') + '<button class="cchip add" data-act="wzAcc" data-n="" data-t="bank">+ Other</button></div>' +
        (wz.accounts.length ? wz.accounts.map(function (a, i) {
          return '<div class="acc-edit" data-i="' + i + '"><div class="two" style="grid-template-columns:1fr auto"><input class="inp w-an" placeholder="Account name" value="' + esc(a.name) + '" maxlength="30"><button class="ib" data-act="wzDelAcc" data-i="' + i + '" style="color:var(--expense)">' + icon('trash') + '</button></div><div class="two" style="margin-top:8px"><select class="inp w-at">' + App.ACC_TYPES.map(function (t) { return '<option value="' + t[0] + '"' + (a.type === t[0] ? ' selected' : '') + '>' + t[2] + ' ' + t[1] + '</option>'; }).join('') + '</select><input class="inp w-ao" inputmode="decimal" placeholder="Balance now" value="' + esc(a.opening) + '"></div></div>';
        }).join('') + '<p class="muted" style="font-size:12px">For a credit card you owe money on, enter the balance with a minus sign.</p>' : '<p class="muted">Tap a suggestion above to add your first account.</p>');
    } else if (s === 2) {
      body = '<div class="section-t" style="margin-top:0;display:flex;justify-content:space-between">Spending <button data-act="wzAll" data-t="exp" style="color:var(--b600)">Select all</button></div>' + chipsFor('exp') +
        '<div class="section-t" style="display:flex;justify-content:space-between">Income <button data-act="wzAll" data-t="inc" style="color:var(--b600)">Select all</button></div>' + chipsFor('inc');
    } else if (s === 3) {
      var names = expNames();
      body = names.length ? names.map(function (n) {
        var em = (App.SUG_EXP.filter(function (x) { return x[0] === n; })[0] || [0, '🏷️'])[1];
        return '<div class="acc-edit"><div class="two" style="grid-template-columns:1fr 130px;align-items:center"><b>' + em + ' ' + esc(n) + '</b><input class="inp w-limit" data-n="' + esc(n) + '" inputmode="decimal" placeholder="Monthly limit" value="' + esc(wz.limits[n] || '') + '"></div></div>';
      }).join('') + '<p class="muted" style="font-size:12px">Each limit becomes an envelope that resets every month. You can combine categories into shared envelopes later in the Budget tab.</p>' : '<p class="muted">You did not pick any spending categories, so there is nothing to budget yet. You can create envelopes any time from the Budget tab.</p>';
    } else {
      body = '<div class="card"><div class="tog"><span><b>Automatic backup</b><br><small class="muted">Saves a file on your phone when due</small></span><input type="checkbox" id="w-auto"' + (wz.auto ? ' checked' : '') + '></div>' +
        '<div class="tog"><span>How often</span><select class="inp" style="width:auto" id="w-freq">' + [[1, 'Daily'], [7, 'Weekly'], [30, 'Monthly']].map(function (f) { return '<option value="' + f[0] + '"' + (wz.freq === f[0] ? ' selected' : '') + '>' + f[1] + '</option>'; }).join('') + '</select></div>' +
        '<div class="tog"><span><b>Backup reminder</b><br><small class="muted">Nudge to share a copy to Google Drive</small></span><input type="checkbox" id="w-rb"' + (wz.remindBackup ? ' checked' : '') + '></div>' +
        '<div class="tog"><span><b>Bill reminders</b></span><input type="checkbox" id="w-rem"' + (wz.reminders ? ' checked' : '') + '></div></div>';
    }
    w.innerHTML = '<div class="wz-top"><div class="dots">' + STEPS.map(function (_, i) { return '<i class="' + (i <= s ? 'on' : '') + '"></i>'; }).join('') + '</div><h1>' + STEPS[s][0] + '</h1><p>' + STEPS[s][1] + '</p></div><div class="wz-body">' + body + '</div>' +
      '<div class="wz-foot">' + (s > 0 ? '<button class="btn ghost" data-act="wzBack">Back</button>' : '') + '<button class="btn primary" data-act="wzNext">' + (s === STEPS.length - 1 ? 'Finish' : 'Next') + '</button></div>';
  }
  App.actions.wzAcc = function (el) { readWz(); wz.accounts.push({ name: el.dataset.n, type: el.dataset.t, opening: '' }); drawWz(); };
  App.actions.wzDelAcc = function (el) { readWz(); wz.accounts.splice(+el.dataset.i, 1); drawWz(); };
  App.actions.wzToggle = function (el) {
    var sel = el.dataset.t === 'exp' ? wz.expSel : wz.incSel, n = el.dataset.n;
    sel[n] = !sel[n]; el.classList.toggle('sel', !!sel[n]);
  };
  App.actions.wzAll = function (el) {
    var t = el.dataset.t, sug = t === 'exp' ? App.SUG_EXP : App.SUG_INC, custom = t === 'exp' ? wz.expCustom : wz.incCustom, sel = t === 'exp' ? wz.expSel : wz.incSel;
    sug.map(function (x) { return x[0]; }).concat(custom).forEach(function (n) { sel[n] = true; });
    drawWz();
  };
  App.actions.wzAdd = function (el) {
    var t = el.dataset.t, inp = $('#w-new-' + t), n = inp.value.trim();
    if (!n) return;
    var custom = t === 'exp' ? wz.expCustom : wz.incCustom, sel = t === 'exp' ? wz.expSel : wz.incSel, sug = (t === 'exp' ? App.SUG_EXP : App.SUG_INC).map(function (x) { return x[0]; });
    if (sug.concat(custom).indexOf(n) < 0) custom.push(n);
    sel[n] = true; drawWz();
  };
  App.actions.wzBack = function () { readWz(); wz.step = Math.max(0, wz.step - 1); drawWz(); };
  App.actions.wzNext = function () {
    readWz();
    if (wz.step === 1) {
      var named = wz.accounts.filter(function (a) { return a.name; });
      if (!named.length) { App.toast('Add at least one account with a name'); return; }
      wz.accounts = named;
      for (var i = 0; i < wz.accounts.length; i++) {
        var o = String(wz.accounts[i].opening).trim();
        if (o && isNaN(App.evalAmount(o))) { App.toast('Check the balance for "' + wz.accounts[i].name + '"'); return; }
      }
    }
    if (wz.step < STEPS.length - 1) { wz.step++; drawWz(); var b = $('#wizard .wz-body'); if (b) b.scrollTop = 0; return; }
    finishWz();
  };
  function finishWz() {
    var db = App.blank(), ci = 0, col = function () { return App.COLORS[ci++ % App.COLORS.length]; };
    db.settings.name = wz.name; db.settings.currency = wz.currency; db.settings.autoBackup = wz.auto; db.settings.backupEveryDays = wz.freq;
    db.settings.remindBackup = wz.remindBackup; db.settings.reminders = wz.reminders; db.settings.onboarded = true;
    wz.accounts.forEach(function (a) {
      var o = String(a.opening).trim();
      db.accounts.push({ id: App.uid(), name: a.name, type: a.type, opening: o ? App.evalAmount(o) : 0, color: col() });
    });
    var mk = function (names, type, sug) {
      names.forEach(function (n) {
        var em = (sug.filter(function (x) { return x[0] === n; })[0] || [0, '🏷️'])[1];
        var c = { id: App.uid(), name: n, type: type, icon: em, color: col() };
        db.categories.push(c);
        var lim = type === 'expense' ? App.evalAmount(wz.limits[n] || '') : NaN;
        if (lim > 0) db.envelopes.push({ id: App.uid(), name: n, icon: em, limit: lim, categoryIds: [c.id] });
      });
    };
    mk(expNames(), 'expense', App.SUG_EXP);
    mk(App.SUG_INC.map(function (x) { return x[0]; }).concat(wz.incCustom).filter(function (n) { return wz.incSel[n]; }), 'income', App.SUG_INC);
    App.db = db; App.persist();
    $('#wizard').classList.add('hidden'); $('#wizard').innerHTML = '';
    App.ui.tab = 'home'; App.render();
    App.scheduleReminders(); App.maybeAutoBackup();
    App.toast('All set' + (db.settings.name ? ', ' + db.settings.name : '') + '! Tap + to add your first transaction.');
  }
})(window.App);
