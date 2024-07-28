import { Events } from "discord.js";
import client from "../index";
import { makePOSTRequest } from "../utils/requestAPI";

client.on(Events.GuildMemberUpdate, async (_oldMember, newMember) => {
	console.log(`Updating user ${newMember.user.username} for ${newMember.guild.name}`);
	if (newMember.user.bot) return;
	try {
		await makePOSTRequest(newMember.guild.id, newMember.id, null, null, newMember.displayAvatarURL(), newMember.user.username, newMember.nickname ?? newMember.user.globalName ?? newMember.user.username);
		console.log(`Updated user ${newMember.user.username} for ${newMember.guild.name}`);
	} catch (e) {
		console.error(e);
	}
})