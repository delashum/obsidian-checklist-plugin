import Plugin from 'markdown-it-regexp'

export const highlightPlugin = Plugin(/\=\=([^\=]+)\=\=/, (match: string[], utils: any) => {
  return `<mark>${utils.escape(match[1])}</mark>`
})
