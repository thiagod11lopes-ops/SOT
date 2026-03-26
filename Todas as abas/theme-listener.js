(function () {
  try {
    if (typeof window !== 'undefined' && window.top !== window.self) {
      document.documentElement.classList.add('sot-in-iframe');
    }
  } catch (e) {
    /* cross-origin */
  }

  const THEME_ID_KEY = 'sot_theme_id';
  const THEME_VARS_KEY = 'sot_theme_variables';

  /** Tema “Old Radar” (CRT): partilhado com Configurações. Efeitos visuais só com body[data-theme="oldRadar"]. */
  var __SOT_OLD_RADAR_PROPS = {
    '--primary-blue': '#00FF41',
    '--secondary-blue': '#39FF14',
    '--gray': 'rgba(0,255,65,0.35)',
    '--dark-gray': '#00FF41',
    '--white': '#000000',
    '--light-gray-bg': '#000000',
    '--tab-border': '1px solid #00FF41',
    '--success-green': '#39FF14',
    '--warning-orange': '#39FF14',
    '--error-red': '#39FF14',
    '--tab-text-color': '#00FF41',
    '--tab-text-color-active': '#39FF14',
    '--tab-text-color-hover': '#39FF14',
    '--tab-bg-inactive': '#000000',
    '--tab-bg-active': '#000000',
    '--tab-hover-bg': '#0a140a',
    '--tab-border-color': '#00FF41',
    '--tab-border-color-active': '#39FF14',
    '--tab-inactive-bg': '#000000',
    '--tab-active-bg': '#000000',
    '--delete-red': '#39FF14',
    '--blink-red': '#39FF14',
    '--export-excel': '#39FF14',
    '--import-blue': '#00FF41',
    '--modal-overlay': 'rgba(0,0,0,0.88)',
    '--modal-bg': '#000000',
    '--modal-radius': '0',
    '--modal-shadow': '0 0 28px rgba(0,255,65,0.22)'
  };
  try {
    window.__SOT_THEME_OLD_RADAR_PROPERTIES = __SOT_OLD_RADAR_PROPS;
  } catch (e) {}

  function injectOldRadarStylesheet() {
    if (typeof document === 'undefined' || !document.head) return;
    if (document.getElementById('sot-theme-old-radar-css')) return;
    try {
      var scr = document.currentScript;
      var base = '';
      if (scr && scr.src) {
        base = scr.src.replace(/[^/]+$/, '');
      } else {
        base = '';
      }
      var link = document.createElement('link');
      link.id = 'sot-theme-old-radar-css';
      link.rel = 'stylesheet';
      link.href = base + 'sot-theme-old-radar.css';
      document.head.appendChild(link);
    } catch (err) {
      console.warn('SOT: não foi possível carregar sot-theme-old-radar.css', err);
    }
  }

  injectOldRadarStylesheet();

  function getStoredTheme() {
    const id = safeGet(THEME_ID_KEY);
    const vars = safeParseVars(safeGet(THEME_VARS_KEY));
    return { id, vars };
  }

  function safeGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      console.warn('Não foi possível acessar o localStorage:', error);
      return null;
    }
  }

  function safeSet(key, value) {
    try {
      if (value === undefined) {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, value);
      }
    } catch (error) {
      console.warn('Falha ao salvar preferências do tema:', error);
    }
  }

  function safeParseVars(value) {
    if (!value) return null;
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (error) {
      console.warn('Tema armazenado inválido:', error);
      return null;
    }
  }

  function applyThemeVariables(targetDocument, vars) {
    if (!targetDocument || !vars) return;
    const root = targetDocument.documentElement;
    Object.entries(vars).forEach(([key, value]) => {
      if (typeof key === 'string' && key.startsWith('--')) {
        root.style.setProperty(key, value);
      }
    });
  }

  function setThemeOnBody(themeId) {
    if (!document.body) return;
    if (themeId) {
      document.body.dataset.theme = themeId;
    } else {
      delete document.body.dataset.theme;
    }
  }

  function applyTheme(themeId, vars) {
    if (!vars) {
      const stored = getStoredTheme();
      vars = stored.vars;
      themeId = themeId || stored.id;
    }
    if (!vars) return;
    applyThemeVariables(document, vars);
    setThemeOnBody(themeId || '');
  }

  function setupClassObserver() {
    const observer = new MutationObserver((mutations) => {
      let needsUpdate = false;
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          needsUpdate = true;
          break;
        }
      }
      if (needsUpdate) {
        const stored = getStoredTheme();
        if (stored.vars) {
          applyThemeVariables(document, stored.vars);
        }
      }
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'], subtree: true });
  }

  function handleIncomingTheme(themeId, vars) {
    if (themeId) {
      safeSet(THEME_ID_KEY, themeId);
    }
    if (vars) {
      safeSet(THEME_VARS_KEY, JSON.stringify(vars));
    }
    applyTheme(themeId, vars);
  }

  // Aplicar tema salvo assim que possível
  applyTheme();
  setupClassObserver();

  // Ouvir mensagens do SOT5 ou de outros iframes
  window.addEventListener('message', (event) => {
    if (event?.data?.type === 'apply_theme') {
      const { themeId, themeVariables } = event.data;
      handleIncomingTheme(themeId, themeVariables);
    }
  });

  // Garantir aplicação após DOM completo, se necessário
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => applyTheme());
  }
})();
