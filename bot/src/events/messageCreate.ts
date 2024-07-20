import { Message } from 'discord.js';
import client from '../index';
import { getCooldown, makePOSTRequest, updateGuildInfo } from '../utils/requestAPI';

const cooldowns = new Map<string, number>();

// Run this event whenever a message has been sent
client.on('messageCreate', async (message: Message) => {
	if (message.author.bot) return;

	const cooldownTime = (await getCooldown(message.guildId as string))?.cooldown ?? 30_000;

	const cooldown = cooldowns.get(message.author.id);
	if (cooldown && Date.now() - cooldown < cooldownTime) return;

	const xpToGive: number = message.content.length;
	const pfp: string = message.member?.displayAvatarURL() ?? message.author.displayAvatarURL()
	const name: string = message.author.username;
	const nickname: string = message.member?.nickname ?? message.author.globalName ?? message.author.username;
	await makePOSTRequest(message.guildId as string, message.author.id, message.channel.id, xpToGive, pfp, name, nickname);
	cooldowns.set(message.author.id, Date.now());

	const guildName = message.guild?.name;
	const guildIcon = message.guild?.iconURL() ?? 'https://cdn.discordapp.com/embed/avatars/0.png';
	const guildMembers = message.guild?.memberCount;
	await updateGuildInfo(message.guildId as string, guildName as string, guildIcon as string, guildMembers as number);
});
