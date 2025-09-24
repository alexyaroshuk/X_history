// Initialize theme immediately to prevent flash
(function() {
  const savedTheme = localStorage.getItem("theme");
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  if (savedTheme === "dark" || (savedTheme === null && systemPrefersDark)) {
    document.documentElement.classList.add("dark-theme");
  } else if (savedTheme === "light") {
    document.documentElement.classList.add("light-theme");
  }
})();