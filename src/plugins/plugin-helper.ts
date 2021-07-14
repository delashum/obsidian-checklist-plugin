import type MD from "markdown-it"

const escape = (html: string) =>
  String(html)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")

const utils = {
  escape,
}

let counter = 0

/**
 * Constructor function
 */

export const regexPlugin = (
  regexp: RegExp,
  replacer: (match: string[], utils: { escape: (html: string) => string }) => string
) => {
  const flags = (regexp.global ? "g" : "") + (regexp.multiline ? "m" : "") + (regexp.ignoreCase ? "i" : "")
  const _regexp = RegExp("^" + regexp.source, flags)
  const id = "regexp-" + counter++

  return (md: MD) => {
    console.log(md)
    md.inline.ruler.push(id, (state, silent) => {
      var match = _regexp.exec(state.src.slice(state.pos))
      if (!match) return false

      // valid match found, now we need to advance cursor
      state.pos += match[0].length

      // don't insert any tokens in silent mode
      if (silent) return true

      var token = state.push(id, "", 0)
      token.meta = { match: match }
      return true
    })
    md.renderer.rules[id] = (tokens: any, idx: number) => {
      return replacer(tokens[idx].meta.match, utils)
    }
  }
}
