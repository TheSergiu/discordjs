// Import the discord.js module
const Discord = require('discord.js');
const fs = require('fs');
//const random = require("random-js")//(); // uses the nativeMath engine

// Create an instance of a Discord client
/*const intentii = new Intents([
    Intents.NON_PRIVILEGED, // include all non-privileged intents, would be better to specify which ones you actually need
    "GUILD_MEMBERS", // lets you request guild members (i.e. fixes the issue)
]);*/
// Create an instance of a Discord client
const client = new Discord.Client();
//const client = new Client({ ws: { intentii } });

// The token of your bot - https://discordapp.com/developers/applications/me
const token = 'Nzc5NDYxMTE4MDI3NzU5NjQ2.X7g3vA.yMcIPYHR9aVvcPAz576iApbvZj8';//bot d2ro
//const token = 'NzgxNTk0MTE1MjEyODM2ODY1.X7_6Pg.KTL-01HHvJRANNy6x0nPix1Hg0I';
// The ready event is vital, it means that your bot will only start reacting to information
// from Discord _after_ ready is emitted
client.on('ready', () => {
    console.log('I am ready!');
    // Remove new lines when starting the bot.
	 
    fs.readFile('./commands/commands.txt', 'utf8', function (err, f) {
        f = f.replace(/(\r\n|\n|\r)/gm, "");
        fs.writeFile('./commands/commands.txt', f, "", function (err) {
            if (err) {
                console.log(err);
            }
        });
    });
});

// Create an event listener for messages
/*client.on('messageUpdate', (oldMessage, newMessage) => {
	console.log('newMessage');
	console.log(newMessage.content);
	console.log('oldMessage');
	console.log(oldMessage.content);
		if (newMessage.author.bot === true) {
				console.log('botul a modificat');
				// trimitere notificare in canalul de general in momentul in care se organizeaza o activitate cu botul de LFG
				const regexString = /LFG Post: ([0-9]+) created/;
				if(newMessage.channel.name === 'lfg-requests'){//🔋bot-commands
				console.log('canalul mod corect');
					if(newMessage.content.match(regexString)!== null){ //LFG Post: 3487 created.
					console.log('mesajul mod corect, scrie in general');
						const canal = client.channels.cache.find(channel => channel.name === '📝general');
						canal.send('@here S-a creat o noua organizare, verificati canalul #🎲organizari');
					}
				}
			}
});*/


client.on('message', message => {
    if (message.author.bot === true) {
		console.log('botul a postat')
        // trimitere notificare in canalul de general in momentul in care se organizeaza o activitate cu botul de LFG lfg-events
		
		if(message.channel.name === '🔋bot-commands'){//🔋bot-commands
			const regexString = /LFG Post: \*\*([0-9]+)\*\* created/;
			if(message.content.match(regexString)!== null){ //LFG Post: 3487 created.
				console.log('mesajul corect, scrie in general')
				const canalID = client.channels.cache.find(channel => channel.name === '🎲organizari');
				console.log(canalID.id);
				const canal = client.channels.cache.find(channel => channel.name === '📝general')
				canal.send("@Destiny S-a creat o noua organizare, verificati canalul  <#"+canalID.id+'>')
			}
		}
    }
    let checkMessage = message.content.split(" ");
	//console.log(message.member.roles);Command_creator


    if (checkMessage[0] === '?createcommand') {
		if (message.member.roles.cache.some(role => role.name === 'Admin') || message.member.roles.cache.some(role => role.name === 'Command_creator')) {
        console.log('Rol acceptat');
			try {
				let commandName = checkMessage[1];
				if (commandName === '?commands' || commandName === '?help') {
					message.channel.send("You can't do that.");
					return null;
				}
				let commandText = message.content.split('|', 2);
				if (commandText[1] === undefined) {
					message.channel.send("You forgot to use '|'");
					return null;
				}
				if (commandName.charAt(0) === '?') {
					checkExistingCommand(commandText[1], commandName);
				} else {
					checkExistingCommand(commandText[1], '?' + commandName);
				}
				message.channel.send("Command " + commandName + " has been created.");

			} catch (error) {
				console.log("Error\nAuthor: " + message.author.username + "\nMessage: " + message.content);
			}
		}else{
			message.channel.send('Nu ai rolul necesar, contacteaza un admin pentru rol!');
		}
    }
if(checkMessage[0] === '?lst'){
	let list = message.guild.members.fetch()
		.then((members)=>{
		ListUsers(members,message);	
		}
	);


}


    fs.readFile('./commands/commands.txt', 'utf8', function (err, f) {
        let com = f.toString().split(";");
        for (i = 0; i < com.length; i++) {
			com[i]=com[i].toLowerCase()
			message.content=message.content.toLowerCase()
            if (message.content === com[i]) {
                if (com[i] === "?commands") {
					if (message.member.roles.cache.some(role => role.name === 'Admin') || message.member.roles.cache.some(role => role.name === 'Command_creator')) {
						console.log('Rol acceptat');
						message.channel.send(com);
					}
                    break;
                }
                if (com[i] === "?help") {
					if (message.member.roles.cache.some(role => role.name === 'Admin') || message.member.roles.cache.some(role => role.name === 'Command_creator')) {
						console.log('Rol acceptat');
						message.channel.send("How to create commands:\n?createcommand ?NameOfCommand | Type whatever you want here");
						break;
					}else{
						message.channel.send('Nu ai rolul necesar, contacteaza un admin pentru rol!');
					}
                }
                let command = "./commands/" + com[i] + ".txt";
				console.log(command);
				command = command.replace('?', '~')
				console.log(command);
				
                fs.readFile(command, 'utf8', function (err, f) {
                    try {
                        let com2 = f.toString().split(";");
                        //let num = random.integer(0, com2.length - 1);
						var num = Math.random() * ((com2.length - 1) - 0) + 0;
                        message.channel.send(com2[Math.floor(num)]);
                    }
                    catch (err) {
                        console.error("", err);
                    }
                });
            }
        }
    });

});

/**
 * @method checkExistingCommand
 * @param {String} commandText
 * @param {String} commandName
 */
function checkExistingCommand(commandText, commandName) {
    let commandExists = false;
    fs.readFile('./commands/commands.txt', 'utf8', function (err, f) {
        let findCommands = f.toString().split(";");
        for (i = 0; i < findCommands.length; i++) {
            if (commandName === findCommands[i]) {
                commandExists = true;
            }
        }
        if (commandExists === true) {
            createCommand(commandText, true, commandName);
        } else if (commandExists === false) {
            createCommand(commandText, false, commandName);
        }
    });

}

/**
 * @method createCommand
 * @param {String} commandText
 * @param {Boolean} commandExists
 * @param {String} commandName
 */
function createCommand(commandText, commandExists, commandName) {
    let fileName = "./commands/" + commandName + ".txt";
	console.log(fileName);
	fileName = fileName.replace('?', '~')
	console.log(fileName);
    if (commandExists === true) {
        fs.writeFile(fileName, commandText, function (err) {
            if (err) {
                return console.error(err);
            }
        });
    } else if (commandExists === false) {
        fs.appendFile('./commands/commands.txt', commandName + ';', (err) => {
            if (err) throw err;
        });

        fs.writeFile(fileName, commandText.trim(), function (err) {
            if (err) {
                return console.error(err);
            }
        });
    }
}
function ListUsers(lista, mesaj){
var nume = lista.filter(member => (
  member.roles.cache.some(role => (role.name === 'Candidat')) &&
  !member.roles.cache.some(role => (role.name === 'Veteran'))  
))
			.map(member=> member.user.username).join('\n');
	/*lista.forEach(member => {
		if (member.roles.cache.some(role => role.name === 'Candidat')){
		console.log(member.user.username)
		mesaj.channel.send(member.user.username)
		}}); */
		if(nume !== ''){
			console.log(nume)
			mesaj.channel.send(nume)
		}
		//mesaj.channel.send('LFG Post: 6250 created.')
}
// Log our bot in
client.login(token);