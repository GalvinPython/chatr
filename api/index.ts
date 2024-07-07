import express from 'express';
import cors from 'cors';
import mysql from 'mysql2';
import path from 'path';

const app = express();
const PORT = 18103;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Create a MySQL connection pool
const pool = mysql.createPool({
	host: process.env.MYSQL_ADDRESS,
	port: process.env.MYSQL_PORT,
	user: process.env.MYSQL_USER,
	password: process.env.MYSQL_PASSWORD,
	database: process.env.MYSQL_DATABASE,
});

// Create the basic information tables
async function initInfoTables() {
	const createUpdatesTable = `
		CREATE TABLE IF NOT EXISTS info_updates (
			guild_id VARCHAR(255) NOT NULL,
			enabled BOOLEAN DEFAULT FALSE,
			channel_id VARCHAR(255),
			PRIMARY KEY (guild_id)
		)
	`;
	const createRolesTable = `
		CREATE TABLE IF NOT EXISTS info_roles (
			guild_id VARCHAR(255) NOT NULL,
			role_id VARCHAR(255) NOT NULL,
			level INT NOT NULL,
			PRIMARY KEY (role_id)
		)
	`;
	const createExcludesTable = `
		CREATE TABLE IF NOT EXISTS info_excludes (
			channel_id VARCHAR(255) NOT NULL,
			guild_id VARCHAR(255) NOT NULL,
			PRIMARY KEY (channel_id)
		)
	`;
	const createGuildsTable = `
		CREATE TABLE IF NOT EXISTS info_guilds (
			guild_id VARCHAR(255) NOT NULL,
			guild_name VARCHAR(255),
			guild_icon VARCHAR(255),
			guild_members INT,
			PRIMARY KEY (guild_id)
		)
	`;

	pool.query(createUpdatesTable, (err, results) => {
		if (err) {
			console.error('Error creating updates table:', err);
		} else {
			console.log('Updates table created:', results);
		}
	});

	pool.query(createRolesTable, (err, results) => {
		if (err) {
			console.error('Error creating roles table:', err);
		} else {
			console.log('Roles table created:', results);
		}
	});

	pool.query(createExcludesTable, (err, results) => {
		if (err) {
			console.error('Error creating excludes table:', err);
		} else {
			console.log('Excludes table created:', results);
		}
	});

	pool.query(createGuildsTable, (err, results) => {
		if (err) {
			console.error('Error creating excludes table:', err);
		} else {
			console.log('Excludes table created:', results);
		}
	});
}
console.log('Initializing info tables...');
await initInfoTables();
console.log('Info tables initialized');

// Ensure the table for a specific guild exists
async function ensureGuildTableExists(guild, callback) {
	const createTableQuery = `
        CREATE TABLE IF NOT EXISTS \`${guild}\` (
            user_id VARCHAR(255) NOT NULL,
            xp INT DEFAULT 0,
			user_pfp TINYTEXT,
			user_name TINYTEXT,
			user_nickname TINYTEXT,
			user_level INT DEFAULT 0,
			user_xp_needed_next_level INT,
			user_progress_next_level DECIMAL(6, 2),
            PRIMARY KEY (user_id)
        )
    `;
	pool.query(createTableQuery, (err, results) => {
		if (err) {
			console.error(`Error creating table for guild ${guild}:`, err);
			callback(err);
		}
		else {
			console.log(`Table for guild ${guild} ensured:`, results);
			callback(null);
		}
	});
}

async function updateGuildInfo(guild, name, icon, members, callback) {
	const insertOrUpdateQuery = `
		INSERT INTO info_guilds (guild_id, guild_name, guild_icon, guild_members)
		VALUES (?, ?, ?, ?)
		ON DUPLICATE KEY UPDATE
		guild_name = VALUES(guild_name),
		guild_icon = VALUES(guild_icon),
		guild_members = VALUES(guild_members)
	`;
	pool.query(insertOrUpdateQuery, [guild, name, icon, members], (err, results) => {
		if (err) {
			console.error('Error updating guild info:', err);
			callback(err, null);
		}
		else {
			console.log('Guild info updated:', results);
			callback(null, results);
		}
	});
}

app.post('/post/:guild/', async (req, res) => {
	const { guild } = req.params;
	const { name, icon, members } = req.body;

	updateGuildInfo(guild, name, icon, members, (err, results) => {
		if (err) {
			res.status(500).json({ message: 'Internal server error' });
		} else {
			res.status(200).json(results);
		}
	});
});

app.post('/post/:guild/:user/:auth', (req, res) => {
	const { guild, user, auth } = req.params;
	const { name, pfp, xp, nickname } = req.body;
	console.log(req.body);
	const xpValue = parseInt(xp);

	if (auth !== process.env.AUTH) {
		return res.status(403).json({ message: 'Access denied. Auth token is missing' });
	}

	ensureGuildTableExists(guild, (err) => {
		if (err) {
			return res.status(500).json({ message: 'Internal server error' });
		}

		const getXpQuery = `SELECT xp FROM \`${guild}\` WHERE user_id = ?`;

		pool.query(getXpQuery, [user], (err, results) => {
			if (err) {
				console.error('Error fetching XP:', err);
				return res.status(500).json({ message: 'Internal server error' });
			}

			const currentXp = results.length ? results[0].xp : 0;
			const newXp = currentXp + xpValue;

			const currentLevel = Math.floor(Math.sqrt(newXp / 100));
			const nextLevel = currentLevel + 1;
			const nextLevelXp = Math.pow(nextLevel, 2) * 100;
			const xpNeededForNextLevel = nextLevelXp - newXp;
			const currentLevelXp = Math.pow(currentLevel, 2) * 100;
			const progressToNextLevel = ((newXp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;

			const updateQuery = `
                INSERT INTO \`${guild}\` (user_id, xp, user_pfp, user_name, user_nickname, user_level, user_xp_needed_next_level, user_progress_next_level)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    xp = VALUES(xp),
                    user_pfp = VALUES(user_pfp),
                    user_name = VALUES(user_name),
                    user_nickname = VALUES(user_nickname),
                    user_level = VALUES(user_level),
                    user_xp_needed_next_level = VALUES(user_xp_needed_next_level),
                    user_progress_next_level = VALUES(user_progress_next_level)
            `;

			pool.query(updateQuery, [user, newXp, pfp, name, nickname, currentLevel, xpNeededForNextLevel, progressToNextLevel.toFixed(2)], (err, results) => {
				if (err) {
					console.error('Error updating XP:', err);
					return res.status(500).json({ message: 'Internal server error' });
				} else {
					res.status(200).json(results);
				}
			});
		});
	});
});

app.get('/get/:guild/:user', (req, res) => {
	const { guild, user } = req.params;

	const selectQuery = `
        SELECT * FROM \`${guild}\` WHERE user_id = ?
    `;
	pool.query(selectQuery, [user], (err, results) => {
		if (err) {
			console.error('Error fetching XP:', err);
			res.status(500).json({ message: 'Internal server error' });
		}
		else if (results.length > 0) {
			res.status(200).json(results[0]);
		}
		else {
			res.status(404).json({ message: 'User not found' });
		}
	});
});

app.get('/get/:guild', async (req, res) => {
	const { guild } = req.params;
	const returnData = { "guild": {}, "leaderboard": [] };

	const selectQuery = `
		SELECT * FROM \`${guild}\` ORDER BY xp DESC;
	`;
	const selectQuery2 = `
		SELECT * FROM info_guilds WHERE guild_id = ${guild};
	`;

	try {
		const results1 = await new Promise((resolve, reject) => {
			pool.query(selectQuery, (err, results) => {
				if (err) {
					console.error('Error fetching XP:', err);
					reject(err);
				} else {
					resolve(results);
				}
			});
		});

		const results2 = await new Promise((resolve, reject) => {
			pool.query(selectQuery2, (err, results) => {
				if (err) {
					console.error('Error fetching XP:', err);
					reject(err);
				} else {
					resolve(results);
				}
			});
		});

		returnData.leaderboard = results1;
		returnData.guild = results2[0];

		return res.status(200).json(returnData);
	} catch (error) {
		console.error('Error fetching XP:', error);
		return res.status(500).json({ message: 'Internal server error' });
	}
});

app.post('/admin/:action/:guild/:target', (req, res) => {
	const { guild, action, target } = req.params;
	if (action === 'include') {
		// run function to include target to guild
		return;
	}
	else if (action === 'exclude') {
		// run function to exclude target from guild
		return;
	}
	else if (action === 'updates') {
		return;
	}
	else {
		return res.status(400).json({ message: 'Illegal request' });
	}
});

app.get('/leaderboard/:guild', async (req, res) => {
	const { guild } = req.params;
	const response = await fetch(`http://localhost:18103/get/${guild}/`);
	if (!response.ok) {
		return res.status(404).json({ message: 'No guild was found with this ID' });
	}
	const data = await response.json();
	res.render('leaderboard', { guild: data.guild, leaderboard: data.leaderboard });
});

app.listen(PORT, () => {
	console.log(`Server running on http://localhost:${PORT}`);
});
