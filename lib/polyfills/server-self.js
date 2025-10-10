/**
 * Server-side polyfill for 'self' global
 *
 * Some browser-only packages use 'self' which doesn't exist in Node.js.
 * This polyfill maps 'self' to 'global' for server-side compatibility.
 */

if (typeof self === 'undefined') {
  global.self = global;
}
