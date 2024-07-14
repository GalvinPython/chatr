import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import path from "path";
import { getBotInfo, getGuild, getUser, getUsers, initTables, pool, updateGuild, enableUpdates, disableUpdates, setCooldown, setUpdatesChannel } from "./db";

const app = express();
const PORT = 18103;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

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

app.post("/post/:guild/:user", authMiddleware, async (req, res) => {
	const { guild, user } = req.params;
	const { name, pfp, xp, nickname } = req.body;
	console.log(req.body);
	const xpValue = parseInt(xp);

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
		res.status(200).json({
			guild: guildData,
			leaderboard: usersData,
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
						const [err, success] = await enableUpdates(guild, extraData.channelId);
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
		default:
			return res.status(400).json({ message: "Illegal request" });
	}
});

app.get("/leaderboard/:guild", async (req, res) => {
	const { guild } = req.params;
	const [guildErr, guildData] = await getGuild(guild);
	const [usersErr, usersData] = await getUsers(guild);

	if (!guildData) {
		return res.status(404).render("error", { error: { status: 404, message: "The guild does not exist" } });
	}

	if (guildErr) {
		console.error("Error fetching guild:", guildErr);
		res.status(500).render("error", { error: { status: 500, message: "Internal server error whilst trying to fetch guild info. Or the guild does not exist" } });
	} else if (usersErr) {
		console.error("Error fetching users:", usersErr);
		res.status(500).render("error", { error: { status: 500, message: "Internal server error whilst trying to fetch user info" } });
	}

	res.render("leaderboard", {
		guild: guildData,
		leaderboard: usersData,
	});
});

app.get("/", async (_req, res) => {
	const [err, botInfo] = await getBotInfo();
	if (err) {
		console.error("Error fetching bot info:", err);
		res.status(500).render("error", { error: { status: 500, message: "Internal server error whilst trying to fetch bot info" } });
	}
	res.render("index", { botInfo });
});

app.use((_req, res) => {
	res.status(404).render("error", { error: { status: 404, message: "Page doesn't exist" } });
});

app.get("/invite", (_req, res) =>
	res
		.status(308)
		.redirect(
			"https://discord.com/oauth2/authorize?client_id=1245807579624378601&permissions=1099780115520&integration_type=0&scope=bot+applications.commands",
		)
);

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
