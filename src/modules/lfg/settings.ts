import {LFGActivity} from "./types";
import * as path from "path";
import {hours, minutes} from "../../helpers/units";
import {EmojiData, EMOJIS} from "../../helpers/constants";

export namespace LFGSettings {

  export const LFGFile = path.join(process.cwd(), 'db', 'lfg.json');
  export const LFG_CREATE_TIMEOUT = 3 * minutes;
  export const LFG_DELETE_MESSAGE_AFTER = 2 * hours;

  export const BILLBOARD_CHANNEL_ID = '745904725983101017';

  export const CHANNEL_TO_NOTIFY_ID = '760757069937639424';
  export const ROLE_TO_NOTIFY_ID = '797393738456236032';
  export const BANNED_ROLE = '942416950259232778';

}

export const LFGEmojis: { [id in LFGActivity]: EmojiData } = {
  [LFGActivity.vog]: EMOJIS.V,
  [LFGActivity.lw]: EMOJIS.L,
  [LFGActivity.garden]: EMOJIS.G,
  [LFGActivity.dsc]: EMOJIS.D,
  [LFGActivity.all]: EMOJIS.S
}

export const LFGAssets: {
  [id in LFGActivity]: {
    color: string,
    name: string,
    icon: string,
    thumbnail: string,
    expiredThumbnail: string
  }
} = {
  [LFGActivity.lw]: {
    name: "Last Wish",
    color: '9400b5',
    icon: "https://cdn.discordapp.com/attachments/782729652526776380/787692092339126322/raid.png",
    thumbnail: 'https://cdn.discordapp.com/attachments/782729652526776380/787734420446642226/last-wish-2.png',
    expiredThumbnail: 'https://cdn.discordapp.com/attachments/610559032943444132/796334747109556224/unknown.png',
  },

  [LFGActivity.garden]: {
    name: 'Garden Of Salvation',
    color: 'fab75f',
    icon: "https://cdn.discordapp.com/attachments/782729652526776380/787692092339126322/raid.png",
    thumbnail: 'https://cdn.discordapp.com/attachments/610559032943444132/795679452687237190/garden.jpg',
    expiredThumbnail: 'https://cdn.discordapp.com/attachments/610559032943444132/796334990018347049/unknown.png',
  },

  [LFGActivity.dsc]: {
    name: "Deep Stone Crypt",
    color: '4287f5',
    icon: "https://cdn.discordapp.com/attachments/782729652526776380/787692092339126322/raid.png",
    thumbnail: 'https://cdn.discordapp.com/attachments/610559032943444132/795679459305848892/dsc.jpg',
    expiredThumbnail: 'https://cdn.discordapp.com/attachments/610559032943444132/796335167513165834/unknown.png',
  },

  [LFGActivity.vog]: {
    name: "Vault Of Glass",
    color: 'c2ebff',
    icon: "https://cdn.discordapp.com/attachments/782729652526776380/787692092339126322/raid.png",
    thumbnail: 'https://media.discordapp.net/attachments/610559032943444132/846394710561914910/vault-of-glass_destiny_bungie.jpg',
    expiredThumbnail: 'https://media.discordapp.net/attachments/610559032943444132/844532583600881695/unknown.png?width=1388&height=850',
  },

  [LFGActivity.all]: {
    name: "Sesiune Raiduri",
    color: 'eb4034',
    icon: "https://cdn.discordapp.com/attachments/782729652526776380/787692092339126322/raid.png",
    thumbnail: 'https://cdn.discordapp.com/attachments/610559032943444132/825479143231324210/sesiune_raid.jpg',
    expiredThumbnail: 'https://cdn.discordapp.com/attachments/610559032943444132/825479317127430224/unknown.png',
  },

}
