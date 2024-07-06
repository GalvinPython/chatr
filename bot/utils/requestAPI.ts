export async function makePOSTRequest(guild: string, user: string, xp: number, pfp: string, name: string, nickname: string) {
	await fetch(`http://localhost:18103/post/${guild}/${user}/${process.env.AUTH}`, {
		headers: {
			'Content-Type': 'application/json',
		},
		method: 'POST',
		body: JSON.stringify({ xp, pfp, name, nickname }),
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
		const response = await fetch(`http://localhost:18103/get/${guild}`)

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

export async function updateGuildInfo(guild: string, name: string, icon: string, members: number) {
	await fetch(`http://localhost:18103/post/${guild}`, {
		headers: {
			'Content-Type': 'application/json',
		},
		method: 'POST',
		body: JSON.stringify({ name, icon, members }),
	}).then(res => {
		return res.json()
	}).then(data => {
		console.dir(data, { depth: null })
	})
}