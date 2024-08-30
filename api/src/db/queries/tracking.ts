import { CronJob } from "cron";

let usersToUpdate: Record<string, string[]> = {};

export async function addUserToTrackingData(userId: string, guildId: string) : Promise<void> {
	console.log("Adding user to tracking data:", userId, guildId);
	if (!usersToUpdate[guildId]) {
		usersToUpdate[guildId] = [];
	}
	if (!usersToUpdate[guildId].includes(userId)) {
		usersToUpdate[guildId].push(userId);
	}
	return;
}

async function doTrackingJob() {
	const usersToUpdateTemp = { ...usersToUpdate };
	usersToUpdate = {};
	if (!Object.keys(usersToUpdateTemp).length) {
		console.log("No users to update!");
		return;
	}
	const guildIds = Object.keys(usersToUpdateTemp);
	for (const guildId of guildIds) {
		const userIds = usersToUpdateTemp[guildId];
		for (const userId of userIds) {
			console.log(userId, guildId);
		}
	}
}

const trackingJob = new CronJob("*/5 * * * * *", doTrackingJob);
trackingJob.start();