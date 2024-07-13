import type { QueryError } from "mysql2";
import { pool } from "..";

export interface Guild {
	id: string;
	name: string;
	icon: string;
	members: number;
	cooldown: number;
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

export async function updateGuild(guild: Guild): Promise<[QueryError | null, null] | [null, Guild[]]> {
	return new Promise((resolve, reject) => {
		pool.query(
			`
			INSERT INTO guilds (id, name, icon, members, updates_enabled, updates_channel)
			VALUES (?, ?, ?, ?, ?, ?)
			ON DUPLICATE KEY UPDATE
				name = VALUES(name),
				icon = VALUES(icon),
				members = VALUES(members),
				updates_enabled = VALUES(updates_enabled),
				updates_channel = VALUES(updates_channel)
			`,
			[
				guild.id,
				guild.name,
				guild.icon,
				guild.members,
				guild.updates_enabled,
				guild.updates_channel,
			],
			(err, results) => {
				console.dir(results, { depth: null });
				if (err) {
					reject([err, null]);
				} else {
					resolve([null, results as Guild[]]);
				}
			},
		);
	});
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
				resolve([null, (results[0] as { count: number }).count]);
			}
		});
	});
}
