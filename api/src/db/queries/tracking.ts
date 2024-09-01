// TODO: Move this file to a utils folder or something - this is NOT queries

import { CronJob } from "cron";
import { pool } from "..";
import type { QueryError } from "mysql2";

let usersToUpdate: Record<string, string[]> = {};
let timestamp: string

export async function addUserToTrackingData(userId: string, guildId: string) : Promise<void> {
	console.log("Adding user to tracking data:", userId, guildId);
	if (!usersToUpdate[guildId]) {
		usersToUpdate[guildId] = [];
	}
	if (!usersToUpdate[guildId].includes(userId)) {
		usersToUpdate[guildId].push(userId);
		return;
	}
	return;
}

async function doTrackingJob() {
	timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
	const usersToUpdateTemp = { ...usersToUpdate };
	usersToUpdate = {};
	console.log("Updating users:", usersToUpdateTemp);
	if (!Object.keys(usersToUpdateTemp).length) {
		console.log("No users to update!");
		return;
	}
	const guildIds = Object.keys(usersToUpdateTemp);
	for (const guildId of guildIds) {
		const userIds = usersToUpdateTemp[guildId];
		const userIdsString = userIds.join(",");
		const [err, results] = await getUsersXp(userIdsString, guildId);
		if (err) {
			console.error("Error getting users:", err);
			return;
		}
		console.log("Results:", results);
		for (const result of results) {
			const { id, guild_id, xp } = result;
			await insertUserDataToTracking(id, guild_id, xp);
		}
	}
}

const trackingJob = new CronJob("*/5 * * * * *", doTrackingJob);
trackingJob.start();

export async function getUsersTrackingData(userId: string, guildId: string): Promise<[QueryError | null, any]> {
	return new Promise((resolve, reject) => {
		pool.query("SELECT * FROM tracking WHERE user_id = ? AND guild_id = ?", [userId, guildId], (err, results) => {
			if (err) {
				reject([err, null]);
			} else {
				resolve([null, results]);
			}
		});
	});
}

export async function getGuildTrackingData(guildId: string, override: number | null): Promise<[QueryError | null, null] | [null, any]> {
	const topNumber: number = override || 10;

	return new Promise((resolve, reject) => {
		pool.query("SELECT * FROM tracking WHERE guild_id = ? ORDER BY xp DESC, time ASC LIMIT ?", [guildId, topNumber], (err, results) => {
			if (err) {
				reject([err, null]);
			} else {
				resolve([null, results]);
			}
		});
	});
}

async function getUsersXp(userString: string, guildId: string): Promise<[QueryError | null, any]> {
	return new Promise((resolve, reject) => {
		pool.query("SELECT * FROM users WHERE id IN (?) AND guild_id = ?", [userString, guildId], (err, results) => {
			if (err) {
				reject([err, null]);
			} else {
				resolve([null, results]);
			}
		});
	});
}

async function insertUserDataToTracking(userId: string, guildId: string, xp: number): Promise<[QueryError | null, null]> {
	const time = timestamp;
	return new Promise((resolve, reject) => {
		pool.query("INSERT INTO tracking (user_id, guild_id, xp, time) VALUES (?, ?, ?, ?)", [userId, guildId, xp, time], (err) => {
			if (err) {
				reject([err, null]);
			} else {
				resolve([null, null]);
			}
		});
	});	
}