'use strict';
(function (App) {
  var $ = App.$, esc = App.esc, money = App.money, icon = App.icon;

  function accOptions(sel, exclude) {
    return App.db.accounts.filter(function (a) { return a.id !== exclude; }).map(function (a) {
      return '<option value="' + a.id + '"' + (a.id === sel ? ' selected' : '') + '>' + esc(a.name) + ' (' + money(App.accBalance(a)) + ')</option>';
    }).join('');
  }
  function swatches(sel) {
    return '<div class="chips" id="swatches">' + App.COLORS.map(function (c) {
      return '<button class="swatch ' + (c === sel ? 'sel' : '') + '" style="background:' + c + '" data-act="pickColor" data-c="' + c + '"></button>';
    }).join('') + '</div>';
  }
  function emojiGrid(sel, list) {
    return '<div class="chips" id="emojis">' + (list || App.EMOJIS).map(function (e) {
      return '<button class="emo ' + (e === sel ? 'sel' : '') + '" data-act="pickEmoji" data-e="' + e + '">' + e + '</button>';
    }).join('') + '</div>';
  }
  App.actions.pickColor = function (el) {
    App.$$('#swatches .swatch').forEach(function (s) { s.classList.remove('sel'); });
    el.classList.add('sel');
  };
  App.actions.pickEmoji = function (el) {
    var was = el.classList.contains('sel');
    App.$$('#emojis .emo').forEach(function (s) { s.classList.remove('sel'); });
    if (!was) el.classList.add('sel');
  };
  var pickedColor = function () { var e = $('#swatches .sel'); return e ? e.dataset.c : App.COLORS[0]; };
  var pickedEmoji = function (fallback) { var e = $('#emojis .sel'); return e ? e.dataset.e : (fallback === undefined ? '🏷️' : fallback); };
  App.formHelpers = { accOptions: accOptions, swatches: swatches, emojiGrid: emojiGrid, pickedColor: pickedColor, pickedEmoji: pickedEmoji };

  // ---------- TRANSACTION SHEET ----------
  var cur = null;
  App.openTx = function (opts) {
    var db = App.db;
    if (!db.accounts.length) { App.toast('Add an account first'); App.setTab('accounts'); return; }
    opts = opts || {};
    if (opts.id) {
      var t = db.transactions.filter(function (x) { return x.id === opts.id; })[0];
      if (!t) return;
      cur = Object.assign({}, t, { amount: String(t.amount), photos: (t.photos || []).slice() });
    } else {
      var u = App.ui, defDate = (u.tab === 'home' && u.sub === 'calendar') ? u.sel : App.today();
      var acc = (u.acc !== 'all' && App.acc(u.acc)) ? u.acc : ((App.acc(db.settings.lastAcc) ? db.settings.lastAcc : db.accounts[0].id));
      cur = Object.assign({ type: 'expense', amount: '', date: defDate, accountId: acc, toAccountId: '', categoryId: '', note: '', photos: [] }, opts);
    }
    if (cur.type === 'transfer' && !cur.toAccountId) {
      var other = db.accounts.filter(function (a) { return a.id !== cur.accountId; })[0];
      cur.toAccountId = other ? other.id : '';
    }
    drawTx();
  };
  function readTx() {
    var g = function (id) { var e = $('#' + id); return e ? e.value : undefined; };
    var a = g('f-amt'); if (a !== undefined) cur.amount = a;
    var d = g('f-date'); if (d) cur.date = d;
    var ac = g('f-acc'); if (ac) cur.accountId = ac;
    var to = g('f-to'); if (to) cur.toAccountId = to;
    var n = g('f-note'); if (n !== undefined) cur.note = n;
  }
  function drawTx() {
    var db = App.db, d = cur, isT = d.type === 'transfer';
    var cats = db.categories.filter(function (c) { return c.type === d.type; });
    var h = '<div class="sheet-h"><h3>' + (d.id ? 'Edit' : 'Add') + ' transaction</h3><button class="ib" data-act="closeSheet">' + icon('close') + '</button></div>' +
      '<div class="seg">' + [['expense', 'Expense', 'exp'], ['income', 'Income', 'inc'], ['transfer', 'Transfer', '']].map(function (s) {
        return '<button class="' + s[2] + ' ' + (d.type === s[0] ? 'on' : '') + '" data-act="txType" data-v="' + s[0] + '">' + s[1] + '</button>';
      }).join('') + '</div>' +
      '<div class="amt-box"><span>' + esc(db.settings.currency) + '</span><input id="f-amt" inputmode="decimal" placeholder="0.00" value="' + esc(d.amount) + '" autocomplete="off"></div>' +
      '<div class="two"><div><label class="lbl">Date</label><input class="inp" type="date" id="f-date" value="' + d.date + '"></div>' +
      '<div><label class="lbl">' + (isT ? 'From' : 'Account') + '</label><select class="inp" id="f-acc">' + accOptions(d.accountId) + '</select></div></div>';
    if (isT) {
      h += '<label class="lbl">To account</label><select class="inp" id="f-to">' + accOptions(d.toAccountId, d.accountId) + '</select>';
    } else {
      h += '<label class="lbl">Category</label><div class="chips" id="catChips">' + cats.map(function (c) {
        return '<button class="cchip ' + (c.id === d.categoryId ? 'sel' : '') + '" data-act="pickCat" data-id="' + c.id + '"><span>' + c.icon + '</span>' + esc(c.name) + '</button>';
      }).join('') + '<button class="cchip add" data-act="newCatFromTx">+ New</button></div>';
    }
    h += '<label class="lbl">Note</label><input class="inp" id="f-note" placeholder="Optional" value="' + esc(d.note) + '" maxlength="120">' +
      '<label class="lbl">Receipt / invoice photos</label><div class="chips" id="photoRow">' + (d.photos || []).map(function (id) {
        return '<button class="thumb" data-act="viewPhoto" data-id="' + id + '"><img alt="receipt" data-photo="' + id + '"></button>';
      }).join('') + '<button class="cchip add" data-act="addPhoto">' + icon('camera') + ' Add photo</button></div>' +
      '<input type="file" id="f-photo" class="hidden" accept="image/*" multiple data-change="photoPicked">' +
      '<div class="btn-row">' + (d.id ? '<button class="btn danger" data-act="delTx" style="flex:none;padding:14px 18px">' + icon('trash') + '</button>' : '') + '<button class="btn primary" data-act="saveTx">Save</button></div>';
    App.openSheet(h, function (el) {
      App.$$('img[data-photo]', el).forEach(function (im) {
        App.photos.get(im.dataset.photo).then(function (src) { if (src) im.src = src; else im.parentNode.classList.add('gone'); });
      });
    });
  }
  App.actions.addPhoto = function () { var f = $('#f-photo'); if (f) f.click(); };
  App.changes.photoPicked = async function (el) {
    var files = Array.prototype.slice.call(el.files || []);
    el.value = '';
    if (!files.length || !cur) return;
    readTx();
    App.toast('Adding photo…');
    for (var i = 0; i < files.length; i++) {
      var data = await App.photos.compress(files[i]);
      if (!data) continue;
      var id = App.uid();
      await App.photos.put(id, data);
      cur.photos = (cur.photos || []).concat([id]);
    }
    if ($('#f-amt')) drawTx();
  };
  App.actions.viewPhoto = function (el) {
    readTx();
    var id = el.dataset.id;
    App.openSheet('<div class="sheet-h"><h3>Receipt</h3><button class="ib" data-act="photoBack">' + icon('close') + '</button></div><div style="text-align:center"><img id="pv" alt="receipt" style="max-width:100%;max-height:60vh;border-radius:14px"></div>' +
      '<div class="btn-row"><button class="btn danger" data-act="photoRemove" data-id="' + id + '">Remove</button><button class="btn primary" data-act="photoBack">Done</button></div>',
      function (s) { App.photos.get(id).then(function (src) { if (src) $('#pv', s).src = src; }); });
  };
  App.actions.photoBack = function () { drawTx(); };
  App.actions.photoRemove = function (el) {
    cur.photos = (cur.photos || []).filter(function (x) { return x !== el.dataset.id; });
    drawTx();
  };
  App.actions.addTx = function () { App.openTx({}); };
  App.actions.editTx = function (el) {
    var t = App.db.transactions.filter(function (x) { return x.id === el.dataset.id; })[0];
    if (t && (t.splitId || t.settleId)) {
      App.toast('This comes from Split with friends – manage it there');
      App.openPage('split');
      return;
    }
    App.openTx({ id: el.dataset.id });
  };
  App.actions.txType = function (el) {
    readTx();
    cur.type = el.dataset.v;
    var c = App.cat(cur.categoryId);
    if (!c || c.type !== cur.type) cur.categoryId = '';
    if (cur.type === 'transfer') {
      cur.categoryId = '';
      if (!cur.toAccountId || cur.toAccountId === cur.accountId) {
        var o = App.db.accounts.filter(function (a) { return a.id !== cur.accountId; })[0];
        cur.toAccountId = o ? o.id : '';
      }
    }
    drawTx();
  };
  App.actions.pickCat = function (el) {
    cur.categoryId = (cur.categoryId === el.dataset.id) ? '' : el.dataset.id;
    App.$$('#catChips .cchip').forEach(function (c) { c.classList.toggle('sel', c.dataset.id === cur.categoryId); });
  };
  App.actions.newCatFromTx = function () {
    readTx();
    App.openCategory({ type: cur.type, lockType: true, onDone: function (c) { if (c) cur.categoryId = c.id; drawTx(); } });
  };
  App.actions.saveTx = function () {
    readTx();
    var amt = App.evalAmount(cur.amount);
    if (!(amt > 0)) { App.toast('Enter an amount greater than 0'); return; }
    if (!cur.date) { App.toast('Pick a date'); return; }
    if (cur.type === 'transfer') {
      if (!cur.toAccountId || cur.toAccountId === cur.accountId) { App.toast('Choose two different accounts'); return; }
    }
    var rec = { type: cur.type, amount: amt, date: cur.date, accountId: cur.accountId, toAccountId: cur.type === 'transfer' ? cur.toAccountId : '', categoryId: cur.type === 'transfer' ? '' : (cur.categoryId || ''), note: (cur.note || '').trim(), photos: (cur.photos || []).slice() };
    if (cur.id) {
      var t = App.db.transactions.filter(function (x) { return x.id === cur.id; })[0];
      if (t) Object.assign(t, rec);
    } else {
      App.addTx(rec);
    }
    App.db.settings.lastAcc = cur.accountId;
    App.save(); App.closeSheet();
    if (cur.date.slice(0, 7) !== App.ui.month && App.ui.tab === 'home') { App.ui.month = cur.date.slice(0, 7); }
    App.ui.sel = cur.date;
    App.render();
    App.toast(cur.id ? 'Updated' : 'Saved');
  };
  App.actions.delTx = function () {
    var id = cur.id, db = App.db;
    var idx = db.transactions.findIndex(function (x) { return x.id === id; });
    if (idx < 0) return;
    var removed = db.transactions.splice(idx, 1)[0];
    App.save(); App.closeSheet(); App.render();
    App.toast('Deleted', function () { db.transactions.push(removed); App.save(); App.render(); });
  };

  // ---------- ACCOUNTS ----------
  App.actions.addAccount = function () { App.openAccount({}); };
  App.openAccount = function (o, onDone) {
    var a = o.id ? App.acc(o.id) : { name: '', type: 'bank', opening: 0, color: App.COLORS[0] };
    var h = '<div class="sheet-h"><h3>' + (o.id ? 'Edit' : 'New') + ' account</h3><button class="ib" data-act="closeSheet">' + icon('close') + '</button></div>' +
      '<label class="lbl">Name</label><input class="inp" id="a-name" value="' + esc(a.name) + '" placeholder="e.g. HDFC Savings" maxlength="30">' +
      '<label class="lbl">Type</label><select class="inp" id="a-type">' + App.ACC_TYPES.map(function (t) { return '<option value="' + t[0] + '"' + (a.type === t[0] ? ' selected' : '') + '>' + t[2] + ' ' + t[1] + '</option>'; }).join('') + '</select>' +
      '<label class="lbl">Opening balance' + (o.id ? '' : ' (use a minus if you owe money)') + '</label><input class="inp" id="a-open" inputmode="decimal" value="' + (a.opening || '') + '" placeholder="0.00">' +
      '<label class="lbl">Icon <span style="text-transform:none;font-weight:400">(optional – tap again to clear)</span></label>' + emojiGrid(a.icon || '', App.ACC_EMOJIS) +
      '<label class="lbl">Colour</label>' + swatches(a.color) +
      '<div class="btn-row">' + (o.id ? '<button class="btn danger" data-act="delAccount" data-id="' + o.id + '" style="flex:none;padding:14px 18px">' + icon('trash') + '</button>' : '') + '<button class="btn primary" id="a-save">Save</button></div>';
    App.openSheet(h, function (el) {
      $('#a-save', el).onclick = function () {
        var name = $('#a-name', el).value.trim();
        if (!name) { App.toast('Give the account a name'); return; }
        var op = $('#a-open', el).value.trim() ? App.evalAmount($('#a-open', el).value) : 0;
        if (isNaN(op)) { App.toast('Opening balance is not a number'); return; }
        var rec = { name: name, type: $('#a-type', el).value, opening: op, color: pickedColor(), icon: pickedEmoji('') };
        if (o.id) Object.assign(App.acc(o.id), rec);
        else App.db.accounts.push(Object.assign({ id: App.uid() }, rec));
        App.save(); App.closeSheet(); App.render();
        if (onDone) onDone();
      };
    });
  };
  App.actions.delAccount = function (el) {
    var id = el.dataset.id, a = App.acc(id);
    var n = App.db.transactions.filter(function (t) { return t.accountId === id || t.toAccountId === id; }).length;
    var b = App.db.bills.filter(function (x) { return x.accountId === id; }).length;
    if (n || b) { App.toast('This account has ' + n + ' transactions' + (b ? ' and ' + b + ' bills' : '') + ' – remove those first'); return; }
    App.confirmSheet('Delete "' + a.name + '"?', 'This cannot be undone.', 'Delete', function () {
      App.db.accounts = App.db.accounts.filter(function (x) { return x.id !== id; });
      if (App.ui.acc === id) App.ui.acc = 'all';
      App.save(); App.render();
    });
  };
  App.actions.accDetail = function (el) {
    var a = App.acc(el.dataset.id), tx = App.txIn(null, a.id).slice(0, 8);
    var h = '<div class="sheet-h"><h3>' + App.accIcon(a) + ' ' + esc(a.name) + '</h3><button class="ib" data-act="closeSheet">' + icon('close') + '</button></div>' +
      '<div class="hero" style="margin:6px 0 10px"><small>Balance</small><div class="big" style="margin-bottom:0">' + money(App.accBalance(a)) + '</div></div>' +
      '<div class="btn-row" style="margin:0 0 10px"><button class="btn ghost" data-act="editAccount" data-id="' + a.id + '">Edit</button>' + (App.db.accounts.length > 1 ? '<button class="btn ghost" data-act="transferFrom" data-id="' + a.id + '">Transfer</button>' : '') + '<button class="btn ghost" data-act="viewAccount" data-id="' + a.id + '">All records</button></div>' +
      (tx.length ? '<div class="section-t" style="margin-top:6px">Recent</div><div class="daygroup" style="box-shadow:none">' + tx.map(function (t) { return App.txRow(t, true); }).join('') + '</div>' : '');
    App.openSheet(h);
  };
  App.actions.editAccount = function (el) { App.closeSheet(); App.openAccount({ id: el.dataset.id }); };
  App.actions.transferFrom = function (el) { App.closeSheet(); App.openTx({ type: 'transfer', accountId: el.dataset.id }); };
  App.actions.viewAccount = function (el) { App.closeSheet(); App.ui.acc = el.dataset.id; App.ui.sub = 'daily'; App.setTab('home'); };

  // ---------- CATEGORIES ----------
  App.openCategory = function (o) {
    var c = o.id ? App.cat(o.id) : { name: '', type: o.type || 'expense', icon: '🏷️', color: App.COLORS[Math.floor(Math.random() * App.COLORS.length)] };
    var h = '<div class="sheet-h"><h3>' + (o.id ? 'Edit' : 'New') + ' category</h3><button class="ib" data-act="catCancel">' + icon('close') + '</button></div>' +
      (o.lockType ? '' : '<div class="seg" id="c-type">' + [['expense', 'Expense', 'exp'], ['income', 'Income', 'inc']].map(function (s) { return '<button class="' + s[2] + ' ' + (c.type === s[0] ? 'on' : '') + '" data-act="catType" data-v="' + s[0] + '">' + s[1] + '</button>'; }).join('') + '</div>') +
      '<label class="lbl">Name</label><input class="inp" id="c-name" value="' + esc(c.name) + '" placeholder="e.g. Coffee" maxlength="26">' +
      '<label class="lbl">Icon</label>' + emojiGrid(c.icon) +
      '<label class="lbl">Colour</label>' + swatches(c.color) +
      '<div class="btn-row">' + (o.id ? '<button class="btn danger" id="c-del" style="flex:none;padding:14px 18px">' + icon('trash') + '</button>' : '') + '<button class="btn primary" id="c-save">Save</button></div>';
    App._catCb = o.onDone;
    App.openSheet(h, function (el) {
      $('#c-save', el).onclick = function () {
        var name = $('#c-name', el).value.trim();
        if (!name) { App.toast('Give the category a name'); return; }
        var typeEl = $('#c-type .on', el), type = o.lockType ? o.type : (typeEl ? typeEl.dataset.v : c.type);
        var rec = { name: name, type: type, icon: pickedEmoji(), color: pickedColor() }, saved;
        if (o.id) { saved = App.cat(o.id); Object.assign(saved, rec); }
        else { saved = Object.assign({ id: App.uid() }, rec); App.db.categories.push(saved); }
        App.save(); App.closeSheet(); App.render();
        if (o.onDone) o.onDone(saved);
      };
      var del = $('#c-del', el);
      if (del) del.onclick = function () {
        var n = App.catUsage(o.id);
        App.confirmSheet('Delete "' + c.name + '"?', n ? n + ' transactions use it and will become Uncategorised.' : 'This cannot be undone.', 'Delete', function () {
          App.db.categories = App.db.categories.filter(function (x) { return x.id !== o.id; });
          App.db.envelopes.forEach(function (e) { e.categoryIds = e.categoryIds.filter(function (x) { return x !== o.id; }); });
          App.db.transactions.forEach(function (t) { if (t.categoryId === o.id) t.categoryId = ''; });
          App.save(); App.render();
          if (o.onDone) o.onDone(null);
        });
      };
    });
  };
  App.actions.catType = function (el) {
    App.$$('#c-type button').forEach(function (b) { b.classList.toggle('on', b === el); });
  };
  App.actions.catCancel = function () {
    var cb = App._catCb; App._catCb = null; App.closeSheet();
    if (cb) cb(null);
  };

  // ---------- ENVELOPES ----------
  App.actions.addEnvelope = function () { App.openEnvelope({}); };
  App.openEnvelope = function (o) {
    var db = App.db;
    var e = o.id ? db.envelopes.filter(function (x) { return x.id === o.id; })[0] : { name: '', icon: '✉️', limit: '', categoryIds: [] };
    var taken = [];
    db.envelopes.forEach(function (x) { if (x.id !== o.id) taken = taken.concat(x.categoryIds); });
    var cats = db.categories.filter(function (c) { return c.type === 'expense'; });
    var h = '<div class="sheet-h"><h3>' + (o.id ? 'Edit' : 'New') + ' envelope</h3><button class="ib" data-act="closeSheet">' + icon('close') + '</button></div>' +
      '<label class="lbl">Name</label><input class="inp" id="e-name" value="' + esc(e.name) + '" placeholder="e.g. Eating out" maxlength="26">' +
      '<label class="lbl">Monthly limit (' + esc(db.settings.currency) + ')</label><input class="inp" id="e-limit" inputmode="decimal" value="' + (e.limit || '') + '" placeholder="0.00">' +
      '<label class="lbl">Icon</label>' + emojiGrid(e.icon) +
      '<div class="tog" style="margin-top:8px"><span><b>Carry unused money to next month</b><br><small class="muted">What you do not spend gets added to next month\'s limit</small></span><input type="checkbox" id="e-carry"' + (e.carry ? ' checked' : '') + '></div>' +
      '<label class="lbl">Spending categories that draw from it</label>' +
      (cats.length ? '<div class="chips" id="e-cats">' + cats.map(function (c) {
        return '<button class="cchip ' + (e.categoryIds.indexOf(c.id) >= 0 ? 'sel' : '') + ' ' + (taken.indexOf(c.id) >= 0 ? 'dis' : '') + '" data-act="toggleChip" data-id="' + c.id + '"><span>' + c.icon + '</span>' + esc(c.name) + '</button>';
      }).join('') + '</div>' : '<p class="muted">No expense categories yet – add some in More → Categories.</p>') +
      '<div class="btn-row">' + (o.id ? '<button class="btn danger" id="e-del" style="flex:none;padding:14px 18px">' + icon('trash') + '</button>' : '') + '<button class="btn primary" id="e-save">Save</button></div>';
    App.openSheet(h, function (el) {
      $('#e-save', el).onclick = function () {
        var name = $('#e-name', el).value.trim(), lim = App.evalAmount($('#e-limit', el).value);
        if (!name) { App.toast('Give the envelope a name'); return; }
        if (!(lim >= 0)) { App.toast('Enter a monthly limit'); return; }
        var ids = App.$$('#e-cats .cchip.sel', el).map(function (x) { return x.dataset.id; });
        var carry = $('#e-carry', el).checked, rec = { name: name, limit: lim, icon: pickedEmoji(), categoryIds: ids, carry: carry };
        if (!e.since) rec.since = App.today().slice(0, 7);
        if (o.id) Object.assign(e, rec); else db.envelopes.push(Object.assign({ id: App.uid() }, rec));
        App.save(); App.closeSheet(); App.render();
      };
      var del = $('#e-del', el);
      if (del) del.onclick = function () {
        App.confirmSheet('Delete "' + e.name + '"?', 'Your transactions are kept – only the envelope is removed.', 'Delete', function () {
          db.envelopes = db.envelopes.filter(function (x) { return x.id !== o.id; });
          App.save(); App.render();
        });
      };
    });
  };
  App.actions.toggleChip = function (el) { el.classList.toggle('sel'); };
  App.actions.envDetail = function (el) {
    var e = App.db.envelopes.filter(function (x) { return x.id === el.dataset.id; })[0], mk = App.ui.month;
    var tx = App.db.transactions.filter(function (t) { return t.type === 'expense' && !t.noReport && t.date.indexOf(mk) === 0 && e.categoryIds.indexOf(t.categoryId) >= 0; }).sort(App.sortTx);
    var s = App.envSpent(e, mk), ci = App.envCarryIn(e, mk), av = App.r2(e.limit + ci);
    var h = '<div class="sheet-h"><h3>' + e.icon + ' ' + esc(e.name) + '</h3><button class="ib" data-act="closeSheet">' + icon('close') + '</button></div>' +
      '<div class="kv"><span>Monthly limit</span><b>' + money(e.limit) + '</b></div>' + (e.carry ? '<div class="kv"><span>Carried in from earlier months</span><b>' + money(ci) + '</b></div>' : '') + '<div class="kv"><span>Spent in ' + App.monthLabel(mk) + '</span><b class="ex">' + money(s) + '</b></div><div class="kv"><span>Left</span><b class="' + (av - s < 0 ? 'ex' : 'in') + '">' + money(av - s) + '</b></div>' +
      '<div class="btn-row" style="margin:10px 0"><button class="btn ghost" data-act="editEnvelope" data-id="' + e.id + '">Edit envelope</button></div>' +
      (tx.length ? '<div class="daygroup" style="box-shadow:none">' + tx.map(function (t) { return App.txRow(t, true); }).join('') + '</div>' : '<p class="muted" style="text-align:center">No spending yet this month</p>');
    App.openSheet(h);
  };
  App.actions.editEnvelope = function (el) { App.closeSheet(); App.openEnvelope({ id: el.dataset.id }); };
  App.actions.unbudgeted = function () {
    var mk = App.ui.month, used = [];
    App.db.envelopes.forEach(function (e) { used = used.concat(e.categoryIds); });
    var tx = App.db.transactions.filter(function (t) { return t.type === 'expense' && !t.noReport && t.date.indexOf(mk) === 0 && used.indexOf(t.categoryId) < 0; }).sort(App.sortTx);
    App.openSheet('<div class="sheet-h"><h3>📦 Not in any envelope</h3><button class="ib" data-act="closeSheet">' + icon('close') + '</button></div><p class="muted">Add these categories to an envelope to budget for them.</p><div class="daygroup" style="box-shadow:none">' + tx.map(function (t) { return App.txRow(t, true); }).join('') + '</div>');
  };
})(window.App);
