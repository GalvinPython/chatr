import { Events } from "discord.js";
import client from "../index";
import { updateGuildInfo } from "../utils/requestAPI";

client.on(Events.GuildCreate, async (guild) => {
	try {
		await updateGuildInfo(guild.id, guild.name, guild.iconURL() ?? 'https://cdn.discordapp.com/embed/avatars/0.png', guild.memberCount);
		console.log(`Joined guild ${guild.name} with ${guild.memberCount} members`);
	} catch (e) {
		console.error(e);
	}
})