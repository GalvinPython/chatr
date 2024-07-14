// import quickEmbed from "./quickEmbed";
import type { TextChannel } from "discord.js";
import client from "..";
import { getUpdatesChannel } from "./requestAPI";

export default async function(guild: string, user: string, channelId: string, level: number) {
	const hasUpdates = await getUpdatesChannel(guild);
	if (!hasUpdates.enabled) return;

	const channel = await client.channels.fetch(hasUpdates.channelId ?? channelId) as TextChannel;
	if (channel) {
		channel.send(`<@${user}> has reached level ${level}!`);
	}
}
