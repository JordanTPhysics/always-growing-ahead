export const THEME_STORAGE_KEY = "aga-theme";

/** Runs before paint so a saved dark theme does not flash the light palette. */
export const themeInitScript = `(function(){try{if(localStorage.getItem("${THEME_STORAGE_KEY}")==="dark")document.documentElement.setAttribute("data-theme","dark");}catch(e){}})();`;
