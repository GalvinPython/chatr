export async function makePOSTRequest(guild: string, user: string, xp: number) {
	await fetch(`http://localhost:18103/post/${guild}/${user}/${xp}/${process.env.AUTH}`, {
		method: 'POST'
	}).then(res => {
		return res.json()
	}).then(data => {
		console.dir(data, { depth: null })
	})
}

export async function makeGETRequest(guild: string, user: string) {
	try {
		const response = await fetch(`http://localhost:18103/get/${guild}/${user}`);

		if (!response.ok) {
			throw new Error(`HTTP error! Status: ${response.status}`);
		}

		const data = await response.json();
		return data;
	} catch (error) {
		console.error('Error making GET request:', error);
		throw error;
	}
}

export async function getGuildLeaderboard(guild: string) {
	try {
		const response = await fetch(`http://localhost:18103/leaderboard/${guild}`)

		if (!response.ok) {
			throw new Error(`HTTP error! Status: ${response.status}`);
		}

		const data = await response.json();
		return data;
	} catch (error) {
		console.error('Error making request for guild leaderboard: ', error);
		throw error;
	}
}