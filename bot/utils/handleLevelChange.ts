// import quickEmbed from "./quickEmbed";
import type { TextChannel } from "discord.js";
import client from "..";

export default async function(guild: string, user: string, level: number) {
	const hasUpdates = await checkIfGuildHasUpdatesEnabled(guild);
	if (!hasUpdates.enabled) return;

	const channel = await client.channels.fetch(hasUpdates.channelId) as TextChannel;
	if (channel) {
		channel.send(`<@${user}> has reached level ${level}!`);
	}
}

export async function checkIfGuildHasUpdatesEnabled(guild: string): Promise<{ enabled: boolean, channelId: string }> {
	const response = await fetch(`http://localhost:18103/admin/updates/${guild}/get`, {
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ auth: process.env.AUTH }),
		method: 'POST',
	});

	const data = await response.json();

	return {
		enabled: data[0].enabled === 1,
		channelId: data[0].channel_id,
	};
}