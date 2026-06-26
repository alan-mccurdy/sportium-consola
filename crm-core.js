(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) { module.exports = factory(); }
  else { root.CRM = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var KEY_FIELDS = ['usuario', 'cedula', 'correo'];

  function stripAccents(s) {
    s = s.normalize('NFD');
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c >= 0x300 && c <= 0x36f) continue; // saltar marcas diacriticas combinantes
      out += s.charAt(i);
    }
    return out;
  }

  function normalizeKey(v) {
    if (v == null) return '';
    return stripAccents(String(v)).toLowerCase().replace(/\s+/g, '').trim();
  }

  function detectHeaders(rows) {
    return (rows && rows.length) ? Object.keys(rows[0]) : [];
  }

  function applyMapping(rows, mapping) {
    return (rows || []).map(function (row) {
      var keys = {}, fields = {};
      Object.keys(mapping || {}).forEach(function (canon) {
        var header = mapping[canon];
        if (!header) return;
        var raw = row[header];
        var val = (raw != null) ? String(raw).trim() : undefined;
        if (KEY_FIELDS.indexOf(canon) >= 0) keys[canon] = val;
        else fields[canon] = val;
      });
      return { keys: keys, fields: fields };
    });
  }

  function clientKeyset(client) {
    var keys = (client && client.keys) || {};
    return KEY_FIELDS.map(function (k) { return normalizeKey(keys[k]); }).filter(Boolean);
  }

  function cloneClient(c) {
    return { keys: Object.assign({}, c.keys), fields: Object.assign({}, c.fields), prov: Object.assign({}, c.prov) };
  }

  function mergeRecords(store, records, sourceLabel) {
    var out = (store || []).map(cloneClient);
    (records || []).forEach(function (rec) {
      var recKeys = clientKeyset(rec);
      var client = null;
      for (var i = 0; i < out.length; i++) {
        var existing = clientKeyset(out[i]);
        if (existing.some(function (k) { return recKeys.indexOf(k) >= 0; })) { client = out[i]; break; }
      }
      if (!client) { client = { keys: {}, fields: {}, prov: {} }; out.push(client); }
      KEY_FIELDS.forEach(function (k) {
        if (rec.keys && rec.keys[k] && !client.keys[k]) client.keys[k] = rec.keys[k];
      });
      Object.keys(rec.fields || {}).forEach(function (f) {
        var v = rec.fields[f];
        if (v != null && v !== '') { client.fields[f] = v; client.prov[f] = sourceLabel; }
      });
    });
    return out;
  }

  function searchStore(store, text) {
    var q = normalizeKey(text);
    if (!q) return [];
    return (store || []).filter(function (c) {
      var hay = clientKeyset(c);
      var nombre = normalizeKey(c.fields && c.fields.nombre);
      if (nombre) hay = hay.concat(nombre);
      return hay.some(function (h) { return h.indexOf(q) >= 0; });
    });
  }

  function getClient(store, key) {
    var q = normalizeKey(key);
    if (!q) return null;
    var found = (store || []).filter(function (c) { return clientKeyset(c).indexOf(q) >= 0; });
    return found.length ? found[0] : null;
  }

  return {
    KEY_FIELDS: KEY_FIELDS,
    normalizeKey: normalizeKey,
    detectHeaders: detectHeaders,
    applyMapping: applyMapping,
    clientKeyset: clientKeyset,
    mergeRecords: mergeRecords,
    searchStore: searchStore,
    getClient: getClient
  };
});
