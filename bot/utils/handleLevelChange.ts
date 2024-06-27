// Provide updates in the guild, if enabled

export async function checkIfGuildHasUpdatesEnabled(guild: string) {
	const response = await fetch(`http://localhost:18103/admin/${guild}/updates/check`);
	// just to shut up eslint
	console.log(response)
}