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
  },
  'white_check_mark': {
    name: 'white_check_mark',
    text: '<:white_check_mark:795679733462859836>',
    unicode: '✅'
  },
  'x': {
    name: 'x',
    text: '<:x:795679733462859836>',
    unicode: '❌'
  },
  'question': {
    name: 'question',
    text: '<:question:795679733462859836>',
    unicode: '❓'
  },
  'thumbsup': {
    name: 'thumbsup',
    text: '<:thumbsup:795679733462859836>',
    unicode: '👍'
  },
  'ballot_box_with_check': {
    name: 'ballot_box_with_check',
    text: '<:ballot_box_with_check:795679733462859836>',
    unicode: '☑'
  },
  'new': {
    name: 'new',
    text: '<:new:795693091952263168>',
    unicode: '🆕'
  },
  'baby': {
    name: 'baby',
    text: '<:baby:795693611827462194>',
    unicode: '👶'
  },
  'baby_bottle': {
    name: 'baby_bottle',
    text: '<:baby_bottle:795693365819342869>',
    unicode: '🍼'
  },
  'crown': {
    name: 'crown',
    text: '<:crown:796365790907465748>',
    unicode: '👑'
  }

}

export const timeFormatRegex = /(\d{1,2}):(\d{2}) *(?:(\d{1,2})\/(\d{1,2}))?/i;