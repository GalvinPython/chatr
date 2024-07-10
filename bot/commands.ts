// Commands taken from https://github.com/NiaAxern/discord-youtube-subscriber-count/blob/main/src/commands/utilities.ts

import client from '.';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, type CommandInteraction, ChannelType } from 'discord.js';
import { heapStats } from 'bun:jsc';
import { getGuildLeaderboard, makeGETRequest, getRoles, removeRole, addRole, enableUpdates, disableUpdates } from './utils/requestAPI';
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

				if (!xp) {
					await interaction.reply({
						ephemeral: true,
						content: "No XP data available."
					});
					return;
				}

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

					const button = new ButtonBuilder()
						.setLabel('Leaderboard')
						.setURL(`https://chatr.imgalvin.me/leaderboard/${interaction.guildId}`)
						.setStyle(ButtonStyle.Link);

					const row = new ActionRowBuilder<ButtonBuilder>()
						.addComponents(button);

					// Send the embed
					await interaction.reply({ embeds: [leaderboardEmbed], components: [row] });
				} catch (error) {
					console.error('Error executing command:', error);
					await interaction.reply('There was an error retrieving the leaderboard.');
				}
			} else {
				await interaction.reply('This command can only be used in a guild.');
			}
		}
	},
	cansee: {
		data: {
			options: [],
			name: 'cansee',
			description: 'Check what channels the bot can see',
			integration_types: [0],
			contexts: [0, 2],
		},
		execute: async (interaction) => {
			if (!interaction.memberPermissions?.has('ManageChannels')) {
				const errorEmbed = quickEmbed({
					color: 'Red',
					title: 'Error!',
					description: 'Missing permissions: `Manage Channels`'
				}, interaction);
				await interaction.reply({
					ephemeral: true,
					embeds: [errorEmbed]
				})
					.catch(console.error);
				return;
			}

			const channels = await interaction.guild?.channels.fetch();
			const accessibleChannels = channels?.filter(channel => channel && channel.permissionsFor(interaction.client.user)?.has('ViewChannel') && channel.type !== ChannelType.GuildCategory);

			await interaction
				.reply({
					ephemeral: true,
					content: accessibleChannels?.map(channel => `<#${channel?.id}>`).join('\n')
				})
				.catch(console.error);
		},
	},
	roles: {
		data: {
			options: [
				{
					name: 'action',
					id: 'action',
					description: 'Select an action',
					type: 3,
					required: true,
					choices: [
						{
							name: 'Get',
							value: 'get',
						},
						{
							name: 'Add',
							value: 'add',
						},
						{
							name: 'Remove',
							value: 'remove',
						}
					]
				},
				{
					name: 'role',
					id: 'role',
					description: 'Enter the role name. Required for add and remove actions.',
					type: 8,
					required: false,
					choices: []
				},
				{
					name: 'level',
					id: 'level',
					description: 'Enter the level. Required for add action.',
					type: 4,
					required: false,
					choices: []
				}
			],
			name: 'roles',
			description: 'Manage your roles for levels!',
			integration_types: [0],
			contexts: [0, 2],
		},
		execute: async (interaction) => {
			if (!interaction.memberPermissions?.has('ManageRoles')) {
				const errorEmbed = quickEmbed({
					color: 'Red',
					title: 'Error!',
					description: 'Missing permissions: `Manage Roles`'
				}, interaction);
				await interaction.reply({
					ephemeral: true,
					embeds: [errorEmbed]
				})
					.catch(console.error);
				return;
			}

			const action = interaction.options.get('action')?.value;
			const role = interaction.options.get('role')?.value;
			const level = interaction.options.get('level')?.value;
			let apiSuccess;
			let roles;
			switch (action) {
				case 'get':
					roles = await getRoles(interaction.guildId as string);
					if (Object.keys(roles).length === 0) {
						await interaction.reply({ ephemeral: true, content: 'No roles found! This was either an error from the API or you have none!' });
						return;
					}
					await interaction.reply({ ephemeral: true, content: `Roles:\n${roles.map((entry: { role_id: string; level: number }) => `<@&${entry.role_id}> - Level ${entry.level}`).join('\n')}` });
					return;
				case 'add':
					if (!role || !level) {
						await interaction.reply({ ephemeral: true, content: 'ERROR: One of these two values were not specified! [role, level]' });
						return;
					}
					apiSuccess = await addRole(interaction.guildId as string, role as string, parseInt(level as string));
					if (apiSuccess) {
						await interaction.reply({ ephemeral: true, content: `Successfully added <@&${role}> to level ${level}` });
						return;
					}
					await interaction.reply({ ephemeral: true, content: `ERROR: Couldn't add <@&${role}> to level ${level}` });
					return;
				default:
					if (!role) {
						await interaction.reply({ ephemeral: true, content: 'ERROR: Role was not specified!' });
					}
					apiSuccess = await removeRole(interaction.guildId as string, role as string);
					if (apiSuccess) {
						await interaction.reply({ ephemeral: true, content: `Successfully removed <@&${role}>` });
						return;
					}
					await interaction.reply({ ephemeral: true, content: `ERROR: Couldn't remove <@&${role}>` });
					return;
			}
		}
	},
	updates: {
		data: {
			options: [{
				name: 'action',
				id: 'action',
				description: 'Note that enabling is in THIS channel and will override the current updates channel!',
				type: 3,
				required: true,
				choices: [
					{
						name: 'check',
						value: 'check',
					},
					{
						name: 'enable',
						value: 'enable',
					},
					{
						name: 'disable',
						value: 'disable',
					}
				]
			},],
			name: 'updates',
			description: 'Get the latest updates on the bot!',
			integration_types: [0],
			contexts: [0, 2],
		},
		execute: async (interaction) => {
			if (!interaction.memberPermissions?.has('ManageRoles')) {
				const errorEmbed = quickEmbed({
					color: 'Red',
					title: 'Error!',
					description: 'Missing permissions: `Manage Roles`'
				}, interaction);
				await interaction.reply({
					ephemeral: true,
					embeds: [errorEmbed]
				})
					.catch(console.error);
				return;
			}

			const action = interaction.options.get('action')?.value;
			const channelId = interaction.channelId;

			switch (action) {
				case 'disable':
					await disableUpdates(interaction.guildId as string);
					await interaction.reply({ ephemeral: true, content: 'Updates are now disabled for this server' }).catch(console.error);
					return;
				case 'enable':
					await enableUpdates(interaction.guildId as string, channelId as string);
					await interaction.reply({ ephemeral: true, content: `Updates are now enabled for this server in <#${channelId}>` }).catch(console.error);
					return;
				default:
					await interaction.reply({ ephemeral: true, content: 'Not implemented :3' }).catch(console.error);
					return;
			}
		},
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