// 案B：文字の大きさ切替と、押した行だけに遷移の名前を付ける処理
(function () {
  var KEY = "kajiDemoB.scale";
  var root = document.documentElement;

  function setScale(v) {
    if (v === "large") root.dataset.fontScale = "large"; else delete root.dataset.fontScale;
    document.querySelectorAll("[data-scale]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.scale === v));
    });
    try { localStorage.setItem(KEY, v); } catch (e) {}
  }
  setScale(root.dataset.fontScale === "large" ? "large" : "normal");
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-scale]");
    if (b) setScale(b.dataset.scale);
  });

  // 名前は常に1つだけ。トップでは押した行に付ける
  function clearNames() {
    document.querySelectorAll(".week__row").forEach(function (r) { r.style.viewTransitionName = ""; });
  }

  // トップ：去る直前に、行き先のハッシュに当たる行へ名前を付ける
  window.addEventListener("pageswap", function (e) {
    if (!e.viewTransition || !e.activation || !e.activation.entry) return;
    var hash = new URL(e.activation.entry.url).hash.slice(1);
    var row = hash && document.getElementById("row-" + hash);
    if (row) row.style.viewTransitionName = "row";
  });
  window.addEventListener("pageshow", clearNames);

  // スタッフ側の名前は style.css の :target で付ける（読み込み前の初回描画に間に合わせるため）
})();
