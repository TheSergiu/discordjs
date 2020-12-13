import 'source-map-support/register';

import * as Discord from 'discord.js'
import {Commands} from "./modules/commands";
import {LfgNotify} from "./modules/lfgNotify";
import {Message, MessageEmbed, TextChannel} from "discord.js";

const client = new Discord.Client();
const token = process.env.DISCORD_TOKEN;
if (!token) {
  throw new Error("DISCORD_TOKEN not set in env vars");
}

;(async () => {
  try {
    await client.login(token);

    new Commands(client);
    new LfgNotify(client);

    client.on('ready', () => {
      console.log('Bot ready!');
    });

    client.channels.fetch('782729652526776380').then(async (channel: TextChannel) => {

      const embed = new MessageEmbed();
      embed.setColor('#00d7ff');

      embed.addField(
        'Activity',
        'Deep Stone Crypt',
        true
      )
      embed.addField(
        'Start time',
        new Date().toISOString(),
        true
      )
      embed.addField(
        'ID',
        (Math.random() * 100) | 0,
        true
      )
      embed.setImage('https://cdn.discordapp.com/attachments/782729652526776380/787694518123757589/Destiny-2-Deep-Stone-Crypt-Raid-Intro.png');
      // embed.setThumbnail('https://media.discordapp.net/attachments/782729652526776380/787692092339126322/raid.png')

      embed.addFields([
        {
          name: 'Participanti',
          value: new Array(6).fill(0).map((_, i) => i < 3 ? Math.random() : '\u200b').join('\n'),
          inline: true
        },
        {
          name: 'Pe langa',
          value: new Array(6).fill(0).map((_, i) => i < 3 ? Math.random() : '\u200b').join('\n'),
          inline: true
        }
      ])

      embed.addFields([
        {
          name: 'Descriere',
          value: `Icing gummies tart. Chocolate gummies fruitcake caramels toffee sugar plum toffee. Liquorice sweet roll croissant. Caramels macaroon brownie chocolate bar marshmallow donut. Tiramisu donut marshmallow cookie. Croissant jelly beans lemon drops toffee. Lollipop gummi bears cake cake carrot cake. Bear claw halvah marzipan. Cake sesame snaps fruitcake. Fruitcake croissant jujubes bear claw. Dessert brownie danish sugar plum pie powder cupcake. Marshmallow cupcake candy canes pastry lemon drops pudding donut jelly icing. Gummies wafer topping pie cupcake gingerbread donut. Sugar plum lollipop chocolate bar donut dragée chupa chups marzipan gingerbread donut.`,
        },
      ])

      embed.setFooter([
        'creeat de @test'
      ], 'https://media.discordapp.net/attachments/782729652526776380/787692092339126322/raid.png')
      embed.setTimestamp(Date.now() + 3600 * 1000);


      embed.setTitle("ORIGINAL")

      const message: Message = await channel.send({
        embed
      });
      await channel.messages.fetch(message.id);

      await message.react(encodeURIComponent('👍'));

      client.on('messageReactionAdd', mr => {
        console.log(mr.emoji);
        console.log(mr.count);
      });


      setInterval(() => {
        const collector = message.createReactionCollector(() => true, {time: 5000 })
        collector.on('end', (collected, reason) => {
          console.log(collected.array(), reason);
        });
      }, 5000)


      const messageID = message.id;

      setTimeout(async () => {

        const fetchedMessage = await channel.messages.fetch(messageID);

        fetchedMessage.embeds[0].setTitle('afkhdjsjkfhdkjshfkjdshfkjdh')

        await fetchedMessage.edit({embed: message.embeds[0]})

      }, 3000);
    })

    client.on('message', args => {
      if (args.content === '!id') {
        args.channel.send({
          content: args.channel.id
        })
      }
    })


  } catch (e) {
    console.error('Fatal!:', e);

    setTimeout(() => process.exit(1), 1000);
  }
})();

