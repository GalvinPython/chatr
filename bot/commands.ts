// Commands taken from https://github.com/NiaAxern/discord-youtube-subscriber-count/blob/main/src/commands/utilities.ts

import client from '.';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, type CommandInteraction, ChannelType, type APIApplicationCommandOption, GuildMember, AttachmentBuilder, ComponentType } from 'discord.js';
import { heapStats } from 'bun:jsc';
import { getGuildLeaderboard, makeGETRequest, getRoles, removeRole, addRole, enableUpdates, disableUpdates, getCooldown, setCooldown, checkIfGuildHasUpdatesEnabled } from './utils/requestAPI';
import convertToLevels from './utils/convertToLevels';
import quickEmbed from './utils/quickEmbed';
import { Font, RankCardBuilder } from 'canvacord';
import { getColor } from 'colorthief'

Font.loadDefault();

interface Command {
	data: {
		options: APIApplicationCommandOption[];
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
		execute: async (interaction) => {
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
		execute: async (interaction) => {
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
		execute: async (interaction) => {
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
		execute: async (interaction) => {
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
		execute: async (interaction) => {
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
			
			const card = new RankCardBuilder()
  			.setDisplayName((interaction.member as GuildMember).displayName)
        .setAvatar(interaction.user.displayAvatarURL()) // user avatar
        .setCurrentXP(300) // current xp
        .setRequiredXP(600) // required xp
        .setLevel(2) // user level
        .setRank(5) // user rank
        .setOverlay(90) // overlay percentage. Overlay is a semi-transparent layer on top of the background
        .setBackground("#23272a")
			
			if (interaction.user.discriminator !== "0") {
			  card.setUsername("#" + interaction.user.discriminator)
			} else {
			  card.setUsername("@" + interaction.user.username)
			}
			
      const color = await getColor(interaction.user.displayAvatarURL({ extension: "png" }));
      card.setStyles({
        progressbar: {
          thumb: {
            style: {
              backgroundColor: `rgb(${color[0]}, ${color[1]}, ${color[2]})`
            }
          }
        }
      })
			
      const image = await card.build({
        format: "png"
      });
      const attachment = new AttachmentBuilder(image, { name: `${user}.png` });

			const msg = await interaction.reply({
			  files: [attachment],
				components: [
				  new ActionRowBuilder<ButtonBuilder>().setComponents(
						new ButtonBuilder()
						  .setCustomId("text-mode")
						  .setLabel("Use text mode")
						  .setStyle(ButtonStyle.Secondary)
					)
				],
				fetchReply: true
			});
			
      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60 * 1000
      });
      
      collector.on("collect", async (i) => {
        if (i.user.id !== user) 
          return i.reply({
            content: "You're not the one who initialized this message! Try running /xp on your own.",
            ephemeral: true
          });
       
        if (i.customId !== "text-mode") return;
        
        const progress = xp.progress_next_level;
        const progressBar = createProgressBar(progress);
        
        await i.update({
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
								value: `${xp.xp_needed_next_level} XP`,
								inline: true,
							},
						]),
					],
					files: [],
					components: []
        })
      })
      
      function createProgressBar(progress: number): string {
				const filled = Math.floor(progress / 10);
				const empty = 10 - filled;
				return '▰'.repeat(filled) + '▱'.repeat(empty);
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
					leaderboard.leaderboard.forEach((entry: { user_id: string; xp: number; }, index: number) => {
						leaderboardEmbed.addFields([
							{
								name: `${index + 1}.`,
								value: `<@${entry.user_id}>: ${entry.xp.toLocaleString("en-US")} XP`,
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
					description: 'Enter the role name. Required for add and remove actions.',
					type: 8,
					required: false,
				},
				{
					name: 'level',
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
			let success
			let data

			switch (action) {
				case 'disable':
					success = await disableUpdates(interaction.guildId as string);
					if (!success) {
						await interaction.reply({ ephemeral: true, content: 'Error disabling updates for this server' }).catch(console.error);
						return;
					}
					await interaction.reply({ ephemeral: true, content: 'Updates are now disabled for this server' }).catch(console.error);
					return;
				case 'enable':
					success = await enableUpdates(interaction.guildId as string, channelId as string);
					if (!success) {
						await interaction.reply({ ephemeral: true, content: 'Error enabling updates for this server' }).catch(console.error);
						return;
					}
					await interaction.reply({ ephemeral: true, content: `Updates are now enabled for this server in <#${channelId}>` }).catch(console.error);
					return;
				default:
					data = await checkIfGuildHasUpdatesEnabled(interaction.guildId as string);
					if (!data || Object.keys(data).length === 0) {
						await interaction.reply({ ephemeral: true, content: 'No data found' }).catch(console.error);
						return;
					}
					// TODO: Format in embed
					await interaction.reply({ ephemeral: true, content: JSON.stringify(data, null, 2) }).catch(console.error);
					return;
			}
		},
	},
	cooldown: {
		data: {
			options: [{
				name: 'action',
				description: 'Select an action',
				type: 3,
				required: true,
				choices: [
					{
						name: 'Get',
						value: 'get',
					},
					{
						name: 'Set',
						value: 'set',
					}
				]
			},{
				name: 'cooldown',
				description: 'Enter the cooldown in seconds. Required for set action.',
				type: 4,
				required: false,
				choices: []
			}],
			name: 'cooldown',
			description: 'Manage the cooldown for XP!',
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

			const action = interaction.options.get('action')?.value;
			const cooldown = interaction.options.get('cooldown')?.value;

			let cooldownData;
			let apiSuccess;

			switch (action) {
				case 'get':
					cooldownData = await getCooldown(interaction.guildId as string);
					if (!cooldownData) {
						await interaction.reply({ ephemeral: true, content: 'Error fetching cooldown data!' });
						return;
					}
					await interaction.reply({ ephemeral: true, content: `Cooldown: ${(cooldownData?.cooldown ?? 30_000) / 1000} seconds` });
					return;
				case 'set':
					if (!cooldown) {
						await interaction.reply({ ephemeral: true, content: 'ERROR: Cooldown was not specified!' });
						return;
					}
					apiSuccess = await setCooldown(interaction.guildId as string, parseInt(cooldown as string) * 1000);
					if (!apiSuccess) {
						await interaction.reply({ ephemeral: true, content: 'Error setting cooldown!' });
						return;
					}
					await interaction.reply({ ephemeral: true, content: `Cooldown set to ${cooldown} seconds` });
					return;
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
