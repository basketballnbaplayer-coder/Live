const EMOTE_MAP = {
  poggers: "😲", pog: "😲", pogchamp: "😲",
  lmao: "🤣", lol: "😂", kekw: "😂",
  gg: "🎮", hype: "🔥", sad: "😢", heart: "❤️",
  monkas: "😰", based: "😎", clip: "🎬",
};

/**
 * Splits a chat message into tokens, replacing recognised emote
 * keywords with their emoji, and returns an array of React-renderable
 * pieces (plain strings + emoji spans) ready to render inline.
 */
export function parseEmotes(text) {
  return text.split(/(\s+)/).map((token) => {
    const key = token.toLowerCase().replace(/[^a-z]/g, "");
    if (EMOTE_MAP[key]) {
      return { type: "emote", value: EMOTE_MAP[key], key };
    }
    return { type: "text", value: token };
  });
}

export { EMOTE_MAP };
