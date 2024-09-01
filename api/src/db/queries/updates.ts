import type { QueryError } from "mysql2";
import { pool } from "..";

export interface Updates {
	guild_id: string;
	channel_id: string;
	enabled: boolean;
}

export async function enableUpdates(guildId: string): Promise<[QueryError | null, boolean]> {
	return new Promise((resolve, reject) => {
		pool.query(
			`
				UPDATE guilds SET updates_enabled = TRUE WHERE id = ?
			`,
			[
				guildId,
			],
			(err) => {
				if (err) {
					reject([err, false]);
				} else {
					resolve([null, true]);
				}
			},
		);
	});
}

export async function disableUpdates(guildId: string): Promise<[QueryError | null, boolean]> {
	return new Promise((resolve, reject) => {
		pool.query(
			`
				UPDATE guilds SET updates_enabled = FALSE WHERE id = ?
			`,
			[
				guildId,
			],
			(err) => {
				if (err) {
					reject([err, false]);
				} else {
					resolve([null, true]);
				}
			},
		);
	});
}

export async function setUpdatesChannel(guildId: string, channelId: string | null): Promise<[QueryError | null, boolean]> {
	console.log("Setting updates channel", guildId, channelId);
	return new Promise((resolve, reject) => {
		pool.query(
			`
				UPDATE guilds SET updates_channel_id = ? WHERE id = ?
			`,
			[
				channelId,
				guildId,
			],
			(err) => {
				if (err) {
					reject([err, false]);
				} else {
					resolve([null, true]);
				}
			},
		);
	});
}

export async function getAllServersWithUpdatesEnabled(): Promise<[QueryError | null, Updates[]]> {
	return new Promise((resolve, reject) => {
		pool.query(
			`
				SELECT id, updates_channel_id, updates_enabled FROM guilds WHERE updates_enabled = TRUE
			`,
			(err, results) => {
				if (err) {
					reject([err, []]);
				} else {
					resolve([null, results as Updates[]]);
				}
			},
		);
	});
}