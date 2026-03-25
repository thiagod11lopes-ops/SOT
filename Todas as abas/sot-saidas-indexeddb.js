/**
 * SOT Fase 2 — espelho IndexedDB das listas de saídas (cadastro).
 * Não substitui Firestore; persiste cópia local quando localStorage falha ou fica vazio.
 */
(function (global) {
    'use strict';

    var DB_NAME = 'sot_saidas_local_v1';
    var DB_VERSION = 1;
    var STORE = 'kv';
    var KEY_SNAPSHOT = 'cadastro_saidas_snapshot_v1';

    function openDb() {
        return new Promise(function (resolve, reject) {
            if (!global.indexedDB) {
                resolve(null);
                return;
            }
            var req = global.indexedDB.open(DB_NAME, DB_VERSION);
            req.onerror = function () {
                reject(req.error);
            };
            req.onsuccess = function () {
                resolve(req.result);
            };
            req.onupgradeneeded = function (e) {
                var db = e.target.result;
                if (!db.objectStoreNames.contains(STORE)) {
                    db.createObjectStore(STORE, { keyPath: 'key' });
                }
            };
        });
    }

    function putCadastroSnapshot(adm, amb) {
        return openDb().then(function (db) {
            if (!db) return false;
            return new Promise(function (resolve, reject) {
                var tx = db.transaction(STORE, 'readwrite');
                tx.oncomplete = function () {
                    resolve(true);
                };
                tx.onerror = function () {
                    reject(tx.error);
                };
                tx.onabort = function () {
                    reject(tx.error || new Error('abort'));
                };
                tx.objectStore(STORE).put({
                    key: KEY_SNAPSHOT,
                    savedAt: new Date().toISOString(),
                    saidasAdministrativas: Array.isArray(adm) ? adm : [],
                    saidasAmbulancias: Array.isArray(amb) ? amb : []
                });
            });
        });
    }

    function getCadastroSnapshot() {
        return openDb().then(function (db) {
            if (!db) return null;
            return new Promise(function (resolve, reject) {
                var tx = db.transaction(STORE, 'readonly');
                var r = tx.objectStore(STORE).get(KEY_SNAPSHOT);
                r.onsuccess = function () {
                    resolve(r.result || null);
                };
                r.onerror = function () {
                    reject(r.error);
                };
            });
        });
    }

    global.sotSaidasIdb = {
        putCadastroSnapshot: putCadastroSnapshot,
        getCadastroSnapshot: getCadastroSnapshot,
        isAvailable: function () {
            return !!global.indexedDB;
        }
    };
})(typeof window !== 'undefined' ? window : self);
