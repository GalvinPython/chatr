import { Message } from 'discord.js';
import client from '../index';
import { makePOSTRequest } from '../utils/requestAPI';

// Run this event whenever a message has been sent
client.on('messageCreate', async (message: Message) => {
    const lengthOfMessage: number = message.content.length

    if (message.author.bot) return
    makePOSTRequest(message.guildId as string, message.author.id, lengthOfMessage)
});