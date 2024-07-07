// Commands taken from https://github.com/NiaAxern/discord-youtube-subscriber-count/blob/main/src/commands/utilities.ts

import client from '.';
import { type CommandInteraction } from 'discord.js';
import { heapStats } from 'bun:jsc';
import { getGuildLeaderboard, makeGETRequest } from './utils/requestAPI';
import convertToLevels from './utils/convertToLevels';
import quickEmbed from './utils/quickEmbed';

interface Command {
	data: {
		options: any[];
		name: string;
		description: string;
		integration_types: number[];
		contexts: number[];
	};
	execute: (interaction: CommandInteraction) => Promise<void>;
}

const commands: Record<string, Command> = {
	ping: {
		data: {
			options: [],
			name: 'ping',
			description: 'Check the ping of the bot!',
			integration_types: [0, 1],
			contexts: [0, 1, 2],
		},
		execute: async (interaction: { reply: (arg0: { ephemeral: boolean; content: string; }) => Promise<any>; client: { ws: { ping: any; }; }; }) => {
			await interaction
				.reply({
					ephemeral: false,
					content: `Ping: ${interaction.client.ws.ping}ms`,
				})
				.catch(console.error);
		},
	},
	help: {
		data: {
			options: [],
			name: 'help',
			description: 'Get help on what each command does!',
			integration_types: [0, 1],
			contexts: [0, 1, 2],
		},
		execute: async (interaction: { reply: (arg0: { ephemeral: boolean; content: string; }) => Promise<any>; }) => {
			await client.application?.commands?.fetch().catch(console.error);
			const chat_commands = client.application?.commands.cache.map((a) => {
				return `</${a.name}:${a.id}>: ${a.description}`;
			});
			await interaction
				.reply({
					ephemeral: true,
					content: `Commands:\n${chat_commands?.join('\n')}`,
				})
				.catch(console.error);
		},
	},
	sourcecode: {
		data: {
			options: [],
			name: 'sourcecode',
			description: "Get the link of the app's source code.",
			integration_types: [0, 1],
			contexts: [0, 1, 2],
		},
		execute: async (interaction: { reply: (arg0: { ephemeral: boolean; content: string; }) => Promise<any>; }) => {
			await interaction
				.reply({
					ephemeral: true,
					content: `[Github repository](https://github.com/GalvinPython/chatr)`,
				})
				.catch(console.error);
		},
	},
	uptime: {
		data: {
			options: [],
			name: 'uptime',
			description: 'Check the uptime of the bot!',
			integration_types: [0, 1],
			contexts: [0, 1, 2],
		},
		execute: async (interaction: { reply: (arg0: { ephemeral: boolean; content: string; }) => Promise<any>; }) => {
			await interaction
				.reply({
					ephemeral: false,
					content: `Uptime: ${(performance.now() / (86400 * 1000)).toFixed(
						2,
					)} days`,
				})
				.catch(console.error);
		},
	},
	usage: {
		data: {
			options: [],
			name: 'usage',
			description: 'Check the heap size and disk usage of the bot!',
			integration_types: [0, 1],
			contexts: [0, 1, 2],
		},
		execute: async (interaction: { reply: (arg0: { ephemeral: boolean; content: string; }) => Promise<any>; }) => {
			const heap = heapStats();
			Bun.gc(false);
			await interaction
				.reply({
					ephemeral: false,
					content: [
						`Heap size: ${(heap.heapSize / 1024 / 1024).toFixed(2)} MB / ${(
							heap.heapCapacity /
							1024 /
							1024
						).toFixed(2)} MB (${(heap.extraMemorySize / 1024 / 1024).toFixed(2,)} MB) (${heap.objectCount.toLocaleString()} objects, ${heap.protectedObjectCount.toLocaleString()} protected-objects)`,
					]
						.join('\n')
						.slice(0, 2000),
				})
				.catch(console.error);
		},
	},
	xp: {
		data: {
			options: [],
			name: 'xp',
			description: 'Get your XP and Points',
			integration_types: [0],
			contexts: [0, 2],
		},
		execute: async (interaction) => {
			if (interaction?.guildId) {
				const guild = interaction.guild?.id
				const user = interaction.user.id
				const xp = await makeGETRequest(guild as string, user)
				const progress = xp.user_progress_next_level;
				const progressBar = createProgressBar(progress);

				await interaction.reply({
					embeds: [
						quickEmbed(
							{
								color: 'Blurple',
								title: 'XP',
								description: `<@${user}> you have ${xp.xp} XP! (Level ${convertToLevels(xp.xp)})`,
							},
							interaction
						).addFields([
							{
								name: 'Progress To Next Level',
								value: `${progressBar} ${progress}%`,
								inline: true,
							},
							{
								name: 'XP Required',
								value: `${xp.user_xp_needed_next_level} XP`,
								inline: true,
							},
						]),
					],
				});

				function createProgressBar(progress: number): string {
					const filled = Math.floor(progress / 10);
					const empty = 10 - filled;
					return '▰'.repeat(filled) + '▱'.repeat(empty);
				}
			}
		}
	},
	top: {
		data: {
			options: [],
			name: 'top',
			description: 'Get the top users for the server',
			integration_types: [0],
			contexts: [0, 2],
		},
		execute: async (interaction) => {
			if (interaction?.guildId) {
				const guild = interaction.guild?.id;

				try {
					const leaderboard = await getGuildLeaderboard(guild as string);

					if (leaderboard.length === 0) {
						await interaction.reply('No leaderboard data available.');
						return;
					}

					// Create a new embed using the custom embed function
					const leaderboardEmbed = quickEmbed({
						color: 'Blurple',
						title: `Leaderboard for ${interaction.guild?.name}`,
						description: 'Top 10 Users'
					}, interaction);

					// Add a field for each user with a mention
					leaderboard.leaderboard.forEach((entry: { user_id: any; xp: any; }, index: number) => {
						leaderboardEmbed.addFields([
							{
								name: `${index + 1}.`,
								value: `<@${entry.user_id}>: ${entry.xp} XP`,
								inline: false
							}
						]);
					});

					// Send the embed
					await interaction.reply({ embeds: [leaderboardEmbed] });
				} catch (error) {
					console.error('Error executing command:', error);
					await interaction.reply('There was an error retrieving the leaderboard.');
				}
			} else {
				await interaction.reply('This command can only be used in a guild.');
			}
		}
	}
};

// Convert commands to a Map
const commandsMap = new Map<string, Command>();
for (const key in commands) {
	if (Object.prototype.hasOwnProperty.call(commands, key)) {
		const command = commands[key];
		console.log('loading ' + key);
		commandsMap.set(key, command);
	}
}

export default commandsMap;