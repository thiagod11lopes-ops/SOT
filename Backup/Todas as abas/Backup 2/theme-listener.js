(function () {
  const THEME_ID_KEY = 'sot_theme_id';
  const THEME_VARS_KEY = 'sot_theme_variables';

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
