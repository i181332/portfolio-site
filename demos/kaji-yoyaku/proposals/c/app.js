// 文字の大きさ切替だけ。本体と同じ kajiDemo.prefs に覚える。
(function () {
  var KEY = "kajiDemo.prefs";
  var root = document.documentElement;
  var buttons = document.querySelectorAll("[data-scale]");
  function apply(scale) {
    root.dataset.fontScale = scale;
    buttons.forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.scale === scale)); });
  }
  apply(root.dataset.fontScale === "large" ? "large" : "normal");
  buttons.forEach(function (b) {
    b.addEventListener("click", function () {
      apply(b.dataset.scale);
      try { localStorage.setItem(KEY, JSON.stringify({ fontScale: b.dataset.scale })); } catch (e) {}
    });
  });
})();
