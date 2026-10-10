'use strict';
(function (App) {
  var $ = App.$;

  // Returns true if the back press was handled inside the app
  App.back = function () {
    if (!$('#lock').classList.contains('hidden')) return true;
    if (!$('#wizard').classList.contains('hidden')) {
      var b = $('#wizard [data-act="wzBack"]');
      if (b) b.click();
      return true;
    }
    if (App._sheetOpen) { App.closeSheet(); return true; }
    if (App.ui.page) { App.closePage(); return true; }
    if (App.ui.searchOpen) { App.actions.toggleSearch(); return true; }
    if (App.ui.tab !== 'home') { App.setTab('home'); return true; }
    return false;
  };

  function boot() {
    var s = App.db.settings;
    if (!s.onboarded) {
      App.render();
      App.startWizard();
    } else {
      var n = App.processBills();
      App.render();
      App.lockIfNeeded();
      if (n) App.toast('Added ' + n + ' recurring entr' + (n === 1 ? 'y' : 'ies'));
      App.maybeAutoBackup();
      App.scheduleReminders();
      App.photos.prune();
    }

    var capApp = App.cap('App');
    if (capApp) {
      capApp.addListener('backButton', function () {
        if (!App.back()) capApp.exitApp();
      });
      var hiddenAt = 0;
      capApp.addListener('appStateChange', function (st) {
        if (!st.isActive) { hiddenAt = Date.now(); return; }
        if (hiddenAt && Date.now() - hiddenAt > 30000) App.lockIfNeeded();
        if (App.db.settings.onboarded) {
          var n = App.processBills();
          if (n) { App.render(); App.toast('Added ' + n + ' recurring entr' + (n === 1 ? 'y' : 'ies')); }
          App.maybeAutoBackup();
        }
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window.App);
