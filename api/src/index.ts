import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import { getBotInfo, getGuild, getUser, getUsers, initTables, pool, updateGuild, enableUpdates, disableUpdates, setCooldown, setUpdatesChannel, setXP, setLevel, removeGuild, removeUser } from "./db";

const app = express();
const PORT = 18103;

app.use(cors());
app.use(express.json());

app.disable("x-powered-by");

console.log("Initializing tables...");
await initTables();
console.log("Tables initialized");

function authMiddleware(req: Request, res: Response, next: NextFunction) {
	if (!req.headers.authorization || req.headers.authorization !== process.env.AUTH) {
		return res
			.status(403)
			.json({ message: "Access denied" });
	}
	next();
}

app.post("/post/:guild", authMiddleware, async (req, res) => {
	const { guild } = req.params;
	const { name, icon, members } = req.body;

	const [err, results] = await updateGuild({
		id: guild,
		name,
		icon,
		members,
	});

	if (err) {
		res.status(500).json({ message: "Internal server error" });
	} else {
		res.status(200).json(results);
	}
});

app.post('/post/:guild/remove', authMiddleware, async (req, res) => {
	const { guild } = req.params;
	const [err, results] = await removeGuild(guild);

	if (err) {
		res.status(500).json({ message: "Internal server error" });
	} else {
		res.status(200).json(results);
	}
})

app.post('/post/:guild/:user/remove', authMiddleware, async (req, res) => {
	const { guild, user } = req.params;
	const [err, results] = await removeUser(user, guild);

	if (err) {
		res.status(500).json({ message: "Internal server error" });
	} else {
		res.status(200).json(results);
	}
})

app.post("/post/:guild/:user", authMiddleware, async (req, res) => {
	const { guild, user } = req.params;
	const { name, pfp, xp, nickname } = req.body;
	console.log(req.body);
	const xpValue = parseInt(xp);

	if (xpValue == 0) {
		const updateQuery = `
		INSERT INTO users
			(id, guild_id, pfp, name, nickname)
		VALUES (?, ?, ?, ?, ?)
		ON DUPLICATE KEY UPDATE
			pfp = VALUES(pfp),
			name = VALUES(name),
			nickname = VALUES(nickname)
		`;

		pool.query(
			updateQuery,
			[
				user,
				guild,
				pfp,
				name,
				nickname,
			],
			(err) => {
				if (err) {
					console.error("Error updating XP:", err);
					return res
						.status(500)
						.json({ success: false, message: "Internal server error" });
				} else {
					res
						.status(200)
						.json({
							success: true
						});
				}
			},
		);
	}

	const [err, result] = await getUser(user, guild);

	if (err) {
		console.error("Error fetching XP:", err);
		return res.status(500).json({ message: "Internal server error" });
	}


	const currentXp = result?.xp ?? 0;
	const currentLevelSaved = result?.level ?? 0;
	const newXp = currentXp + xpValue;

	const currentLevel = Math.floor(Math.sqrt(newXp / 100));
	const nextLevel = currentLevel + 1;
	const nextLevelXp = Math.pow(nextLevel, 2) * 100;
	const xpNeededForNextLevel = nextLevelXp - newXp;
	const currentLevelXp = Math.pow(currentLevel, 2) * 100;
	const progressToNextLevel =
		((newXp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;

	const updateQuery = `
    INSERT INTO users
        (id, guild_id, xp, pfp, name, nickname, level, xp_needed_next_level, progress_next_level)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
        xp = VALUES(xp),
        pfp = VALUES(pfp),
        name = VALUES(name),
        nickname = VALUES(nickname),
        level = VALUES(level),
        xp_needed_next_level = VALUES(xp_needed_next_level),
        progress_next_level = VALUES(progress_next_level)
	`;

	pool.query(
		updateQuery,
		[
			user,
			guild,
			newXp,
			pfp,
			name,
			nickname,
			currentLevel,
			xpNeededForNextLevel,
			progressToNextLevel.toFixed(2),
		],
		(err) => {
			if (err) {
				console.error("Error updating XP:", err);
				return res
					.status(500)
					.json({ success: false, message: "Internal server error" });
			} else {
				res
					.status(200)
					.json({
						success: true,
						sendUpdateEvent: currentLevelSaved !== currentLevel,
						level: currentLevel,
					});
			}
		},
	);
});

app.get('/get/botinfo', async (_req, res) => {
	const [err, data] = await getBotInfo();
	if (err) {
		console.error("Error fetching bot info:", err);
		return res.status(500).json({ message: "Internal server error" });
	}
	return res.status(200).json(data);
});

app.get('/get/dbusage', (_req, res) => {
	pool.query(`SELECT table_schema AS "name", SUM(data_length + index_length) / 1024 / 1024 AS "size" FROM information_schema.TABLES GROUP BY table_schema;`, (err, results) => {
		if (err) {
			console.error("Error fetching database size:", err);
			return res.status(500).json({ message: "Internal server error" });
		} else {
			const discordXpBot = results.find((result) => result.name === process.env.MYSQL_DATABASE);
			if (discordXpBot) {
				return res.status(200).json({ sizeInMB: parseFloat(discordXpBot.size) });
			} else {
				return res.status(404).json({ message: "Database not found" });
			}
		}
	})
});

app.get("/get/:guild/:user", async (req, res) => {
	const { guild, user } = req.params;

	const [err, result] = await getUser(user, guild);

	if (err) {
		console.error("Error fetching user:", err);
		res.status(500).json({ message: "Internal server error" });
	} else if (result) {
		res.status(200).json(result);
	} else {
		res.status(404).json({ message: "User not found" });
	}
});

app.get("/get/:guild", async (req, res) => {
	const { guild } = req.params;

	const [guildErr, guildData] = await getGuild(guild);
	const [usersErr, usersData] = await getUsers(guild);

	if (guildErr) {
		console.error("Error fetching guild:", guildErr);
		res.status(500).json({ message: "Internal server error" });
	} else if (usersErr) {
		console.error("Error fetching users:", usersErr);
		res.status(500).json({ message: "Internal server error" });
	} else if (!guildData) {
		res.status(404).json({ message: "Guild not found" });
	} else {
		const totalXp = usersData.reduce((sum, user) => sum + user.xp, 0);
		res.status(200).json({
			guild: guildData,
			leaderboard: usersData,
			totalXp: totalXp,
		});
	}
});

app.post("/admin/:action/:guild/:target", authMiddleware, async (req, res) => {
	const { guild, action, target } = req.params;
	const { extraData } = req.body;

	switch (action) {
		case "include":
			// TODO: implement this
			// target: channel id
			// run function to include target to guild
			break;
		case "exclude":
			// TODO: implement this
			// target: channel id
			// run function to exclude target from guild
			break;
		case "updates":
			if (target !== "enable" && target !== "disable" && target !== "set" && target !== "get") {
				return res.status(400).json({ message: "Illegal request" });
			}

			switch (target) {
				case "enable":
					try {
						const [err, success] = await enableUpdates(guild);
						if (err) {
							return res.status(500).json({ message: "Internal server error", err });
						} else {
							return res.status(200).json(success);
						}
					} catch (err) {
						return res.status(500).json({ message: "Internal server error", err });
					}
				case "disable":
					try {
						const [err, success] = await disableUpdates(guild);
						if (err) {
							return res.status(500).json({ message: "Internal server error", err });
						} else {
							return res.status(200).json(success);
						}
					} catch (err) {
						return res.status(500).json({ message: "Internal server error", err });
					}
				case 'set':
					if (!extraData || typeof extraData.channelId === "undefined") {
						return res.status(400).json({ message: "Illegal request" });
					}

					try {
						const [err, success] = await setUpdatesChannel(guild, extraData.channelId);
						if (err) {
							return res.status(500).json({ message: 'Internal server error', err });
						} else {
							return res.status(200).json(success);
						}
					} catch (err) {
						return res.status(500).json({ message: 'Internal server error', err });
					}
				default:
					try {
						const [err, data] = await getGuild(guild);
						if (err) {
							return res.status(500).json({ message: "Internal server error", err });
						}
						return res.status(200).json({
							enabled: ((data?.updates_enabled ?? 1) === 1),
							channel: data?.updates_channel_id ?? null,
						});
					} catch (error) {
						return res.status(500).json({ message: "Internal server error" });
					}
			}
		case "roles":
			if (target !== "add" && target !== "remove" && target !== "get") {
				return res.status(400).json({ message: "Illegal request" });
			}

			if ((target === "add" || target === "remove") && !extraData) {
				return res.status(400).json({ message: "Illegal request" });
			}

			switch (target) {
				case "get":
					try {
						const data = await adminRolesGet(guild);
						return res.status(200).json(data);
					} catch (error) {
						return res.status(500).json({ message: "Internal server error" });
					}
				case "remove":
					try {
						const data = await adminRolesRemove(guild, extraData.role);
						return res.status(200).json(data);
					} catch (error) {
						return res.status(500).json({ message: "Internal server error" });
					}
				case "add":
					try {
						const data = await adminRolesAdd(
							guild,
							extraData.role,
							extraData.level,
						);
						return res.status(200).json(data);
					} catch (error) {
						return res.status(500).json({ message: "Internal server error" });
					}
				default:
					return res.status(500).json({ message: "Internal server error" });
			}
		case "cooldown":
			if (target !== "set" && target !== "get") {
				return res.status(400).json({ message: "Illegal request" });
			}

			if (target === "set" && !extraData) {
				return res.status(400).json({ message: "Illegal request" });
			}

			switch (target) {
				case "get":
					try {
						const [err, data] = await getGuild(guild);
						if (err) {
							return res.status(500).json({ message: "Internal server error" });
						}
						return res.status(200).json({ cooldown: data?.cooldown ?? 30_000 });
					} catch (error) {
						return res.status(500).json({ message: "Internal server error" });
					}
				case "set":
					try {
						const data = await setCooldown(guild, extraData.cooldown);
						return res.status(200).json(data);
					} catch (error) {
						return res.status(500).json({ message: "Internal server error" });
					}
				default:
					return res.status(500).json({ message: "Internal server error" });
			}
		case "set": {
			if (target !== "xp" && target !== "level") {
				return res.status(400).json({ message: "Illegal request" });
			}

			if (!extraData || !extraData.user || !extraData.value) {
				return res.status(400).json({ message: "Illegal request" });
			}

			switch (target) {
				case "xp":
					try {
						const [err, success] = await setXP(guild, extraData.user, extraData.value);
						if (err) {
							return res.status(500).json({ message: "Internal server error", err });
						} else {
							return res.status(200).json(success);
						}
					} catch (err) {
						return res.status(500).json({ message: "Internal server error", err });
					}
				case "level":
					try {
						const [err, success] = await setLevel(guild, extraData.user, extraData.value);
						if (err) {
							return res.status(500).json({ message: "Internal server error", err });
						} else {
							return res.status(200).json(success);
						}
					} catch (err) {
						return res.status(500).json({ message: "Internal server error", err });
					}
				default:
					return res.status(500).json({ message: "Internal server error" });
			}
		}
		case "sync": {
			if (target !== "polaris" && target !== "mee6" && target !== "lurkr") {
				return res.status(400).json({ message: "Illegal request" });
			}

			switch (target) {
				case "polaris": {
					try {
						const [err, success] = await syncFromPolaris(guild);
						if (err) {
							if (err instanceof Error && err.message === "Server not found in Polaris") {
								return res.status(404).json({ message: "Server not found in Polaris" });
							}
							return res.status(500).json({ message: "Internal server error", err });
						} else {
							return res.status(200).json(success);
						}
					} catch (err) {
						return res.status(500).json({ message: "Internal server error", err });
					}
				}
				case "mee6": {
					try {
						const [err, success] = await syncFromMee6(guild);
						if (err) {
							if (err instanceof Error && err.message === "Server not found in MEE6") {
								return res.status(404).json({ message: "Server not found in MEE6" });
							}
							return res.status(500).json({ message: "Internal server error", err });
						} else {
							return res.status(200).json(success);
						}
					} catch (err) {
						return res.status(500).json({ message: "Internal server error", err });
					}
				}
				case "lurkr": {
					try {
						const [err, success] = await syncFromLurkr(guild);
						if (err) {
							if (err instanceof Error && err.message === "Server not found in Lurkr") {
								return res.status(404).json({ message: "Server not found in Lurkr" });
							}
							return res.status(500).json({ message: "Internal server error", err });
						} else {
							return res.status(200).json(success);
						}
					} catch (err) {
						return res.status(500).json({ message: "Internal server error", err });
					}
				}
				default:
					return res.status(500).json({ message: "Internal server error" });
			}
		}
		default:
			return res.status(400).json({ message: "Illegal request" });
	}
});

app.get("/invite", (_req, res) => res.status(308).redirect("https://discord.com/oauth2/authorize?client_id=1245807579624378601&permissions=1099780115520&integration_type=0&scope=bot+applications.commands"));

app.get('/support', (_req, res) => res.status(308).redirect('https://discord.gg/fpJVTkVngm'));

app.use((_req, res) => {
	res.status(404).json({ message: "Not found" });
});

app.listen(PORT, () => {
	console.log(`Server running on http://localhost:${PORT}`);
});

// TODO: actually implement this in a real way
//#region Admin: Roles
async function adminRolesGet(guild: string) {
	const selectRolesQuery = `SELECT id, level FROM roles WHERE guild_id = ?`;

	return new Promise((resolve, reject) => {
		pool.query(selectRolesQuery, [guild], (err, results) => {
			if (err) {
				console.error("Error fetching roles:", err);
				reject(err);
			} else {
				resolve(results);
			}
		});
	});
}

async function adminRolesRemove(guild: string, role: string) {
	const deleteRoleQuery = `
		DELETE FROM roles
		WHERE id = ? AND guild_id = ?
	`;

	return new Promise((resolve, reject) => {
		pool.query(deleteRoleQuery, [role, guild], (err, results) => {
			if (err) {
				console.error("Error removing role:", err);
				reject(err);
			} else {
				resolve(results);
			}
		});
	});
}

async function adminRolesAdd(guild: string, role: string, level: number) {
	const insertRoleQuery = `
		INSERT INTO roles (id, guild_id, level)
		VALUES (?, ?, ?)
	`;

	return new Promise((resolve, reject) => {
		pool.query(insertRoleQuery, [role, guild, level], (err, results) => {
			if (err) {
				console.error("Error adding role:", err);
				reject(err);
			} else {
				resolve(results);
			}
		});
	});
}
//#endregion

//#region Syncing
async function syncFromPolaris(guild: string) {
	const res = await fetch(`https://gdcolon.com/polaris/api/leaderboard/${guild}`);
	const data = await res.json();
	if (data.apiError && data.code === "invalidServer") {
		return [new Error("Server not found in Polaris"), false];
	}
	const users = data.leaderboard;
	for (let i = 1; i < data.pageInfo.pageCount; i++) {
		const res = await fetch(`https://gdcolon.com/polaris/api/leaderboard/${guild}?page=${i + 1}`);
		const data = await res.json();
		users.push(...data.leaderboard);
	}

	if (users.length === 0) {
		return [new Error("No users found"), false];
	}

	try {
		for (const user of users) {
			const xpValue = user.xp;
			const level = Math.floor(Math.sqrt(xpValue / 100));
			const nextLevel = level + 1;
			const nextLevelXp = Math.pow(nextLevel, 2) * 100;
			const xpNeededForNextLevel = nextLevelXp - xpValue;
			const currentLevelXp = Math.pow(level, 2) * 100;
			const progressToNextLevel =
				((xpValue - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;

			await new Promise((resolve, reject) => {
				pool.query(
					`INSERT INTO users (id, guild_id, xp, pfp, name, nickname, level, xp_needed_next_level, progress_next_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
					[
						user.id,
						guild,
						xpValue,
						user.avatar,
						user.username,
						user.nickname ?? user.displayName,
						level,
						xpNeededForNextLevel,
						progressToNextLevel.toFixed(2),
					],
					(err) => {
						if (err) {
							console.error("Error syncing from Polaris:", err);
							reject(err);
						} else {
							resolve(null);
						}
					},
				);
			});
		}
		return [null, true]
	} catch (err) {
		return [err, false];
	}

}

async function syncFromMee6(guild: string) {
	const res = await fetch(`https://mee6.xyz/api/plugins/levels/leaderboard/${guild}?limit=1000&page=0`);
	const data = await res.json();
	if (data.status_code === 404) {
		return [new Error("Server not found in MEE6"), false];
	}
	const users = data.players;
	let pageNumber = 1;
	// this is needed because MEE6 doesn't give us the total amount of pages
	// eslint-disable-next-line no-constant-condition
	while (true) {
		const res = await fetch(`https://mee6.xyz/api/plugins/levels/leaderboard/${guild}?limit=1000&page=${pageNumber}`);
		const data = await res.json();
		users.push(...data.players);
		if (data.players.length < 1000) break;
		pageNumber += 1;
	}

	if (users.length === 0) {
		return [new Error("No users found"), false];
	}

	try {
		for (const user of users) {
			const xpValue = user.xp;
			const level = Math.floor(Math.sqrt(xpValue / 100));
			const nextLevel = level + 1;
			const nextLevelXp = Math.pow(nextLevel, 2) * 100;
			const xpNeededForNextLevel = nextLevelXp - xpValue;
			const currentLevelXp = Math.pow(level, 2) * 100;
			const progressToNextLevel =
				((xpValue - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;

			await new Promise((resolve, reject) => {
				pool.query(
					`INSERT INTO users (id, guild_id, xp, pfp, name, nickname, level, xp_needed_next_level, progress_next_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
					[
						user.id,
						guild,
						xpValue,
						`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp`,
						user.username,
						user.username,
						level,
						xpNeededForNextLevel,
						progressToNextLevel.toFixed(2),
					],
					(err) => {
						if (err) {
							console.error("Error syncing from MEE6:", err);
							reject(err);
						} else {
							resolve(null);
						}
					},
				);
			});
		}
		return [null, true]
	} catch (err) {
		return [err, false];
	}
}

async function syncFromLurkr(guild: string) {
	const res = await fetch(`https://api.lurkr.gg/v2/levels/${guild}?page=1`);
	const data = await res.json();
	if (data.message === "Guild no found") {
		return [new Error("Server not found in Lurkr"), false];
	}
	const users = data.levels;

	if (users.length === 0) {
		return [new Error("No users found"), false];
	}

	let pageNumber = 2;
	// this is needed because Lurkr doesn't give us the total amount of pages
	// eslint-disable-next-line no-constant-condition
	while (true) {
		const res = await fetch(`https://api.lurkr.gg/v2/levels/${guild}?page=${pageNumber}`);
		const data = await res.json();
		users.push(...data.levels);
		if (data.levels.length < 100) break;
		pageNumber += 1;
	}

	try {
		for (const user of users) {
			const xpValue = user.xp;
			const level = Math.floor(Math.sqrt(user.xp / 100));
			const nextLevel = level + 1;
			const nextLevelXp = Math.pow(nextLevel, 2) * 100;
			const xpNeededForNextLevel = nextLevelXp - user.xp;
			const currentLevelXp = Math.pow(level, 2) * 100;
			const progressToNextLevel =
				((user.xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;

			await new Promise((resolve, reject) => {
				pool.query(
					`INSERT INTO users (id, guild_id, xp, pfp, name, nickname, level, xp_needed_next_level, progress_next_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
					[
						user.userId,
						guild,
						xpValue,
						`https://cdn.discordapp.com/avatars/${user.userId}/${user.user.avatar}.webp`,
						user.user.username,
						user.user.username,
						level,
						xpNeededForNextLevel,
						progressToNextLevel.toFixed(2),
					],
					(err) => {
						if (err) {
							console.error("Error syncing from Lurkr:", err);
							reject(err);
						} else {
							resolve(null);
						}
					},
				);
			});
		}
		return [null, true]
	} catch (err) {
		return [err, false];
	}
}
//#endregion
