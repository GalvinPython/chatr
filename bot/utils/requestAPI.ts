import handleLevelChange from "./handleLevelChange";

export async function makePOSTRequest(guild: string, user: string, xp: number, pfp: string, name: string, nickname: string) {
	await fetch(`http://localhost:18103/post/${guild}/${user}`, {
		headers: {
			'Content-Type': 'application/json',
			'Authorization': process.env.AUTH as string,
		},
		method: 'POST',
		body: JSON.stringify({ xp, pfp, name, nickname }),
	}).then(res => {
		return res.json()
	}).then(data => {
		if (data.sendUpdateEvent) handleLevelChange(guild, user, data.level)
	})
}

export async function makeGETRequest(guild: string, user: string) {
	const response = await fetch(`http://localhost:18103/get/${guild}/${user}`);

	if (!response.ok) {
		console.error(`HTTP error! Status: ${response.status}`);
		return null;
	}

	const data = await response.json();
	return data;
}

export async function getGuildLeaderboard(guild: string) {
	const response = await fetch(`http://localhost:18103/get/${guild}`)

	if (!response.ok) {
		console.error(`HTTP error! Status: ${response.status}`);
		return null;
	}

	const data = await response.json();
	return data;
}

export async function updateGuildInfo(guild: string, name: string, icon: string, members: number) {
	await fetch(`http://localhost:18103/post/${guild}`, {
		headers: {
			'Content-Type': 'application/json',
			'Authorization': process.env.AUTH as string,
		},
		method: 'POST',
		body: JSON.stringify({ name, icon, members }),
	}).then(res => {
		return res.json()
	}).then(data => {
		console.dir(data, { depth: null })
	})
}

//#region Roles
export async function getRoles(guild: string) {
	const response = await fetch(`http://localhost:18103/admin/roles/${guild}/get`, {
		headers: {
			'Content-Type': 'application/json',
			'Authorization': process.env.AUTH as string,
		},
		body: JSON.stringify({}),
		referrerPolicy: 'strict-origin-when-cross-origin',
		method: 'POST',
	});

	return response.status === 200 ? response.json() : {};
}
// export async function getRole(guild: string, role: string) {
// TODO: Implement this?
// }
export async function removeRole(guild: string, role: string): Promise<boolean> {
	const response = await fetch(`http://localhost:18103/admin/roles/${guild}/remove`, {
		"headers": {
			'Content-Type': 'application/json',
			'Authorization': process.env.AUTH as string,
		},
		"body": JSON.stringify({
			extraData: {
				role: role,
			}
		}),
		"method": "POST"
	});

	return response.status === 200;
}
export async function addRole(guild: string, role: string, level: number): Promise<boolean> {
	const response = await fetch(`http://localhost:18103/admin/roles/${guild}/add`, {
		"headers": {
			'Content-Type': 'application/json',
			'Authorization': process.env.AUTH as string,
		},
		"body": JSON.stringify({
			extraData: {
				role: role,
				level: level
			}
		}),
		"method": "POST"
	});

	return response.status === 200;
}
// export async function updateRole(guild: string, role: string, level: number) {
// TODO: Implement this?
// }
//#endregion

//#region Updates
export async function checkIfGuildHasUpdatesEnabled(guild: string) {
	const response = await fetch(`http://localhost:18103/admin/updates/${guild}/get`, {
		"headers": {
			'Content-Type': 'application/json',
			'Authorization': process.env.AUTH as string
		},
		"body": JSON.stringify({}),
		"method": "POST"
	});
	return response.status === 200 ? response.json() : {};
}
export async function enableUpdates(guild: string, channelId: string) {
	const response = await fetch(`http://localhost:18103/admin/updates/${guild}/enable`, {
		"headers": {
			'Content-Type': 'application/json',
			'Authorization': process.env.AUTH as string,
		},
		"body": JSON.stringify({ extraData: { channelId } }),
		"method": "POST"
	});
	return response.status === 200;
}
export async function disableUpdates(guild: string) {
	const response = await fetch(`http://localhost:18103/admin/updates/${guild}/disable`, {
		"headers": {
			'Content-Type': 'application/json',
			'Authorization': process.env.AUTH as string,
		},
		"body": JSON.stringify({}),
		"method": "POST"
	});
	return response.status === 200;
}
//#endregion
