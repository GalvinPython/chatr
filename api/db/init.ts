import { pool } from ".";

export async function initTables() {
  const createGuildsTable = `
		CREATE TABLE IF NOT EXISTS guilds (
			id VARCHAR(255) NOT NULL PRIMARY KEY,
			name VARCHAR(255),
			icon VARCHAR(255),
			members INT,
			cooldown INT DEFAULT 30000,
			updates_enabled BOOLEAN DEFAULT FALSE,
			updates_channel_id VARCHAR(255) DEFAULT NULL
		)
	`;
  const createUsersTable = `
		CREATE TABLE IF NOT EXISTS users (
			id VARCHAR(255) NOT NULL,
			guild_id VARCHAR(255) NOT NULL,
			name VARCHAR(255),
			nickname VARCHAR(255),
			pfp VARCHAR(255),
			xp INT DEFAULT 0,
			level INT DEFAULT 0,
			xp_needed_next_level INT,
			progress_next_level DECIMAL(6, 2),
			PRIMARY KEY (id, guild_id)
		)
	`;
  // FOREIGN KEY (guild_id) REFERENCES guilds(id)
  const createRolesTable = `
		CREATE TABLE IF NOT EXISTS roles (
			id VARCHAR(255) NOT NULL PRIMARY KEY,
			guild_id VARCHAR(255) NOT NULL,
			name VARCHAR(255),
			level INT NOT NULL
		)
	`;
  // FOREIGN KEY (guild_id) REFERENCES guilds(id)

  pool.query(createGuildsTable, (err) => {
    if (err) {
      console.error("Error creating guilds table:", err);
    } else {
      console.log("Guilds table created");
    }
  });

  pool.query(createUsersTable, (err) => {
    if (err) {
      console.error("Error creating users table:", err);
    } else {
      console.log("Users table created");
    }
  });

  pool.query(createRolesTable, (err) => {
    if (err) {
      console.error("Error creating roles table:", err);
    } else {
      console.log("Roles table created");
    }
  });
}
