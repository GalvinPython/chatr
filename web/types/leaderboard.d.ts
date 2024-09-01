export interface Leaderboard {
	id: string;
	guild_id: string;
	name: string;
	nickname: string;
	pfp: string;
	xp: number;
	level: number;
	xp_needed_next_level: number;
	progress_next_level: string;
}