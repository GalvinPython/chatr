// Check if DISCORD_TOKEN has been provided as an environment variable, and is a valid regex pattern
const discordToken: string | undefined = process.argv.includes("--dev")
	? process.env?.DISCORD_TOKEN_DEV
	: process.env?.DISCORD_TOKEN;

if (!discordToken || discordToken === "YOUR_TOKEN_HERE")
	throw "You MUST provide a discord token in .env!";

// If it has, run the bot
import {
	Client,
	GatewayIntentBits,
	REST,
	Routes,
	type APIApplicationCommand,
} from "discord.js";
import commandsMap from "./commands";
import fs from "fs/promises";
import path from "path";

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
});

// Update the commands
console.log(`Refreshing ${commandsMap.size} commands`);
const rest = new REST().setToken(discordToken);
const getAppId: { id?: string | null } = (await rest.get(
	Routes.currentApplication(),
)) || { id: null };
if (!getAppId?.id)
	throw "No application ID was able to be found with this token";

const data = (await rest.put(Routes.applicationCommands(getAppId.id), {
	body: [...commandsMap.values()].map((a) => {
		return a.data;
	}),
})) as APIApplicationCommand[];

console.log(`Successfully reloaded ${data.length} application (/) commands.`);

client.login(discordToken);

export default client;

// Import events
const getEvents = await fs.readdir(path.join(process.cwd(), "src/events"));
for await (const file of getEvents) {
	await import("./events/" + file);
}
