import {Emoji} from "discord.js";

export const EMPTY_SPACE = '\u200b';

export const EMOJIS = {
  D: {
    name: 'regional_indicator_d',
    text: '<:regional_indicator_d:791692525152239657>',
    unicode: '🇩'
  },
  G: {
    name: 'regional_indicator_g',
    text: '<:regional_indicator_g:791682714696024066>',
    unicode: '🇬'
  },
  L: {
    name: 'regional_indicator_l',
    text: '<:regional_indicator_l:791682736578363403>',
    unicode: '🇱'
  }
}

export const timeFormatRegex = /(\d{1,2}):(\d{2}) *(?:(\d{1,2})\/(\d{1,2}))?/i;