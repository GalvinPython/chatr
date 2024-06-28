import express from 'express';
import cors from 'cors';
import mysql from 'mysql2';

const app = express();
const PORT = 18103;
const localhostIps = ['::1', '127.0.0.1', '::ffff:127.0.0.1'];

app.use(cors());

// Middleware to restrict access to localhost for POST requests
function restrictToLocalhost(req, res, next) {
	const clientIp = req.connection.remoteAddress;
	if (localhostIps.includes(clientIp)) {
		next();
	}
	else {
		return res.status(403).json({ message: 'Access denied. Your IP address is blocked from this endpoint' });
	}
}

// Create a MySQL connection pool
const pool = mysql.createPool({
	host: process.env.MYSQL_ADDRESS,
	port: process.env.MYSQL_PORT,
	user: process.env.MYSQL_USER,
	password: process.env.MYSQL_PASSWORD,
	database: process.env.MYSQL_DATABASE,
});

// Ensure the table for a specific guild exists
function ensureGuildTableExists(guild, callback) {
	const tableName = `${guild}`;
	const createTableQuery = `
        CREATE TABLE IF NOT EXISTS \`${tableName}\` (
            user_id VARCHAR(255) NOT NULL,
            xp INT DEFAULT 0,
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

function ensureGuildRolesTableExists(guild, callback) {
	const tableName = `${guild}_roles`;
	const createTableQuery = `
		CREATE TABLE IF NOT EXISTS \`${tableName}\` (
			level INT NOT NULL,
			role_id INT,
			PRIMARY KEY (role_id)
		)
	`;
	pool.query(createTableQuery, (err, results) => {
		if (err) {
			console.error(`Error creating roles table for guild ${guild}:`, err);
			callback(err);
		}
		else {
			console.log(`Roles table for guild ${guild} ensured:`, results);
			callback(null);
		}
	});
}

app.post('/post/:guild/:user/:xp/:auth', restrictToLocalhost, (req, res) => {
	const { guild, user, xp, auth } = req.params;
	const xpValue = parseInt(xp);

	if (auth !== process.env.AUTH) {
		return res.status(403).json({ message: 'Access denied. Auth token is missing' });
	}

	ensureGuildTableExists(guild, (err) => {
		if (err) {
			return res.status(500).json({ message: 'Internal server error' });
		}

		const tableName = `${guild}`;
		const insertOrUpdateQuery = `
            INSERT INTO \`${tableName}\` (user_id, xp)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE
            xp = xp + VALUES(xp)
        `;
		pool.query(insertOrUpdateQuery, [user, xpValue], (err) => {
			if (err) {
				console.error('Error updating XP:', err);
				res.status(500).json({ message: 'Internal server error' });
			}
			else {
				res.status(200).json({ guildId: guild, userId: user });
			}
		});
	});
});

app.get('/get/:guild/:user', (req, res) => {
	const { guild, user } = req.params;

	const tableName = `${guild}`;
	const selectQuery = `
        SELECT xp FROM \`${tableName}\` WHERE user_id = ?
    `;
	pool.query(selectQuery, [user], (err, results) => {
		if (err) {
			console.error('Error fetching XP:', err);
			res.status(500).json({ message: 'Internal server error' });
		}
		else if (results.length > 0) {
			res.status(200).json({ guildId: guild, userId: user, xp: results[0].xp });
		}
		else {
			res.status(404).json({ message: 'User not found' });
		}
	});
});

app.get('/leaderboard/:guild', (req, res) => {
	const { guild } = req.params;

	const tableName = `${guild}`;
	const selectQuery = `
        SELECT user_id, xp FROM \`${tableName}\`
        ORDER BY xp DESC
    `;
	pool.query(selectQuery, (err, results) => {
		if (err) {
			console.error('Error fetching leaderboard:', err);
			res.status(500).json({ message: 'Internal server error' });
		}
		else {
			res.status(200).json(results);
		}
	});
});

app.post('/admin/:guild/:action/:target', restrictToLocalhost, (req, res) => {
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

app.listen(PORT, () => {
	console.log(`Server running on http://localhost:${PORT}`);
});