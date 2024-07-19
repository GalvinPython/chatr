import { Events } from "discord.js";
import client from "../index";
import { removeGuild } from "../utils/requestAPI";

client.on(Events.GuildDelete, async (guild) => {
	try {
		await removeGuild(guild.id);
		console.log(`Left guild ${guild.name} with ${guild.memberCount} members. The database has been locked`);
	} catch (e) {
		console.error(e);
	}
})