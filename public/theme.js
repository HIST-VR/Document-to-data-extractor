(function () {
  try {
    var theme = localStorage.getItem("doclens-theme");
    if (theme === "light" || theme === "dark") {
      document.documentElement.setAttribute("data-theme", theme);
    }
    var lang = localStorage.getItem("doclens-lang");
    if (lang === "uk") {
      document.documentElement.lang = "uk";
    }
    var dark =
      theme === "dark" ||
      (theme !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? "#14120F" : "#F6F4EE");
  } catch (error) {
    void error;
  }
})();
