/**
 * SOT — janela online automática em modo offline (sot_offline_mode).
 *
 * Regras:
 * - Critério de «alteração pendente»: existência de trabalho nas outboxes já usadas pelo SOT
 *   (localStorage): sot_cadastro_saidas_outbox_v1, sot_saidas_adm_outbox_v1, sot_amb_outbox_v1.
 * - Ao aparecer a primeira pendência em modo offline, fixa-se um instante absoluto (deadline) em
 *   localStorage: now + 5 min. Novas alterações antes do fim NÃO reiniciam o relógio.
 * - Ao expirar o prazo: uma única janela online — SOTConnectionMode.performOnlineMergeAndCloudSteps
 *   (merge + SOTSync.sync) — depois restorePersistedOfflineAfterTransient (sem reload).
 * - Corridas: lock em localStorage durante a janela; __SOT_TRANSIENT_AUTO_SYNC evita o handler do toggle.
 * - Mensagens no span #sotOfflineAutoSyncMsg: só com sentido em modo offline persistido; durante a janela
 *   mostra-se «A sincronizar…». Sucesso/erro automáticos: texto fixo durante FEEDBACK_MS (8 s), depois
 *   volta ao estado normal (contagem ou vazio). Documentação UX: 8 s é a duração escolhida para não
 *   competir com a contagem nem permanecer indefinidamente.
 */
(function (global) {
    'use strict';

    var LS_DEADLINE = 'sot_offline_auto_sync_deadline_iso';
    var LS_LOCK = 'sot_offline_auto_sync_exec_lock_v1';
    var WINDOW_MS = 5 * 60 * 1000;
    var FEEDBACK_MS = 8000;
    var LOCK_TTL_MS = 180000;
    var TICK_MS = 1000;

    var CADASTRO_OUTBOX = 'sot_cadastro_saidas_outbox_v1';
    var ADM_OUTBOX = 'sot_saidas_adm_outbox_v1';
    var AMB_OUTBOX = 'sot_amb_outbox_v1';

    var targets = [];
    var tickStarted = false;
    var localInFlight = false;
    var flashUntil = 0;
    var flashText = '';

    function isPersistedOffline() {
        try {
            return localStorage.getItem('sot_offline_mode') === 'true';
        } catch (e) {
            return false;
        }
    }

    function cadastroPending() {
        try {
            var raw = localStorage.getItem(CADASTRO_OUTBOX);
            if (!raw || !String(raw).trim()) return false;
            var p = JSON.parse(raw);
            if (!p || typeof p !== 'object') return false;
            if (p.type === 'replace_collections') return true;
            return true;
        } catch (e) {
            return false;
        }
    }

    function admPending() {
        try {
            var raw = localStorage.getItem(ADM_OUTBOX);
            if (!raw || !String(raw).trim()) return false;
            var a = JSON.parse(raw);
            return Array.isArray(a) && a.length > 0;
        } catch (e) {
            return false;
        }
    }

    function ambPending() {
        try {
            var raw = localStorage.getItem(AMB_OUTBOX);
            if (!raw || !String(raw).trim()) return false;
            var p = JSON.parse(raw);
            return !!(p && typeof p === 'object' && Array.isArray(p.items) && p.items.length > 0);
        } catch (e) {
            return false;
        }
    }

    function hasPendingOutbox() {
        return cadastroPending() || admPending() || ambPending();
    }

    function getDeadlineMs() {
        try {
            var iso = localStorage.getItem(LS_DEADLINE);
            if (!iso) return null;
            var t = new Date(iso).getTime();
            return isNaN(t) ? null : t;
        } catch (e) {
            return null;
        }
    }

    function setDeadlineMs(ms) {
        try {
            localStorage.setItem(LS_DEADLINE, new Date(ms).toISOString());
        } catch (e) {}
    }

    function clearDeadline() {
        try {
            localStorage.removeItem(LS_DEADLINE);
        } catch (e) {}
    }

    function tryAcquireExecLock() {
        var now = Date.now();
        try {
            var raw = localStorage.getItem(LS_LOCK);
            if (raw) {
                var parts = String(raw).split(':');
                var ts = parseInt(parts[1], 10);
                if (!isNaN(ts) && now - ts < LOCK_TTL_MS) return false;
            }
            localStorage.setItem(LS_LOCK, '1:' + now);
            return true;
        } catch (e) {
            return true;
        }
    }

    function releaseExecLock() {
        try {
            localStorage.removeItem(LS_LOCK);
        } catch (e) {}
    }

    function getMsgEls() {
        var out = [];
        for (var i = 0; i < targets.length; i++) {
            var id = targets[i].msgElementId;
            if (!id) continue;
            var el = document.getElementById(id);
            if (el) out.push(el);
        }
        return out;
    }

    function setAllMsgs(text) {
        var els = getMsgEls();
        for (var i = 0; i < els.length; i++) {
            els[i].textContent = text || '';
        }
    }

    function formatRemaining(ms) {
        if (ms <= 0) return '0:00';
        var sec = Math.ceil(ms / 1000);
        var m = Math.floor(sec / 60);
        var s = sec % 60;
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    function audit(event, payload) {
        try {
            if (typeof global.recordUsuarioAudit === 'function') {
                global.recordUsuarioAudit(event, payload);
            }
        } catch (e) {}
    }

    function getRegisteredToggles() {
        var list = [];
        for (var i = 0; i < targets.length; i++) {
            var tid = targets[i].toggleInputId;
            if (!tid) continue;
            var t = document.getElementById(tid);
            if (t && t.type === 'checkbox') list.push(t);
        }
        return list;
    }

    async function runTransientAutoSync() {
        if (!global.SOTConnectionMode || typeof global.SOTConnectionMode.performOnlineMergeAndCloudSteps !== 'function') {
            return;
        }
        if (!tryAcquireExecLock()) return;

        var auditSource = (targets[0] && targets[0].auditSource) || 'sot-offline-scheduled-sync.js';
        var toggles = getRegisteredToggles();

        global.__SOT_TRANSIENT_AUTO_SYNC = true;
        for (var ti = 0; ti < toggles.length; ti++) {
            toggles[ti].disabled = true;
        }

        setAllMsgs('A sincronizar…');

        try {
            await global.SOTConnectionMode.performOnlineMergeAndCloudSteps({ auditSource: auditSource });
            global.SOTConnectionMode.restorePersistedOfflineAfterTransient();
            if (global.SOTSync && typeof global.SOTSync.persistOfflineModeToCloud === 'function') {
                global.SOTSync.persistOfflineModeToCloud();
            }
            for (var ui = 0; ui < toggles.length; ui++) {
                global.SOTConnectionMode.syncToggleFromStorage(toggles[ui]);
            }

            flashUntil = Date.now() + FEEDBACK_MS;
            flashText = 'Última sincronização bem sucedida';
            setAllMsgs(flashText);

            audit('sot_offline_auto_sync_window_ok', { source: auditSource });

            clearDeadline();
            if (hasPendingOutbox()) {
                setDeadlineMs(Date.now() + WINDOW_MS);
            }
        } catch (err) {
            console.error('[sot-offline-scheduled-sync]', err);
            try {
                global.SOTConnectionMode.restorePersistedOfflineAfterTransient();
            } catch (e2) {}
            if (global.SOTSync && typeof global.SOTSync.persistOfflineModeToCloud === 'function') {
                global.SOTSync.persistOfflineModeToCloud();
            }
            for (var uj = 0; uj < toggles.length; uj++) {
                global.SOTConnectionMode.syncToggleFromStorage(toggles[uj]);
            }

            flashUntil = Date.now() + FEEDBACK_MS;
            flashText = 'Erro de sincronização';
            setAllMsgs(flashText);

            audit('sot_offline_auto_sync_window_err', {
                source: auditSource,
                message: err && err.message ? err.message : String(err)
            });

            clearDeadline();
            if (hasPendingOutbox()) {
                setDeadlineMs(Date.now() + WINDOW_MS);
            }
        } finally {
            global.__SOT_TRANSIENT_AUTO_SYNC = false;
            for (var tk = 0; tk < toggles.length; tk++) {
                toggles[tk].disabled = false;
            }
            releaseExecLock();
            try {
                global.dispatchEvent(new CustomEvent('sot-connection-mode-changed'));
            } catch (e3) {}
        }
    }

    function tick() {
        /* Enquanto a janela automática corre, sot_offline_mode fica false — não limpar deadline nem mensagens. */
        if (localInFlight) return;

        var now = Date.now();

        if (!isPersistedOffline()) {
            clearDeadline();
            flashUntil = 0;
            flashText = '';
            setAllMsgs('');
            return;
        }

        var pending = hasPendingOutbox();
        if (!pending) {
            clearDeadline();
            if (now >= flashUntil) {
                flashUntil = 0;
                flashText = '';
                setAllMsgs('');
            }
            return;
        }

        var dl = getDeadlineMs();
        if (dl == null) {
            setDeadlineMs(now + WINDOW_MS);
            dl = getDeadlineMs();
        }

        if (now >= flashUntil) {
            flashUntil = 0;
            flashText = '';
        }

        if (flashUntil > now && flashText) {
            setAllMsgs(flashText);
            return;
        }

        if (dl != null && now >= dl && !localInFlight) {
            localInFlight = true;
            runTransientAutoSync()
                .catch(function (e) {
                    console.error('[sot-offline-scheduled-sync] run', e);
                })
                .finally(function () {
                    localInFlight = false;
                });
            return;
        }

        if (dl != null) {
            setAllMsgs('Sincronização automática em ' + formatRemaining(dl - now));
        }
    }

    function register(cfg) {
        cfg = cfg || {};
        if (!cfg.msgElementId && !cfg.toggleInputId) return;
        targets.push({
            msgElementId: cfg.msgElementId || 'sotOfflineAutoSyncMsg',
            toggleInputId: cfg.toggleInputId,
            auditSource: cfg.auditSource || ''
        });
        if (!tickStarted) {
            tickStarted = true;
            setInterval(tick, TICK_MS);
            global.addEventListener('storage', function (ev) {
                if (!ev) return;
                if (
                    ev.key === LS_DEADLINE ||
                    ev.key === CADASTRO_OUTBOX ||
                    ev.key === ADM_OUTBOX ||
                    ev.key === AMB_OUTBOX ||
                    ev.key === 'sot_offline_mode'
                ) {
                    tick();
                }
            });
        }
        tick();
    }

    function onManualOnline() {
        clearDeadline();
        flashUntil = 0;
        flashText = '';
        setAllMsgs('');
    }

    global.__SOT_TRANSIENT_AUTO_SYNC = global.__SOT_TRANSIENT_AUTO_SYNC || false;
    global.SOTOfflineScheduledSync = {
        register: register,
        onManualOnline: onManualOnline,
        /** Testes / diagnóstico */
        _hasPendingOutbox: hasPendingOutbox,
        _getDeadlineMs: getDeadlineMs
    };
})(typeof window !== 'undefined' ? window : self);
