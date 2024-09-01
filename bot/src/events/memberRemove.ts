import { Events } from "discord.js";
import client from "../index";
import { removeUser } from "../utils/requestAPI";

client.on(Events.GuildMemberRemove, async (member) => {
	try {
		const success = await removeUser(member.id, member.guild.id);
		if (success) {
			console.log(`Removed user ${member.user.username} from the database`);
		} else {
			console.error(`Failed to remove user ${member.user.username} from the database`);
		}
	} catch (e) {
		console.error(e);
	}
})