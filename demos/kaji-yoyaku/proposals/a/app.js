/* 案A：文字の大きさ切替と、スタッフ写真の共有要素遷移だけ。<head> で同期に読む。 */
(function () {
  var KEY = "kajiDemo.prefs";
  var root = document.documentElement;

  /* 文字の大きさ：描画前に反映して、標準→大きくの瞬きを出さない */
  function readPrefs() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  function applyScale(scale) {
    root.dataset.fontScale = scale;
    document.querySelectorAll("[data-scale]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.scale === scale));
    });
  }
  root.dataset.fontScale = readPrefs().fontScale === "large" ? "large" : "normal";

  document.addEventListener("DOMContentLoaded", function () {
    applyScale(root.dataset.fontScale);
    document.querySelectorAll("[data-scale]").forEach(function (b) {
      b.addEventListener("click", function () {
        var p = readPrefs();
        p.fontScale = b.dataset.scale;
        try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) {}
        applyScale(b.dataset.scale);
      });
    });
  });

  /* 共有要素：押した人の写真1枚にだけ名前を付ける（他の写真は動かさない） */
  var LAST = "kajiDemo.a.person";
  function photoOf(id) { return document.querySelector('img[data-person="' + id + '"], [data-person="' + id + '"] img'); }
  function name(id, on) {
    var img = id && photoOf(id);
    if (img) img.style.viewTransitionName = on ? "photo-" + id : "";
  }
  function personIn(url) {
    var m = /staff\.html#(s\d)$/.exec(url || "");
    return m ? m[1] : null;
  }
  function remembered() { try { return sessionStorage.getItem(LAST); } catch (e) { return null; } }

  /* 出ていく頁：トップ→staff.html#sX ならその人、スタッフ紹介から戻るなら来た時の人 */
  window.addEventListener("pageswap", function (e) {
    if (!e.viewTransition || !e.activation) return;
    var to = e.activation.entry && e.activation.entry.url;
    var id = personIn(to);
    if (id) { try { sessionStorage.setItem(LAST, id); } catch (err) {} }
    else if (e.activation.navigationType === "traverse" && /staff\.html/.test(location.pathname)) id = remembered(); // 戻る時だけ逆向き
    if (!id) return;
    name(id, true);
    e.viewTransition.finished.finally(function () { name(id, false); });
  });

  /* 入ってくる頁：同じ人の写真に同じ名前を付ける */
  window.addEventListener("pagereveal", function (e) {
    if (!e.viewTransition) return;
    var from = window.navigation && navigation.activation && navigation.activation.from;
    var fromUrl = from && from.url ? from.url : "";
    var id = null;
    if (/staff\.html/.test(location.pathname)) id = personIn(location.href);
    else if (/staff\.html/.test(fromUrl) && navigation.activation.navigationType === "traverse") id = remembered();
    if (!id) return;
    name(id, true);
    e.viewTransition.finished.finally(function () { name(id, false); });
  });
})();
