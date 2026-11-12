'use strict';
/**
 * Workout App Automated Test Harness - Sandboxed DOM Environment
 * Zero-dependency standalone DOM engine, deterministic timers,
 * in-memory storage, mock Capacitor plugins, and Web API mocks.
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Check optional JSDOM availability (zero hard dependency)
let jsdomModule = null;
try {
  jsdomModule = require('jsdom');
} catch (e) {
  jsdomModule = null;
}

/**
 * In-Memory LocalStorage implementation with Proxy wrapper.
 * Supports standard Storage methods AND direct property access (e.g. storage['key']).
 */
class MemoryStorage {
  constructor() {
    this._data = new Map();
  }

  getItem(key) {
    const k = String(key);
    return this._data.has(k) ? this._data.get(k) : null;
  }

  setItem(key, value) {
    this._data.set(String(key), String(value));
  }

  removeItem(key) {
    this._data.delete(String(key));
  }

  clear() {
    this._data.clear();
  }

  key(index) {
    const keys = Array.from(this._data.keys());
    return index >= 0 && index < keys.length ? keys[index] : null;
  }

  get length() {
    return this._data.size;
  }

  static create() {
    const storage = new MemoryStorage();
    return new Proxy(storage, {
      get(target, prop, receiver) {
        if (typeof prop === 'string' && !(prop in target) && typeof target[prop] !== 'function') {
          return target.getItem(prop);
        }
        return Reflect.get(target, prop, receiver);
      },
      set(target, prop, value, receiver) {
        if (typeof prop === 'string' && !(prop in target)) {
          target.setItem(prop, value);
          return true;
        }
        return Reflect.set(target, prop, value, receiver);
      },
      deleteProperty(target, prop) {
        if (typeof prop === 'string' && !(prop in target)) {
          target.removeItem(prop);
          return true;
        }
        return Reflect.deleteProperty(target, prop);
      }
    });
  }
}

/**
 * Deterministic Virtual Clock and Timer Engine.
 * Synchronizes Date.now(), setInterval, setTimeout, and requestAnimationFrame.
 */
class VirtualClock {
  constructor(initialNow = Date.now()) {
    this.now = typeof initialNow === 'number' ? initialNow : new Date(initialNow).getTime();
    this.timers = new Map();
    this.nextId = 1;
    this.rafCallbacks = new Map();
    this.nextRafId = 1;
  }

  setTimeout(cb, delay = 0, ...args) {
    const id = this.nextId++;
    const target = this.now + Math.max(0, +delay || 0);
    this.timers.set(id, { id, cb, args, target, interval: null, isInterval: false });
    return id;
  }

  clearTimeout(id) {
    this.timers.delete(id);
  }

  setInterval(cb, delay = 0, ...args) {
    const id = this.nextId++;
    const step = Math.max(1, +delay || 0);
    this.timers.set(id, { id, cb, args, target: this.now + step, interval: step, isInterval: true });
    return id;
  }

  clearInterval(id) {
    this.timers.delete(id);
  }

  requestAnimationFrame(cb) {
    const id = this.nextRafId++;
    this.rafCallbacks.set(id, cb);
    return id;
  }

  cancelAnimationFrame(id) {
    this.rafCallbacks.delete(id);
  }

  advanceTimers(ms) {
    const targetTime = this.now + Math.max(0, ms);
    let guard = 100000;

    while (guard-- > 0) {
      let earliest = null;
      for (const t of this.timers.values()) {
        if (t.target <= targetTime) {
          if (!earliest || t.target < earliest.target || (t.target === earliest.target && t.id < earliest.id)) {
            earliest = t;
          }
        }
      }

      // Flush RAF if due
      if (this.rafCallbacks.size > 0 && (!earliest || earliest.target > this.now + 16)) {
        if (this.now + 16 <= targetTime) {
          this.now += 16;
          const currentRafs = new Map(this.rafCallbacks);
          this.rafCallbacks.clear();
          for (const cb of currentRafs.values()) {
            try { cb(this.now); } catch (e) { console.error('RAF error:', e); }
          }
          continue;
        }
      }

      if (!earliest) break;

      this.now = earliest.target;
      if (earliest.isInterval) {
        earliest.target = this.now + earliest.interval;
      } else {
        this.timers.delete(earliest.id);
      }

      try {
        earliest.cb(...earliest.args);
      } catch (err) {
        console.error('VirtualClock callback error:', err);
      }
    }

    this.now = targetTime;
  }

  async flush() {
    this.advanceTimers(0);
    await new Promise(resolve => setImmediate(resolve));
  }

  clear() {
    this.timers.clear();
    this.rafCallbacks.clear();
  }
}

function createVirtualDate(clock) {
  const RealDate = Date;
  class VirtualDate extends RealDate {
    constructor(...args) {
      if (args.length === 0) {
        super(clock.now);
      } else {
        super(...args);
      }
    }
    static now() {
      return clock.now;
    }
  }
  return VirtualDate;
}

/**
 * Mock Capacitor Plugins
 */
class MockHaptics {
  constructor() {
    this.calls = [];
    this.simulateFailure = false;
  }
  async vibrate(opts = { duration: 500 }) {
    this.calls.push({ method: 'vibrate', opts, time: Date.now() });
    if (this.simulateFailure) throw new Error('Haptics vibrate failed');
  }
  wasVibrated(duration) {
    return this.calls.some(c => c.method === 'vibrate' && (!duration || c.opts?.duration === duration));
  }
  clear() {
    this.calls = [];
  }
}

class MockLocalNotifications {
  constructor() {
    this.scheduled = [];
    this.history = [];
    this.channels = new Map();
    this.permission = 'granted';
  }
  async checkPermissions() {
    this.history.push({ method: 'checkPermissions' });
    return { display: this.permission };
  }
  async requestPermissions() {
    this.history.push({ method: 'requestPermissions' });
    return { display: this.permission };
  }
  async createChannel(channel) {
    this.channels.set(channel.id, channel);
    this.history.push({ method: 'createChannel', channel });
  }
  async cancel({ notifications }) {
    const ids = (notifications || []).map(n => n.id);
    this.scheduled = this.scheduled.filter(n => !ids.includes(n.id));
    this.history.push({ method: 'cancel', ids });
  }
  async schedule({ notifications }) {
    for (const n of (notifications || [])) {
      this.scheduled.push(n);
    }
    this.history.push({ method: 'schedule', notifications });
  }
  getScheduled(id = 1001) {
    return this.scheduled.find(n => n.id === id) || null;
  }
  clear() {
    this.scheduled = [];
    this.history = [];
    this.channels.clear();
  }
}

class MockFilesystem {
  constructor() {
    this.files = new Map();
    this.history = [];
  }
  async writeFile({ path: filePath, data, directory = 'CACHE', encoding = 'utf8' }) {
    const key = directory + ':' + filePath;
    const uri = 'file:///data/user/0/com.rytov.workout/cache/' + filePath;
    this.files.set(key, { path: filePath, data, directory, encoding, uri });
    this.history.push({ method: 'writeFile', path: filePath, directory, dataLength: (data || '').length });
    return { uri };
  }
  async readFile({ path: filePath, directory = 'CACHE' }) {
    const key = directory + ':' + filePath;
    if (!this.files.has(key)) throw new Error('File not found: ' + filePath);
    return { data: this.files.get(key).data };
  }
  async deleteFile({ path: filePath, directory = 'CACHE' }) {
    const key = directory + ':' + filePath;
    this.files.delete(key);
  }
  getFile(filePath, directory = 'CACHE') {
    const key = directory + ':' + filePath;
    return this.files.get(key)?.data || null;
  }
  clear() {
    this.files.clear();
    this.history = [];
  }
}

class MockShare {
  constructor() {
    this.calls = [];
    this.simulateCancel = false;
  }
  async share(opts) {
    this.calls.push(opts);
    if (this.simulateCancel) throw new Error('Share canceled');
    return { activityType: 'com.android.share' };
  }
  getLastPayload() {
    return this.calls[this.calls.length - 1] || null;
  }
  clear() {
    this.calls = [];
  }
}

class MockCapacitor {
  constructor() {
    this.isNative = false;
    this.Plugins = {
      Haptics: new MockHaptics(),
      LocalNotifications: new MockLocalNotifications(),
      Filesystem: new MockFilesystem(),
      Share: new MockShare()
    };
  }
  isNativePlatform() {
    return this.isNative;
  }
  setNative(flag) {
    this.isNative = !!flag;
  }
  clear() {
    this.Plugins.Haptics.clear();
    this.Plugins.LocalNotifications.clear();
    this.Plugins.Filesystem.clear();
    this.Plugins.Share.clear();
  }
}

/**
 * Web APIs Mocks & Spies
 */
class MockWakeLockSentinel {
  constructor(type = 'screen') {
    this.type = type;
    this.released = false;
    this.listeners = new Map();
  }
  addEventListener(type, cb) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(cb);
  }
  removeEventListener(type, cb) {
    if (this.listeners.has(type)) this.listeners.get(type).delete(cb);
  }
  async release() {
    if (this.released) return;
    this.released = true;
    const cbs = this.listeners.get('release');
    if (cbs) {
      for (const cb of cbs) {
        try { cb(); } catch (e) {}
      }
    }
  }
}

class MockWakeLock {
  constructor() {
    this.sentinels = [];
    this.simulateReject = false;
  }
  async request(type = 'screen') {
    if (this.simulateReject) throw new Error('WakeLock request failed');
    const s = new MockWakeLockSentinel(type);
    this.sentinels.push(s);
    return s;
  }
  isActive() {
    return this.sentinels.some(s => !s.released);
  }
  clear() {
    this.sentinels = [];
  }
}

class MockVibrate {
  constructor() {
    this.calls = [];
  }
  vibrate(pattern) {
    this.calls.push(pattern);
    return true;
  }
  wasVibrated(pattern) {
    return this.calls.some(p => (!pattern || p === pattern));
  }
  clear() {
    this.calls = [];
  }
}

class MockUrlRegistry {
  constructor() {
    this.active = new Map();
    this.created = [];
    this.revoked = [];
    this.counter = 0;
  }
  createObjectURL(blob) {
    const url = 'blob:mock-harness://' + (++this.counter);
    const entry = { url, blob, created: Date.now() };
    this.active.set(url, entry);
    this.created.push(entry);
    return url;
  }
  revokeObjectURL(url) {
    if (this.active.has(url)) {
      this.active.delete(url);
      this.revoked.push({ url, revoked: Date.now() });
    }
  }
  get activeCount() { return this.active.size; }
  hasLeaks() { return this.active.size > 0; }
  clear() {
    this.active.clear();
    this.created = [];
    this.revoked = [];
  }
}

class MockFileReader {
  constructor() {
    this.result = null;
    this.error = null;
    this.readyState = 0;
    this.onload = null;
    this.onerror = null;
  }
  readAsText(file) {
    this.readyState = 1;
    let text = '';
    if (typeof file === 'string') {
      text = file;
    } else if (file && typeof file.text === 'function') {
      file.text().then(t => {
        this.result = t;
        this.readyState = 2;
        if (typeof this.onload === 'function') this.onload({ target: this });
      }).catch(err => {
        this.error = err;
        this.readyState = 2;
        if (typeof this.onerror === 'function') this.onerror({ target: this });
      });
      return;
    } else if (file && (file.data != null || file._content != null || file._text != null)) {
      text = file.data ?? file._content ?? file._text;
    }
    queueMicrotask(() => {
      this.result = text;
      this.readyState = 2;
      if (typeof this.onload === 'function') this.onload({ target: this });
    });
  }
}

class MockConfirm {
  constructor() {
    this.calls = [];
    this.defaultResponse = true;
    this.responseQueue = [];
    this.responseHandler = null;
  }
  confirm(message) {
    this.calls.push({ message, time: Date.now() });
    if (this.responseQueue.length > 0) {
      return this.responseQueue.shift();
    }
    if (typeof this.responseHandler === 'function') {
      return this.responseHandler(message);
    }
    return this.defaultResponse;
  }
  setResponse(bool) { this.defaultResponse = !!bool; }
  queueResponse(...responses) { this.responseQueue.push(...responses); }
  setHandler(fn) { this.responseHandler = fn; }
  clear() {
    this.calls = [];
    this.responseQueue = [];
    this.responseHandler = null;
    this.defaultResponse = true;
  }
}

class MockClipboard {
  constructor() { this.text = ''; }
  async writeText(t) { this.text = String(t); }
  async readText() { return this.text; }
}

/**
 * Lightweight Zero-Dependency Standalone DOM Engine
 */
class Element {
  constructor(tagName, ownerDocument) {
    this.tagName = (tagName || 'div').toUpperCase();
    this.ownerDocument = ownerDocument;
    this.parentElement = null;
    this.children = [];
    this.attributes = Object.create(null);
    this._listeners = Object.create(null);
    this._value = '';
    this.checked = false;
    this.disabled = false;
    this.offsetHeight = 48;
    this.offsetWidth = 120;

    // CSSStyleDeclaration mock
    this.style = {
      _styles: Object.create(null),
      setProperty(k, v) { this._styles[k] = String(v); },
      getPropertyValue(k) { return this._styles[k] || ''; },
      removeProperty(k) { delete this._styles[k]; },
      get cssText() {
        return Object.entries(this._styles).map(([k, v]) => `${k}:${v}`).join(';');
      },
      set cssText(val) {
        this._styles = Object.create(null);
        if (!val) return;
        val.split(';').forEach(pair => {
          const idx = pair.indexOf(':');
          if (idx > 0) this._styles[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim();
        });
      }
    };

    // DOMTokenList classList mock
    const self = this;
    this.classList = {
      add(...cls) {
        const cur = (self.className || '').split(/\s+/).filter(Boolean);
        cls.forEach(c => { if (!cur.includes(c)) cur.push(c); });
        self.className = cur.join(' ');
      },
      remove(...cls) {
        const cur = (self.className || '').split(/\s+/).filter(Boolean);
        self.className = cur.filter(c => !cls.includes(c)).join(' ');
      },
      contains(c) {
        return (self.className || '').split(/\s+/).includes(c);
      },
      toggle(c, force) {
        const has = this.contains(c);
        const shouldHave = force !== undefined ? !!force : !has;
        if (shouldHave && !has) this.add(c);
        else if (!shouldHave && has) this.remove(c);
        return shouldHave;
      }
    };

    // DOMStringMap dataset mock (auto-converts camelCase <-> data-kebab-case)
    this.dataset = new Proxy(this.attributes, {
      get(target, prop) {
        if (typeof prop !== 'string') return undefined;
        const attrKey = 'data-' + prop.replace(/([A-Z])/g, '-$1').toLowerCase();
        return target[attrKey];
      },
      set(target, prop, val) {
        const attrKey = 'data-' + prop.replace(/([A-Z])/g, '-$1').toLowerCase();
        target[attrKey] = String(val);
        return true;
      }
    });
  }

  get id() { return this.attributes.id || ''; }
  set id(v) { this.attributes.id = String(v); }

  get className() { return this.attributes.class || ''; }
  set className(v) { this.attributes.class = String(v); }

  get value() { return this._value !== undefined ? this._value : (this.attributes.value || ''); }
  set value(v) { this._value = String(v); this.attributes.value = String(v); }

  get content() { return this.attributes.content || ''; }
  set content(v) { this.attributes.content = String(v); }

  get type() { return this.attributes.type || ''; }
  set type(v) { this.attributes.type = String(v); }

  get name() { return this.attributes.name || ''; }
  set name(v) { this.attributes.name = String(v); }

  get placeholder() { return this.attributes.placeholder || ''; }
  set placeholder(v) { this.attributes.placeholder = String(v); }

  get readOnly() { return this.hasAttribute('readonly'); }
  set readOnly(v) { if (v) this.setAttribute('readonly', ''); else this.removeAttribute('readonly'); }

  getAttribute(name) {
    const k = name.toLowerCase();
    return this.attributes[k] !== undefined ? this.attributes[k] : null;
  }
  setAttribute(name, val) {
    this.attributes[name.toLowerCase()] = String(val);
  }
  removeAttribute(name) {
    delete this.attributes[name.toLowerCase()];
  }
  hasAttribute(name) {
    return this.attributes[name.toLowerCase()] !== undefined;
  }

  appendChild(child) {
    if (child.parentElement) child.parentElement.removeChild(child);
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx >= 0) {
      this.children.splice(idx, 1);
      child.parentElement = null;
    }
    return child;
  }

  remove() {
    if (this.parentElement) this.parentElement.removeChild(this);
  }

  scrollIntoView() {}
  focus() {}
  blur() {}
  select() {}

  // Mock SVG layout methods
  getBBox() { return { x: 0, y: 0, width: 100, height: 100 }; }
  getComputedTextLength() { return 50; }

  addEventListener(type, listener) {
    if (!this._listeners[type]) this._listeners[type] = [];
    this._listeners[type].push(listener);
  }

  removeEventListener(type, listener) {
    if (!this._listeners[type]) return;
    this._listeners[type] = this._listeners[type].filter(l => l !== listener);
  }

  dispatchEvent(event) {
    event.target = this;
    let cur = this;
    while (cur) {
      const list = cur._listeners[event.type] || [];
      for (const fn of list) {
        fn.call(cur, event);
        if (event._stopped) return;
      }
      cur = cur.parentElement;
    }
    if (this.ownerDocument && this.ownerDocument._listeners) {
      const docList = this.ownerDocument._listeners[event.type] || [];
      for (const fn of docList) {
        fn.call(this.ownerDocument, event);
        if (event._stopped) return;
      }
    }
    if (this.ownerDocument && this.ownerDocument.defaultView && this.ownerDocument.defaultView._listeners) {
      const winList = this.ownerDocument.defaultView._listeners[event.type] || [];
      for (const fn of winList) {
        fn.call(this.ownerDocument.defaultView, event);
        if (event._stopped) return;
      }
    }
  }

  click() {
    this.dispatchEvent({
      type: 'click',
      target: this,
      bubbles: true,
      preventDefault() {},
      stopPropagation() { this._stopped = true; }
    });
  }

  matches(selector) {
    return matchesSelector(this, selector);
  }

  closest(selector) {
    let cur = this;
    while (cur) {
      if (cur.matches && cur.matches(selector)) return cur;
      cur = cur.parentElement;
    }
    return null;
  }

  querySelector(selector) {
    return querySelectorOne(this, selector);
  }

  querySelectorAll(selector) {
    return querySelectorAll(this, selector);
  }

  get textContent() {
    if (this.children.length === 0) return this._text || '';
    return this.children.map(c => c.textContent).join('');
  }
  set textContent(v) {
    this.children = [];
    this._text = String(v);
  }

  get innerHTML() {
    return serializeHTML(this);
  }
  set innerHTML(html) {
    this.children = [];
    this._text = '';
    parseHTMLInto(html, this, this.ownerDocument);
  }
}

/**
 * Fast Selector Matcher & Traversal
 */
function matchesSelector(el, sel) {
  if (!sel || !el || !el.tagName) return false;
  sel = sel.trim();
  if (sel.includes(' ')) {
    const parts = sel.split(/\s+/);
    if (!matchesSelector(el, parts[parts.length - 1])) return false;
    let cur = el.parentElement;
    for (let i = parts.length - 2; i >= 0; i--) {
      let matched = false;
      while (cur) {
        if (matchesSelector(cur, parts[i])) {
          matched = true;
          cur = cur.parentElement;
          break;
        }
        cur = cur.parentElement;
      }
      if (!matched) return false;
    }
    return true;
  }

  const re = /(^[a-zA-Z0-9_-]+)|(#([a-zA-Z0-9_-]+))|(\.([a-zA-Z0-9_-]+))|(\[([a-zA-Z0-9_-]+)(?:([*^$!]?=)(?:\"([^\"]*)\"|'([^']*)'|([^\]]+)))?\])/g;
  let m;
  let matchedSomething = false;
  while ((m = re.exec(sel)) !== null) {
    matchedSomething = true;
    if (m[1]) {
      if (el.tagName !== m[1].toUpperCase()) return false;
    } else if (m[3]) {
      if (el.id !== m[3]) return false;
    } else if (m[5]) {
      if (!el.classList.contains(m[5])) return false;
    } else if (m[7]) {
      const attrName = m[7].toLowerCase();
      const op = m[8];
      const expected = m[9] !== undefined ? m[9] : (m[10] !== undefined ? m[10] : (m[11] !== undefined ? m[11] : null));
      const val = el.getAttribute(attrName);
      if (val === null) return false;
      if (expected !== null) {
        if (op === '=' && val !== expected) return false;
        if (op === '!=' && val === expected) return false;
        if (op === '^=' && !val.startsWith(expected)) return false;
        if (op === '$=' && !val.endsWith(expected)) return false;
        if (op === '*=' && !val.includes(expected)) return false;
      }
    }
  }
  return matchedSomething;
}

function querySelectorOne(root, selector) {
  for (const child of root.children) {
    if (matchesSelector(child, selector)) return child;
    const found = querySelectorOne(child, selector);
    if (found) return found;
  }
  return null;
}

function querySelectorAll(root, selector, acc = []) {
  for (const child of root.children) {
    if (matchesSelector(child, selector)) acc.push(child);
    querySelectorAll(child, selector, acc);
  }
  return acc;
}

function serializeHTML(el) {
  let s = '';
  for (const child of el.children) {
    if (child._isText) {
      s += child._text;
      continue;
    }
    const tag = child.tagName.toLowerCase();
    const attrs = Object.entries(child.attributes).map(([k, v]) => ` ${k}="${String(v).replace(/"/g, '&quot;')}"`).join('');
    s += `<${tag}${attrs}>`;
    if (child.children.length > 0) s += serializeHTML(child);
    else if (child._text) s += child._text;
    const isVoid = ['input', 'meta', 'link', 'br', 'hr', 'img'].includes(tag);
    if (!isVoid) s += `</${tag}>`;
  }
  return s;
}

function parseHTMLInto(html, parentNode, ownerDocument) {
  const stack = [parentNode];
  let cur = parentNode;
  const tagRe = /<(\/?)(\w[\w-]*)([^>]*)>|([^<]+)/g;
  let m;
  while ((m = tagRe.exec(html)) !== null) {
    if (m[4]) {
      const text = m[4];
      if (text.trim().length > 0 || stack.length === 1) {
        const textNode = new Element('#text', ownerDocument);
        textNode._isText = true;
        textNode._text = text;
        cur.appendChild(textNode);
      }
      continue;
    }
    const isClose = m[1] === '/';
    const tagName = m[2].toLowerCase();
    const attrStr = m[3];
    if (isClose) {
      while (stack.length > 1 && stack[stack.length - 1].tagName.toLowerCase() !== tagName) {
        stack.pop();
      }
      if (stack.length > 1) stack.pop();
      cur = stack[stack.length - 1];
    } else {
      const el = new Element(tagName, ownerDocument);
      const attrRe = /([\w-]+)(?:=(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+)))?/g;
      let am;
      while ((am = attrRe.exec(attrStr)) !== null) {
        const attrVal = am[2] !== undefined ? am[2] : (am[3] !== undefined ? am[3] : (am[4] !== undefined ? am[4] : ''));
        el.setAttribute(am[1], attrVal);
      }
      cur.appendChild(el);
      const isVoid = ['input', 'meta', 'link', 'br', 'hr', 'img'].includes(tagName) || attrStr.trim().endsWith('/');
      if (!isVoid) {
        stack.push(el);
        cur = el;
      }
    }
  }
}

class Document {
  constructor() {
    this.documentElement = new Element('html', this);
    this.head = new Element('head', this);
    this.body = new Element('body', this);
    this.documentElement.appendChild(this.head);
    this.documentElement.appendChild(this.body);
    this.visibilityState = 'visible';
    this._listeners = Object.create(null);
    this.defaultView = null;
  }
  createElement(tag) { return new Element(tag, this); }
  getElementById(id) { return this.querySelector('#' + id); }
  querySelector(sel) { return querySelectorOne(this.documentElement, sel); }
  querySelectorAll(sel) { return querySelectorAll(this.documentElement, sel); }
  addEventListener(type, listener) {
    if (!this._listeners[type]) this._listeners[type] = [];
    this._listeners[type].push(listener);
  }
  removeEventListener(type, listener) {
    if (!this._listeners[type]) return;
    this._listeners[type] = this._listeners[type].filter(l => l !== listener);
  }
  dispatchEvent(event) {
    const list = this._listeners[event.type] || [];
    for (const fn of list) fn.call(this, event);
  }
}

/**
 * AppInstance Testing Wrapper
 */
class AppInstance {
  constructor({ context, doc, storage, clock, activeTimers, activeIntervals, mocks }) {
    this.context = context;
    this.document = doc;
    this.window = context.window;
    this.storage = storage;
    this.clock = clock;
    this.activeTimers = activeTimers;
    this.activeIntervals = activeIntervals;
    this.mocks = mocks;
  }

  get state() {
    return this.context.window.__S ? this.context.window.__S() : null;
  }

  setState(newS) {
    if (this.context.window.__setS) {
      this.context.window.__setS(newS);
      if (this.context.window.__save) this.context.window.__save();
      if (this.context.window.__render) this.context.window.__render();
    }
  }

  get ui() {
    return this.context.window.__ui ? this.context.window.__ui() : null;
  }

  query(selector) {
    return this.document.querySelector(selector);
  }

  queryAll(selector) {
    return this.document.querySelectorAll(selector);
  }

  text(selector) {
    const el = this.query(selector);
    return el ? el.textContent.trim() : '';
  }

  val(selector) {
    const el = this.query(selector);
    return el ? el.value : '';
  }

  exists(selector) {
    return !!this.query(selector);
  }

  click(selectorOrEl) {
    const el = typeof selectorOrEl === 'string' ? this.query(selectorOrEl) : selectorOrEl;
    if (!el) throw new Error(`Click target not found: ${selectorOrEl}`);
    el.click();
    return el;
  }

  clickTab(tabName) {
    return this.click(`#tabs button[data-tab="${tabName}"]`);
  }

  clickAct(actName, dataFilter = {}) {
    const selector = `[data-act="${actName}"]`;
    const els = this.queryAll(selector);
    const target = els.find(el => {
      for (const [k, v] of Object.entries(dataFilter)) {
        if (el.dataset[k] !== String(v)) return false;
      }
      return true;
    });
    if (!target) throw new Error(`Action target not found: data-act="${actName}" filter=${JSON.stringify(dataFilter)}`);
    target.click();
    return target;
  }

  fill(selectorOrEl, text) {
    const el = typeof selectorOrEl === 'string' ? this.query(selectorOrEl) : selectorOrEl;
    if (!el) throw new Error(`Fill target not found: ${selectorOrEl}`);
    el.value = String(text);
    el.dispatchEvent({ type: 'input', target: el });
    el.dispatchEvent({ type: 'change', target: el });
    return el;
  }

  check(selectorOrEl, checked = true) {
    const el = typeof selectorOrEl === 'string' ? this.query(selectorOrEl) : selectorOrEl;
    if (!el) throw new Error(`Checkbox target not found: ${selectorOrEl}`);
    el.checked = !!checked;
    el.dispatchEvent({ type: 'change', target: el });
    return el;
  }

  triggerHashChange(hash) {
    this.context.window.location.hash = hash;
    this.context.window.dispatchEvent({ type: 'hashchange' });
  }

  triggerPopState(state = null) {
    this.context.window.dispatchEvent({ type: 'popstate', state });
  }

  triggerVisibilityChange(state = 'visible') {
    this.document.visibilityState = state;
    this.document.dispatchEvent({ type: 'visibilitychange' });
  }

  setConfirm(fnOrBool) {
    if (typeof fnOrBool === 'function') {
      this.mocks.confirm.setHandler(fnOrBool);
    } else {
      this.mocks.confirm.setResponse(!!fnOrBool);
    }
  }

  advanceTimers(ms) {
    this.clock.advanceTimers(ms);
  }

  async flush() {
    await this.clock.flush();
  }

  destroy() {
    this.clock.clear();
    this.activeTimers.forEach(id => global.clearTimeout(id));
    this.activeIntervals.forEach(id => global.clearInterval(id));
    this.activeTimers.clear();
    this.activeIntervals.clear();
    this.mocks.wakeLock.clear();
    this.mocks.haptics.clear();
    this.mocks.localNotifications.clear();
    this.mocks.filesystem.clear();
    this.mocks.share.clear();
    this.mocks.confirm.clear();
    this.mocks.urlRegistry.clear();
  }
}

/**
 * Boots the sandboxed application environment
 */
function createAppInstance(options = {}) {
  const {
    initialData = null,
    initialAutoData = null,
    hash = '',
    search = '',
    isNative = false,
    confirmResult = true,
    initialNow = Date.now()
  } = options;

  const basePath = path.resolve(__dirname, '../../');
  const indexHtmlPath = path.join(basePath, 'www/index.html');
  const appJsPath = path.join(basePath, 'www/app.js');

  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
  const appJs = fs.readFileSync(appJsPath, 'utf8');

  const doc = new Document();

  const headMatch = indexHtml.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  if (headMatch) parseHTMLInto(headMatch[1], doc.head, doc);

  const bodyMatch = indexHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) parseHTMLInto(bodyMatch[1], doc.body, doc);

  const storage = MemoryStorage.create();
  if (initialData !== null) {
    storage.setItem('workout-log-v1', typeof initialData === 'string' ? initialData : JSON.stringify(initialData));
  }
  if (initialAutoData !== null) {
    storage.setItem('workout-log-v1-auto', typeof initialAutoData === 'string' ? initialAutoData : JSON.stringify(initialAutoData));
    storage.setItem('workout-log-v1-auto-at', new Date().toISOString());
  }

  const clock = new VirtualClock(initialNow);
  const VirtualDate = createVirtualDate(clock);

  const activeTimers = new Set();
  const activeIntervals = new Set();

  const capacitor = new MockCapacitor();
  capacitor.setNative(isNative);

  const wakeLock = new MockWakeLock();
  const vibrateSpy = new MockVibrate();
  const urlRegistry = new MockUrlRegistry();
  const confirmMock = new MockConfirm();
  confirmMock.setResponse(confirmResult);
  const clipboard = new MockClipboard();

  const mocks = {
    capacitor,
    haptics: capacitor.Plugins.Haptics,
    localNotifications: capacitor.Plugins.LocalNotifications,
    filesystem: capacitor.Plugins.Filesystem,
    share: capacitor.Plugins.Share,
    wakeLock,
    vibrate: vibrateSpy,
    urlRegistry,
    confirm: confirmMock,
    clipboard
  };

  const sandbox = {
    window: null,
    document: doc,
    localStorage: storage,
    Capacitor: capacitor,
    location: {
      search: search || '',
      hash: hash || '',
      href: 'http://localhost/' + (search || '') + (hash ? '#' + hash : ''),
      pathname: '/',
      hostname: 'localhost'
    },
    history: {
      state: null,
      pushState(state) { this.state = state; },
      back() {
        if (sandbox.window && sandbox.window.dispatchEvent) {
          sandbox.window.dispatchEvent({ type: 'popstate' });
        }
      }
    },
    navigator: {
      storage: { persist: async () => true },
      wakeLock,
      vibrate: vibrateSpy.vibrate.bind(vibrateSpy),
      clipboard,
      userAgent: 'HeadlessTest'
    },
    URL: {
      createObjectURL: urlRegistry.createObjectURL.bind(urlRegistry),
      revokeObjectURL: urlRegistry.revokeObjectURL.bind(urlRegistry)
    },
    URLSearchParams: global.URLSearchParams,
    Date: VirtualDate,
    console: console,

    setTimeout: (fn, delay = 0, ...args) => {
      // Register with deterministic VirtualClock
      const clockId = clock.setTimeout(fn, delay, ...args);
      // For delay <= 0, also unref-trigger via setImmediate for microtask draining
      if (delay <= 0) {
        const imm = setImmediate(() => {
          if (clock.timers.has(clockId)) {
            clock.timers.delete(clockId);
            try { fn(...args); } catch (e) { console.error(e); }
          }
        });
        if (imm.unref) imm.unref();
      }
      return clockId;
    },
    clearTimeout: (id) => {
      clock.clearTimeout(id);
    },
    setInterval: (fn, delay = 0, ...args) => {
      return clock.setInterval(fn, delay, ...args);
    },
    clearInterval: (id) => {
      clock.clearInterval(id);
    },
    requestAnimationFrame: (cb) => clock.requestAnimationFrame(cb),
    cancelAnimationFrame: (id) => clock.cancelAnimationFrame(id),

    confirm: confirmMock.confirm.bind(confirmMock),
    alert: () => {},

    addEventListener(type, listener) {
      if (!this._listeners[type]) this._listeners[type] = [];
      this._listeners[type].push(listener);
    },
    removeEventListener(type, listener) {
      if (this._listeners[type]) {
        this._listeners[type] = this._listeners[type].filter(l => l !== listener);
      }
    },
    dispatchEvent(event) {
      const list = this._listeners[event.type] || [];
      for (const fn of list) fn.call(this, event);
    },
    _listeners: Object.create(null),
    scrollY: 0,
    scrollTo(x, y) { this.scrollY = y; },
    FileReader: MockFileReader,
    Blob: class Blob {
      constructor(parts = [], options = {}) {
        this.parts = parts;
        this.type = options.type || '';
        this.data = parts.join('');
      }
      async text() {
        return this.data;
      }
    }
  };

  sandbox.window = sandbox;
  doc.defaultView = sandbox;

  const context = vm.createContext(sandbox);

  // Early boot theme script from index.html head
  try {
    vm.runInContext(`
      try {
        var __t = JSON.parse(localStorage.getItem("workout-log-v1")).settings.theme;
        if (__t === "chalk") {
          document.documentElement.setAttribute("data-theme", "chalk");
          var __m = document.querySelector('meta[name="theme-color"]');
          if (__m) __m.setAttribute("content", "#170b0e");
        }
      } catch (e) {}
    `, context);
  } catch (e) {}

  // Execute www/app.js and bind state getters
  const injectBridge = `
    \n;window.__S = () => S;
    window.__setS = (v) => { S = v; };
    window.__ui = () => ui;
    window.__save = typeof save === 'function' ? save : null;
    window.__render = typeof render === 'function' ? render : null;
  `;
  vm.runInContext(appJs + injectBridge, context, { filename: 'www/app.js' });

  // Handle initial hash routing if supplied
  if (hash) {
    const tabName = hash.replace(/^#/, '');
    if (['train', 'history', 'progress', 'more'].includes(tabName)) {
      context.window.__ui().tab = tabName;
      if (context.window.__render) context.window.__render();
    }
  }

  return new AppInstance({
    context,
    doc,
    storage,
    clock,
    activeTimers,
    activeIntervals,
    mocks
  });
}

module.exports = {
  createAppInstance,
  MemoryStorage,
  VirtualClock,
  createVirtualDate,
  Element,
  Document,
  MockCapacitor,
  MockHaptics,
  MockLocalNotifications,
  MockFilesystem,
  MockShare,
  MockWakeLock,
  MockVibrate,
  MockUrlRegistry,
  MockFileReader,
  MockConfirm
};
