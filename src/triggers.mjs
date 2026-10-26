// Shared trigger vocabulary: closing / pause / resume / idle / turn policy.
export const IDLE_MS = 15 * 60 * 1000;
export const ROTATE_TURNS = 60;

const CLOSING = /^(晚安|明天见|先睡了|睡了|再见|先这样|先聊到这|我去忙|回头说|下了|拜拜|886|我走了|不聊了|关机|关电脑)/;
const CLOSING_ANY = /(辛苦你了|完工|收工|落库|今天到这儿|今天先到这|先到这)/;
const PAUSE_ALL = /(暂停记忆|先别记|暂时别记|先不记|停止记录|别记了|先停一停记忆|等一下再记|先缓缓记忆)/;
const PAUSE_AUTOSETTLE = /(暂停收尾|先别收尾|先别落库|晚点再收|先别settle|先别落库)/i;
const RESUME = /(继续记忆|接着记|恢复记录|可以记了|继续收录|恢复记忆)/;

export function isClosing(text) {
  const t = String(text || '').trim();
  return t.length <= 40 && (CLOSING.test(t) || CLOSING_ANY.test(t));
}
export function isSleepClosing(text) {
  return /(晚安|明天见|先睡了|睡了)/.test(String(text || ''));
}
// Returns {type:'pause-all'|'pause-autosettle'|'resume'} or null.
export function parseCommand(text) {
  const t = String(text || '').trim();
  if (PAUSE_ALL.test(t)) return { type: 'pause-all', text: t };
  if (PAUSE_AUTOSETTLE.test(t)) return { type: 'pause-autosettle', text: t };
  if (RESUME.test(t)) return { type: 'resume', text: t };
  return null;
}
