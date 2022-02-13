"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LFGAssets = exports.LFGEmojis = exports.LFGSettings = void 0;
const types_1 = require("./types");
const path = require("path");
const units_1 = require("../../helpers/units");
const constants_1 = require("../../helpers/constants");
var LFGSettings;
(function (LFGSettings) {
    LFGSettings.LFGFile = path.join(process.cwd(), 'db', 'lfg.json');
    LFGSettings.LFG_CREATE_TIMEOUT = 3 * units_1.minutes;
    LFGSettings.LFG_DELETE_MESSAGE_AFTER = 2 * units_1.hours;
    LFGSettings.BILLBOARD_CHANNEL_ID = '610757541831507998';
    LFGSettings.CHANNEL_TO_NOTIFY_ID = '610559032943444132';
    LFGSettings.ROLE_TO_NOTIFY_ID = '782730784099401749';
    LFGSettings.BANNED_ROLE = '942392516932698182';
})(LFGSettings = exports.LFGSettings || (exports.LFGSettings = {}));
exports.LFGEmojis = {
    [types_1.LFGActivity.vog]: constants_1.EMOJIS.V,
    [types_1.LFGActivity.lw]: constants_1.EMOJIS.L,
    [types_1.LFGActivity.garden]: constants_1.EMOJIS.G,
    [types_1.LFGActivity.dsc]: constants_1.EMOJIS.D,
    [types_1.LFGActivity.all]: constants_1.EMOJIS.S
};
exports.LFGAssets = {
    [types_1.LFGActivity.lw]: {
        name: "Last Wish",
        color: '9400b5',
        icon: "https://cdn.discordapp.com/attachments/782729652526776380/787692092339126322/raid.png",
        thumbnail: 'https://cdn.discordapp.com/attachments/782729652526776380/787734420446642226/last-wish-2.png',
        expiredThumbnail: 'https://cdn.discordapp.com/attachments/610559032943444132/796334747109556224/unknown.png',
    },
    [types_1.LFGActivity.garden]: {
        name: 'Garden Of Salvation',
        color: 'fab75f',
        icon: "https://cdn.discordapp.com/attachments/782729652526776380/787692092339126322/raid.png",
        thumbnail: 'https://cdn.discordapp.com/attachments/610559032943444132/795679452687237190/garden.jpg',
        expiredThumbnail: 'https://cdn.discordapp.com/attachments/610559032943444132/796334990018347049/unknown.png',
    },
    [types_1.LFGActivity.dsc]: {
        name: "Deep Stone Crypt",
        color: '4287f5',
        icon: "https://cdn.discordapp.com/attachments/782729652526776380/787692092339126322/raid.png",
        thumbnail: 'https://cdn.discordapp.com/attachments/610559032943444132/795679459305848892/dsc.jpg',
        expiredThumbnail: 'https://cdn.discordapp.com/attachments/610559032943444132/796335167513165834/unknown.png',
    },
    [types_1.LFGActivity.vog]: {
        name: "Vault Of Glass",
        color: 'c2ebff',
        icon: "https://cdn.discordapp.com/attachments/782729652526776380/787692092339126322/raid.png",
        thumbnail: 'https://media.discordapp.net/attachments/610559032943444132/846394710561914910/vault-of-glass_destiny_bungie.jpg',
        expiredThumbnail: 'https://media.discordapp.net/attachments/610559032943444132/844532583600881695/unknown.png?width=1388&height=850',
    },
    [types_1.LFGActivity.all]: {
        name: "Sesiune Raiduri",
        color: 'eb4034',
        icon: "https://cdn.discordapp.com/attachments/782729652526776380/787692092339126322/raid.png",
        thumbnail: 'https://cdn.discordapp.com/attachments/610559032943444132/825479143231324210/sesiune_raid.jpg',
        expiredThumbnail: 'https://cdn.discordapp.com/attachments/610559032943444132/825479317127430224/unknown.png',
    },
};
//# sourceMappingURL=settings.js.map