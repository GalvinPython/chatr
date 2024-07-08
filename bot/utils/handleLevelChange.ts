// Provide updates in the guild, if enabled
export default async function(guild, user, level) {
	await checkIfGuildHasUpdatesEnabled(guild);
}

export async function checkIfGuildHasUpdatesEnabled(guild: string) {
	const response = await fetch(`http://localhost:18103/admin/${guild}/updates/check`, {
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ auth: process.env.AUTH }),
		method: 'GET',
	}).then(res => {
		return res.json()
	}).then(data => {
		return data
	
	});
	// just to shut up eslint
	console.log(response)
}