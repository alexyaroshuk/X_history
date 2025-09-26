// Theme initialization script that runs before DOM content loads
(function() {
  const savedTheme = localStorage.getItem("theme");
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  // Apply theme to both html and body
  if (savedTheme === "dark" || (savedTheme === null && systemPrefersDark)) {
    document.documentElement.classList.add("dark-theme");
    if (document.body) {
      document.body.classList.add("dark-theme");
    }
  } else if (savedTheme === "light") {
    document.documentElement.classList.add("light-theme");
    if (document.body) {
      document.body.classList.add("light-theme");
    }
  }
})();