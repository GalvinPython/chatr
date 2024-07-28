import { ActivityType, Events, PresenceUpdateStatus } from 'discord.js';
import client from '../index';

// update the bot's presence
function updatePresence() {
	if (!client?.user) return;
	client.user.setPresence({
		activities: [
			{
				name: `${client.guilds.cache.size} servers with ${client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0).toLocaleString('en-US')} members.`,
				type: ActivityType.Watching,
			},
		],
		status: PresenceUpdateStatus.Online,
	});
}

// Log into the bot
client.once(Events.ClientReady, async (bot) => {
	console.log(`Ready! Logged in as ${bot.user?.tag}`);
	updatePresence();
});

// Update the server count in the status every minute
setInterval(updatePresence, 60000);