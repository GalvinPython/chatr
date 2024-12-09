import type { TextChannel } from "discord.js";
import client from "..";
import leaderboardEmbed from "./leaderboardEmbed";
import { getAllGuildsWithUpdatesEnabled } from "./requestAPI";

interface Guild {
	id: string;
	updates_channel_id: string;
}

export default async function () {
	const allGuildsData = await getAllGuildsWithUpdatesEnabled()

	allGuildsData.forEach(async (guild: Guild) => {
		const [embed, row] = await leaderboardEmbed(guild.id)
		const channel = await client.channels.fetch(guild.updates_channel_id) as TextChannel;
		await channel?.send({ embeds: [embed], components: [row] });
	})
}