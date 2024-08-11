import type { TextChannel } from "discord.js";
import client from "..";
import leaderboardEmbed from "./leaderboardEmbed";
import { getAllGuildsWithUpdatesEnabled } from "./requestAPI";

export default async function () {
	const allGuildsData = await getAllGuildsWithUpdatesEnabled()

	// TODO: Type guild
	allGuildsData.forEach(async (guild: any) => {
		const [embed, row] = await leaderboardEmbed(guild.id)
		const channel = await client.channels.fetch(guild.updates_channel_id) as TextChannel;
		await channel?.send({ embeds: [embed], components: [row] });
	})
}