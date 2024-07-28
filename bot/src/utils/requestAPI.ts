import handleLevelChange from "./handleLevelChange";

export async function makePOSTRequest(guild: string, user: string, channel: string | null, xp: number | null, pfp: string, name: string, nickname: string) {
	xp = xp ?? 0
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
		if (!channel) return
		if (data.sendUpdateEvent) handleLevelChange(guild, user, channel, data.level)
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

export async function removeGuild(guild: string) {
	await fetch(`http://localhost:18103/post/${guild}/remove`, {
		headers: {
			'Content-Type': 'application/json',
			'Authorization': process.env.AUTH as string,
		},
		method: 'POST',
	})
}

export async function removeUser(guild: string, user: string) {
	const response = await fetch(`http://localhost:18103/post/${guild}/${user}/remove`, {
		headers: {
			'Content-Type': 'application/json',
			'Authorization': process.env.AUTH as string,
		},
		method: 'POST',
	})
	return response.status === 200;
}

export async function setXP(guild: string, user: string, xp: number) {
	const response = await fetch(`http://localhost:18103/admin/set/${guild}/xp`, {
		"headers": {
			'Content-Type': 'application/json',
			'Authorization': process.env.AUTH as string,
		},
		"body": JSON.stringify({ extraData: { user, value: xp } }),
		"method": "POST"
	});
	return response.status === 200;
}

export async function setLevel(guild: string, user: string, level: number) {
	const response = await fetch(`http://localhost:18103/admin/set/${guild}/level`, {
		"headers": {
			'Content-Type': 'application/json',
			'Authorization': process.env.AUTH as string,
		},
		"body": JSON.stringify({ extraData: { user, value: level } }),
		"method": "POST"
	});
	return response.status === 200;
}

export async function getDBSize() {
	const response = await fetch('http://localhost:18103/get/dbusage')
	if (!response.ok) {
		console.error(`HTTP error! Status: ${response.status}`);
		return null;
	}
	return response.json();
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
export async function getUpdatesChannel(guild: string) {
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
export async function setUpdatesChannel(guild: string, channelId: string | null) {
	const response = await fetch(`http://localhost:18103/admin/updates/${guild}/set`, {
		"headers": {
			'Content-Type': 'application/json',
			'Authorization': process.env.AUTH as string,
		},
		"body": JSON.stringify({ extraData: { channelId } }),
		"method": "POST"
	});
	return response.status === 200;
}
export async function enableUpdates(guild: string) {
	const response = await fetch(`http://localhost:18103/admin/updates/${guild}/enable`, {
		"headers": {
			'Content-Type': 'application/json',
			'Authorization': process.env.AUTH as string,
		},
		"body": JSON.stringify({}),
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

//#region Cooldowns
export async function getCooldown(guild: string) {
	const response = await fetch(`http://localhost:18103/admin/cooldown/${guild}/get`, {
		"headers": { 
			'Content-Type': 'application/json',
			'Authorization': process.env.AUTH as string,
		},
		"body": JSON.stringify({}),
		"method": "POST"
	});
	return response.json();
}

export async function setCooldown(guild: string, cooldown: number) {
	const response = await fetch(`http://localhost:18103/admin/cooldown/${guild}/set`, {
		"headers": {
			'Content-Type': 'application/json', 
			'Authorization': process.env.AUTH as string,
		},
		"body": JSON.stringify({ extraData: { cooldown } }),
		"method": "POST"
	});
	return response.status === 200;
}
//#endregion

//#region Sync
export async function syncFromBot(guild: string, bot: string) {
	const response = await fetch(`http://localhost:18103/admin/sync/${guild}/${bot}`, {
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
