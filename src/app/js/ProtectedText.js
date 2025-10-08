// ProtectedText.simple.js
// ProtectedText with private constructor and simple factory API.
// Getters: protectedText and originalText return Promise<string>.
// Uses WebCrypto HMAC-SHA256 keystream + XOR, base64url payload, truncated HMAC tag.

const CEP_TOKEN_RE = /^~([A-Za-z0-9\-_]+)~$/;

const base64url = {
  encode: (u8) => {
    let bin = '';
    const chunk = 0x8000;
    for (let i = 0; i < u8.length; i += chunk) {
      bin += String.fromCharCode.apply(null, u8.subarray(i, i + chunk));
    }
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
  decode: (str) => {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    const pad = str.length % 4 ? 4 - (str.length % 4) : 0;
    str += '='.repeat(pad);
    const bin = atob(str);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8;
  }
};

// Base58 encode/decode for Uint8Array <-> string
const Base58 = (() => {
  const ALPH = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const MAP = new Map([...ALPH].map((c, i) => [c, i]));

  function encode(u8) {
    // count leading zeros
    let zeros = 0;
    while (zeros < u8.length && u8[zeros] === 0) zeros++;

    // big integer base conversion: base256 -> base58
    let digits = [];
    for (let i = zeros; i < u8.length; i++) {
      let carry = u8[i];
      for (let j = 0; j < digits.length; j++) {
        const x = (digits[j] << 8) + carry;
        digits[j] = x % 58;
        carry = (x / 58) | 0;
      }
      while (carry) {
        digits.push(carry % 58);
        carry = (carry / 58) | 0;
      }
    }

    // leading zeros become leading '1's
    let out = "1".repeat(zeros);
    for (let i = digits.length - 1; i >= 0; i--) out += ALPH[digits[i]];
    return out;
  }

  function decode(str) {
    // leading '1's are zeros
    let zeros = 0;
    while (zeros < str.length && str[zeros] === "1") zeros++;

    // base58 -> base256
    let bytes = [];
    for (let i = zeros; i < str.length; i++) {
      const val = MAP.get(str[i]);
      if (val === undefined) throw new Error("Invalid Base58 char");
      let carry = val;
      for (let j = 0; j < bytes.length; j++) {
        const x = bytes[j] * 58 + carry;
        bytes[j] = x & 0xff;
        carry = x >> 8;
      }
      while (carry) {
        bytes.push(carry & 0xff);
        carry >>= 8;
      }
    }

    // add back leading zeros and reverse to big-endian
    const out = new Uint8Array(zeros + bytes.length);
    for (let i = 0; i < zeros; i++) out[i] = 0;
    for (let i = 0; i < bytes.length; i++) out[out.length - 1 - i] = bytes[i];
    return out;
  }

  return { encode, decode };
})();

const enc = (s) => new TextEncoder().encode(s);
const decText = (u8) => new TextDecoder().decode(u8);

// --- WebCrypto helpers ---
async function importHmacKeyRaw(passphrase) {
  return crypto.subtle.importKey('raw', enc(passphrase), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}
async function hmacRawWithKey(cryptoKey, dataU8) {
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, dataU8);
  return new Uint8Array(sig);
}
async function hmacBytes(passphrase, msgU8) {
  const key = await importHmacKeyRaw(passphrase);
  return hmacRawWithKey(key, msgU8);
}

// Deterministic keystream: HMAC(passphrase, counter) blocks concatenated
async function keystreamFromPassphrase(passphrase, totalBytes) {
  const key = await importHmacKeyRaw(passphrase);
  const blocks = Math.ceil(totalBytes / 32);
  const ks = new Uint8Array(blocks * 32);
  for (let i = 0; i < blocks; i++) {
    const ctr = new ArrayBuffer(4);
    new DataView(ctr).setUint32(0, i, false);
    const block = await hmacRawWithKey(key, new Uint8Array(ctr));
    ks.set(block, i * 32);
  }
  return ks.subarray(0, totalBytes);
}

// Truncated tag for integrity: HMAC(passphrase + domainSep, ciphertext)[:tagBytes]
async function computeTag(passphrase, ciphertextU8, tagBytes) {
  const key = await importHmacKeyRaw(passphrase + '\u0001');
  const full = await hmacRawWithKey(key, ciphertextU8);
  return full.subarray(0, tagBytes);
}

// Encrypt plaintext -> "CEP~<base64url(payload)>~"
async function encryptToCep(plaintext, passphrase, tagBytes = 6) {
  const ptU8 = enc(plaintext);
  const ks = await keystreamFromPassphrase(passphrase, ptU8.length);
  const ct = new Uint8Array(ptU8.length);
  for (let i = 0; i < ptU8.length; i++) ct[i] = ptU8[i] ^ ks[i];

  let payloadU8;
  if (tagBytes > 0) {
    const tag = await computeTag(passphrase, ct, tagBytes);
    payloadU8 = new Uint8Array(ct.length + tag.length);
    payloadU8.set(ct, 0);
    payloadU8.set(tag, ct.length);
  } else {
    payloadU8 = ct;
  }

  //return `~${base64url.encode(payloadU8)}~`;
  return `~${Base58.encode(payloadU8)}~`;
}

// Decrypt token -> plaintext (throws on bad format or integrity failure)
async function decryptFromCep(token, passphrase, tagBytes = 6) {
  //const m = CEP_TOKEN_RE.exec(token);
  //if (!m) throw new Error('Invalid CEP token format');
  //trim the surrounding ~
  token = token.replace(/^~+|~+$/g, '');
  const payloadU8 = Base58.decode(token);

  if (tagBytes > 0) {
    if (payloadU8.length < tagBytes) throw new Error('Invalid payload (too short)');
    const ct = payloadU8.subarray(0, payloadU8.length - tagBytes);
    const tag = payloadU8.subarray(payloadU8.length - tagBytes);
    const expected = await computeTag(passphrase, ct, tagBytes);
    if (expected.length !== tag.length) throw new Error('Integrity failure');
    let diff = 0;
    for (let i = 0; i < tag.length; i++) diff |= (expected[i] ^ tag[i]);
    if (diff !== 0) throw new Error('Wrong passphrase or corrupted snippet');

    const ks = await keystreamFromPassphrase(passphrase, ct.length);
    const pt = new Uint8Array(ct.length);
    for (let i = 0; i < ct.length; i++) pt[i] = ct[i] ^ ks[i];
    return decText(pt);
  } else {
    const ct = payloadU8;
    const ks = await keystreamFromPassphrase(passphrase, ct.length);
    const pt = new Uint8Array(ct.length);
    for (let i = 0; i < ct.length; i++) pt[i] = ct[i] ^ ks[i];
    return decText(pt);
  }
}

// ---------------- ProtectedText class ----------------
class ProtectedText {
  static #PRIVATE = Symbol('ProtectedTextPrivate');

  // internal fields:
  // _protectedToken: string | null
  // _originalPlain: string | null
  // _passphrase: string | null
  // _tagBytes: number

  constructor(secret, protectedToken = null, originalPlain = null, passphrase = null, tagBytes = 6) {
    if (secret !== ProtectedText.#PRIVATE) throw new Error('Private constructor. Use the factory methods.');
    this._protectedToken = protectedToken;
    this._originalPlain = originalPlain;
    this._passphrase = passphrase;
    this._tagBytes = (typeof tagBytes === 'number' ? tagBytes : 6);
    // caches for pending promises to avoid parallel duplicate work
    this._pendingProtected = null;
    this._pendingOriginal = null;
  }

  // ---------------- factories ----------------

  // Create from plaintext. passphrase required.
  static async fromPlain(plaintext, passphrase, options = {}) {
    if (typeof passphrase !== 'string') throw new Error('Passphrase (string) required to encrypt plaintext.');
    const tagBytes = options.tagBytes === undefined ? 6 : options.tagBytes;
    // we don't need to pre-encrypt here; keep as lazy but also create candidate protected immediately
    const inst = new ProtectedText(ProtectedText.#PRIVATE, null, plaintext, passphrase, tagBytes);
    return inst;
  }

  // Create from protected token. passphrase is REQUIRED if you want originalText getter to work.
  // If passphrase omitted, originalText will reject when accessed until setPassphrase is called.
  static async fromProtected(token, passphrase = null, options = {}) {
    if (!CEP_TOKEN_RE.test(token)) throw new Error('Invalid CEP token format');
    const tagBytes = options.tagBytes === undefined ? 6 : options.tagBytes;
    return new ProtectedText(ProtectedText.#PRIVATE, token, null, passphrase, tagBytes);
  }

  // ---------------- simple mutator ----------------
  // Set or replace passphrase later (useful if you created from token without passphrase)
  setPassphrase(passphrase) {
    if (typeof passphrase !== 'string') throw new Error('Passphrase must be string');
    this._passphrase = passphrase;
    // clear pending caches when passphrase changes
    this._pendingOriginal = null;
    this._pendingProtected = null;
  }

  // ---------------- getters (return Promise<string>) ----------------

  // Return protected token ("CEP~...~"). If created from plaintext, will lazily encrypt (and cache).
  get protectedText() {
    // return a Promise<string>
    if (this._protectedToken) return Promise.resolve(this._protectedToken);
    if (this._pendingProtected) return this._pendingProtected;

    if (this._originalPlain == null) {
      return Promise.reject(new Error('No plaintext available to produce protectedText.'));
    }
    if (typeof this._passphrase !== 'string') {
      return Promise.reject(new Error('Passphrase required to produce protectedText.'));
    }

    this._pendingProtected = (async () => {
      try {
        const token = await encryptToCep(this._originalPlain, this._passphrase, this._tagBytes);
        this._protectedToken = token;
        this._pendingProtected = null;
        return token;
      } catch (e) {
        this._pendingProtected = null;
        throw e;
      }
    })();
    return this._pendingProtected;
  }

  // Return original plaintext. If created from token, will lazily decrypt (and cache).
  get originalText() {
    if (this._originalPlain !== null) return Promise.resolve(this._originalPlain);
    if (this._pendingOriginal) return this._pendingOriginal;

    if (!this._protectedToken) return Promise.reject(new Error('No protected token available to decrypt.'));
    if (typeof this._passphrase !== 'string') return Promise.reject(new Error('Passphrase required to decrypt.'));

    this._pendingOriginal = (async () => {
      try {
        const plain = await decryptFromCep(this._protectedToken, this._passphrase, this._tagBytes);
        this._originalPlain = plain;
        this._pendingOriginal = null;
        return plain;
      } catch (e) {
        this._pendingOriginal = null;
        throw e;
      }
    })();

    return this._pendingOriginal;
  }

  // String representation: returns protected token if present or a promise rejection if not available yet.
  toString() {
    return this._protectedToken ?? '[ProtectedText: no token yet]';
  }

  // Convenience static helpers (ad-hoc)
  static async encrypt(plaintext, passphrase, options = {}) {
    const tagBytes = options.tagBytes === undefined ? 6 : options.tagBytes;
    return encryptToCep(plaintext, passphrase, tagBytes);
  }
  static async decrypt(protectedToken, passphrase, options = {}) {
    const tagBytes = options.tagBytes === undefined ? 6 : options.tagBytes;
    return decryptFromCep(protectedToken, passphrase, tagBytes);
  }
}

