import {LFGActivity} from "./types";
import * as path from "path";

export namespace LFGSettings {

  export const LFGFile = path.join(process.cwd(), 'db', 'lfg.json');
  export const LFG_CREATE_TIMEOUT = 3 * 60 * 1000;

  export const BILLBOARD_CHANNEL_ID = '778978593278787654';

  export const CHANNEL_TO_NOTIFY_ID = '752207983139618890';
  export const ROLE_TO_NOTIFY_ID = '779375402816634952';

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
    expiredThumbnail: 'https://cdn.discordapp.com/attachments/610559032943444132/796334747109556224/unknown.png'
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
    expiredThumbnail: 'https://cdn.discordapp.com/attachments/610559032943444132/796335167513165834/unknown.png'
  },
}