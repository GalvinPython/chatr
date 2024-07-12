import type { QueryError } from "mysql2";
import { pool } from "..";

export interface Updates {
	guild_id: string;
	channel_id: string;
	enabled: boolean;
}

export async function getUpdates(guildId: string): Promise<[QueryError | null, Updates[] | null]> {
	return new Promise((resolve, reject) => {
		pool.query("SELECT * FROM updates WHERE guild_id = ?", [guildId], (err, results) => {
			if (err) {
				reject([err, null]);
			} else {
				resolve([null, results as Updates[]]);
			}
		});
	});
}

export async function enableUpdates(guildId: string, channelId: string): Promise<[QueryError | null, true | null]> {
	return new Promise((resolve, reject) => {
		pool.query(
			`
			INSERT INTO updates (guild_id, channel_id, enabled)
			VALUES (?, ?, ?)
			ON DUPLICATE KEY UPDATE
				channel_id = VALUES(channel_id),
				enabled = VALUES(enabled)
			`,
			[
				guildId,
				channelId,
				true,
			],
			(err) => {
				if (err) {
					reject([err, null]);
				} else {
					resolve([null, true]);
				}
			},
		);
	});
}

export async function disableUpdates(guildId: string): Promise<[QueryError | null, true | null]> {
	return new Promise((resolve, reject) => {
		pool.query(
			`
			UPDATE updates
			SET enabled = ?
			WHERE guild_id = ?
			`,
			[
				false,
				guildId,
			],
			(err) => {
				if (err) {
					reject([err, null]);
				} else {
					resolve([null, true]);
				}
			},
		);
	});
}
