import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import quickEmbed from "./quickEmbed";
import { getGuildLeaderboard } from "./requestAPI";
import client from "..";

export default async function (guild: string, interaction?: any) {
	const leaderboard = await getGuildLeaderboard(guild);

	if (leaderboard.length === 0) {
		await interaction.reply('No leaderboard data available.');
		return;
	}

	// Create a new embed using the custom embed function
	const leaderboardEmbed = quickEmbed({
		color: 'Blurple',
		title: `Leaderboard for ${interaction ? interaction.guild?.name : (await client.guilds.fetch(guild)).name}`,
		description: 'Top 10 Users'
	}, interaction);

	// Add a field for each user with a mention
	leaderboard.leaderboard.slice(0, 10).forEach((entry: { id: string; xp: number; }, index: number) => {
		leaderboardEmbed.addFields([
			{
				name: `${index + 1}.`,
				value: `<@${entry.id}>: ${entry.xp.toLocaleString("en-US")} XP`,
				inline: false
			}
		]);
	});

	const button = new ButtonBuilder()
		.setLabel('Leaderboard')
		.setURL(`https://chatr.fun/leaderboard/${guild}`)
		.setStyle(ButtonStyle.Link);

	const row = new ActionRowBuilder<ButtonBuilder>()
		.addComponents(button);

	return [leaderboardEmbed, row];
}