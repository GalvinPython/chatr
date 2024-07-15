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

export async function setXP(guildId: string, userId: string, xp: number): Promise<[QueryError | null, boolean]> {
	const newLevel = Math.floor(Math.sqrt(xp / 100));
	const nextLevel = newLevel + 1;
	const nextLevelXp = Math.pow(nextLevel, 2) * 100;
	const xpNeededForNextLevel = nextLevelXp - xp;
	const currentLevelXp = Math.pow(newLevel, 2) * 100;
	const progressToNextLevel =
		((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;

	return new Promise((resolve, reject) => {
		pool.query("UPDATE users SET xp = ?, level = ?, xp_needed_next_level = ?, progress_next_level = ? WHERE id = ? AND guild_id = ?", [xp, newLevel, xpNeededForNextLevel.toFixed(2), progressToNextLevel.toFixed(2), userId, guildId], (err) => {
			if (err) {
				reject([err, false]);
			} else {
				resolve([null, true]);
			}
		});
	});
}

export async function setLevel(guildId: string, userId: string, level: number): Promise<[QueryError | null, boolean]> {
	const newXp = Math.pow(level, 2) * 100;
	const nextLevel = level + 1;
	const nextLevelXp = Math.pow(nextLevel, 2) * 100;
	const xpNeededForNextLevel = nextLevelXp - newXp;
	const currentLevelXp = Math.pow(level, 2) * 100;
	const progressToNextLevel =
		((newXp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;

	return new Promise((resolve, reject) => {
		pool.query("UPDATE users SET xp = ?, level = ?, xp_needed_next_level = ?, progress_next_level = ? WHERE id = ? AND guild_id = ?", [newXp, level, xpNeededForNextLevel.toFixed(2), progressToNextLevel.toFixed(2), userId, guildId], (err) => {
			if (err) {
				reject([err, false]);
			} else {
				resolve([null, true]);
			}
		});
	});
}
