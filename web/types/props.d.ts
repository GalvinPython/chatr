import { Leaderboard } from "./leaderboard";

export interface PropsUsers {
    discordAccountExists: boolean;
    discordUserId: string;
    discordGuildId: string;
    discordAvatarURL: string;
    discordUsername: string;
    discordDisplayName: string;
    odometerPoints: number;
    odometerLevel: number;
    odometerPointsNeededToNextLevel: number;
    odometerPointsNeededForNextLevel: number;
    odometerProgressToNextLevelPercentage: number;
}

export interface PropsGuilds {
    discordGuildExists: boolean;
    discordGuildId: string;
    discordGuildIconURL: string;
    discordGuildName: string;
    odometerPoints: number;
    odometerMembers: number;
    odometerMembersBeingTracked: number;
	leaderboard: Leaderboard[];
}