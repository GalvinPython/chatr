import { Events } from "discord.js";
import client from "../index";
import { updateGuildInfo } from "../utils/requestAPI";

client.on(Events.GuildUpdate, async (_oldGuild, newGuild) => {
	try {
		await updateGuildInfo(newGuild.id, newGuild.name, newGuild?.iconURL() ?? 'https://cdn.discordapp.com/embed/avatars/0.png', newGuild.memberCount);
		console.log(`Updated guild ${newGuild.name} with ${newGuild.memberCount} members`);
	} catch (e) {
		console.error(e);
	}
})