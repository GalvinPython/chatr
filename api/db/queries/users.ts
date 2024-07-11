import type { QueryError } from "mysql2";
import { pool } from "..";

export interface User {
	id: string;
	guild_id: string;
	name: string;
	nickname: string;
	pfp: string;
	xp: number;
	level: number;
	xp_needed_next_level: number;
	progress_next_level: number;
}

export async function getUsers(guildId: string): Promise<[QueryError, null] | [null, User[]]> {
	return new Promise((resolve, reject) => {
		pool.query("SELECT * FROM users WHERE guild_id = ? ORDER BY xp DESC", [guildId], (err, results) => {
			if (err) {
				reject([err, null]);
			} else {
				resolve([null, (results as User[])]);
			}
		});
	});
}

export async function getUser(userId: string, guildId: string): Promise<[QueryError, null] | [null, User | null]> {
	return new Promise((resolve, reject) => {
		pool.query("SELECT * FROM users WHERE id = ? AND guild_id = ?", [userId, guildId], (err, results) => {
			if (err) {
				reject([err, null]);
			} else {
				resolve([null, (results as User[])[0]]);
			}
		});
	});
}
