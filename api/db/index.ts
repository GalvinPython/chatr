import mysql from "mysql2";

// Create a MySQL connection pool
export const pool = mysql.createPool({
	host: process.env.MYSQL_ADDRESS as string,
	port: parseInt(process.env.MYSQL_PORT as string),
	user: process.env.MYSQL_USER as string,
	password: process.env.MYSQL_PASSWORD as string,
	database: process.env.MYSQL_DATABASE as string,
});

export * from './init';
export * from './queries/guilds';
export * from './queries/users';
