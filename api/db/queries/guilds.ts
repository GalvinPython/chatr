import type { QueryError } from "mysql2";
import { pool } from "..";

export interface Guild {
	id: string;
	name: string;
	icon: string;
	members: number;
	cooldown: number;
	updates_enabled: 0 | 1;
	updates_channel_id: string | null;
}


export async function getGuild(guildId: string): Promise<[QueryError, null] | [null, Guild | null]> {
	return new Promise((resolve, reject) => {
		pool.query("SELECT * FROM guilds WHERE id = ?", [guildId], (err, results) => {
			if (err) {
				reject([err, null]);
			} else {
				resolve([null, (results as Guild[])[0]]);
			}
		});
	});
}

export async function updateGuild(guild: Omit<Guild, "cooldown" | "updates_enabled" | "updates_channel_id">): Promise<[QueryError | null, null] | [null, Guild[]]> {
	return new Promise((resolve, reject) => {
		pool.query(
			`
			INSERT INTO guilds (id, name, icon, members)
			VALUES (?, ?, ?, ?)
			ON DUPLICATE KEY UPDATE
				name = VALUES(name),
				icon = VALUES(icon),
				members = VALUES(members)
			`,
			[
				guild.id,
				guild.name,
				guild.icon,
				guild.members,
			],
			(err, results) => {
				if (err) {
					reject([err, null]);
				} else {
					resolve([null, results as Guild[]]);
				}
			},
		);
	});
}

export async function setCooldown(guildId: string, cooldown: number): Promise<[QueryError, null] | [null, Guild]> {
  return new Promise((resolve, reject) => {
    pool.query("UPDATE guilds SET cooldown = ? WHERE id = ?", [cooldown, guildId], (err, results) => {
			if (err) {
				reject([err, null]);
			} else {
				resolve([null, (results as Guild[])[0]]);
			}
		});
  })
}

interface BotInfo {
	total_guilds: number;
	total_members: number;
	user_count?: number;
}

export async function getBotInfo(): Promise<[QueryError | null, BotInfo | null]> {
	return new Promise((resolve, reject) => {
		pool.query("SELECT COUNT(*) AS total_guilds, SUM(members) AS total_members FROM guilds", (err, results) => {
			if (err) {
				reject([err, null]);
			} else {
				const botInfo: BotInfo = {
					total_guilds: (results as BotInfo[])[0].total_guilds,
					total_members: (results as BotInfo[])[0].total_members ?? 0,
				};
				getUsersCount()
					.then(([userCountError, userCount]) => {
						if (userCountError) {
							reject([userCountError, null]);
						} else {
							botInfo.user_count = userCount;
							resolve([null, botInfo]);
						}
					})
					.catch((error) => {
						reject([error, null]);
					});
			}
		});
	});
}

export async function getUsersCount(): Promise<[QueryError | null, number]> {
	return new Promise((resolve, reject) => {
		pool.query("SELECT COUNT(*) AS count FROM users", (err, results) => {
			if (err) {
				reject([err, null]);
			} else {
				resolve([null, (results as { count: number }[])[0].count]);
			}
		});
	});
}
