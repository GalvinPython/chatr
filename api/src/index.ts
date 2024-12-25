import type { RowDataPacket } from "mysql2";

import crypto from "node:crypto";

import express, {
    type NextFunction,
    type Request,
    type Response,
} from "express";
import cors from "cors";
import jwt, { type JwtPayload } from "jsonwebtoken";

import {
    getBotInfo,
    getGuild,
    getUser,
    getUsers,
    initTables,
    pool,
    updateGuild,
    enableUpdates,
    disableUpdates,
    setCooldown,
    setUpdatesChannel,
    setXP,
    setLevel,
    removeGuild,
    removeUser,
    getAllServersWithUpdatesEnabled,
    addUserToTrackingData,
    getGuildTrackingData,
    getUsersTrackingData,
} from "./db";
import {
    getOAuthUser,
    updateOAuthUser,
    type OAuthUser,
} from "./db/queries/oauth-users";

const app = express();
const PORT = 18103;

app.use(cors());
app.use(express.json());
app.use((req, _res, next) => {
    if (req.headers.cookie) {
        const cookies = parseCookies(req.headers.cookie);

        req.cookies = cookies;
    }
    next();
});

app.disable("x-powered-by");

console.log("Initializing tables...");
await initTables();
console.log("Tables initialized");

function authMiddleware(req: Request, res: Response, next: NextFunction) {
    if (
        !req.headers.authorization ||
        req.headers.authorization !== process.env.AUTH
    ) {
        return res.status(403).json({ message: "Access denied" });
    }
    next();
}

app.post("/post/:guild", authMiddleware, async (req, res) => {
    const { guild } = req.params;
    const { name, icon, members } = req.body;

    const [err, results] = await updateGuild({
        id: guild,
        name,
        icon,
        members,
    });

    if (err) {
        res.status(500).json({ message: "Internal server error" });
    } else {
        res.status(200).json(results);
    }
});

app.post("/post/:guild/remove", authMiddleware, async (req, res) => {
    const { guild } = req.params;
    const [err, results] = await removeGuild(guild);

    if (err) {
        res.status(500).json({ message: "Internal server error" });
    } else {
        res.status(200).json(results);
    }
});

app.post("/post/:guild/:user/remove", authMiddleware, async (req, res) => {
    const { guild, user } = req.params;
    const [err, results] = await removeUser(user, guild);

    if (err) {
        res.status(500).json({ message: "Internal server error" });
    } else {
        res.status(200).json(results);
    }
});

app.post("/post/:guild/:user", authMiddleware, async (req, res) => {
    const { guild, user } = req.params;
    const { name, pfp, xp, nickname } = req.body;

    console.log(req.body);
    const xpValue = parseInt(xp);

    if (xpValue == 0) {
        const updateQuery = `
		INSERT INTO users
			(id, guild_id, pfp, name, nickname)
		VALUES (?, ?, ?, ?, ?)
		ON DUPLICATE KEY UPDATE
			pfp = VALUES(pfp),
			name = VALUES(name),
			nickname = VALUES(nickname)
		`;

        pool.query(updateQuery, [user, guild, pfp, name, nickname], (err) => {
            if (err) {
                console.error("Error updating XP:", err);

                return res
                    .status(500)
                    .json({ success: false, message: "Internal server error" });
            } else {
                res.status(200).json({
                    success: true,
                });
            }
        });
    }

    const [err, result] = await getUser(user, guild);

    if (err) {
        console.error("Error fetching XP:", err);

        return res.status(500).json({ message: "Internal server error" });
    }

    const currentXp = result?.xp ?? 0;
    const currentLevelSaved = result?.level ?? 0;
    const newXp = currentXp + xpValue;

    const currentLevel = Math.floor(Math.sqrt(newXp / 100));
    const nextLevel = currentLevel + 1;
    const nextLevelXp = Math.pow(nextLevel, 2) * 100;
    const xpNeededForNextLevel = nextLevelXp - newXp;
    const currentLevelXp = Math.pow(currentLevel, 2) * 100;
    const progressToNextLevel =
        ((newXp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;

    const updateQuery = `
    INSERT INTO users
        (id, guild_id, xp, pfp, name, nickname, level, xp_needed_next_level, progress_next_level)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
        xp = VALUES(xp),
        pfp = VALUES(pfp),
        name = VALUES(name),
        nickname = VALUES(nickname),
        level = VALUES(level),
        xp_needed_next_level = VALUES(xp_needed_next_level),
        progress_next_level = VALUES(progress_next_level)
	`;

    pool.query(
        updateQuery,
        [
            user,
            guild,
            newXp,
            pfp,
            name,
            nickname,
            currentLevel,
            xpNeededForNextLevel,
            progressToNextLevel.toFixed(2),
        ],
        (err) => {
            if (err) {
                console.error("Error updating XP:", err);

                return res
                    .status(500)
                    .json({ success: false, message: "Internal server error" });
            } else {
                res.status(200).json({
                    success: true,
                    sendUpdateEvent: currentLevelSaved !== currentLevel,
                    level: currentLevel,
                });
            }
        }
    );
});

app.get("/get/botinfo", async (_req, res) => {
    const [err, data] = await getBotInfo();

    if (err) {
        console.error("Error fetching bot info:", err);

        return res.status(500).json({ message: "Internal server error" });
    }

    return res.status(200).json(data);
});

app.get("/get/dbusage", (_req, res) => {
    pool.query(
        `SELECT table_schema AS "name", SUM(data_length + index_length) / 1024 / 1024 AS "size" FROM information_schema.TABLES GROUP BY table_schema;`,
        (err, results) => {
            if (err) {
                console.error("Error fetching database size:", err);

                return res
                    .status(500)
                    .json({ message: "Internal server error" });
            } else {
                const discordXpBot = (results as RowDataPacket[]).find(
                    (result) => result.name === process.env.MYSQL_DATABASE
                );

                if (discordXpBot) {
                    return res
                        .status(200)
                        .json({ sizeInMB: parseFloat(discordXpBot.size) });
                } else {
                    return res
                        .status(404)
                        .json({ message: "Database not found" });
                }
            }
        }
    );
});

app.get("/get/tracking/:guild", async (req, res) => {
    const { guild } = req.params;

    const [err, data] = await getGuildTrackingData(guild, null);

    if (err) {
        console.error("Error fetching tracking data:", err);

        return res.status(500).json({ message: "Internal server error" });
    }

    return res.status(200).json(data);
});

app.get("/get/tracking/:guild/:user", async (req, res) => {
    const { guild, user } = req.params;

    const [err, data] = await getUsersTrackingData(user, guild);

    if (err) {
        console.error("Error fetching tracking data:", err);

        return res.status(500).json({ message: "Internal server error" });
    }

    return res.status(200).json(data);
});

app.get("/get/:guild/:user", async (req, res) => {
    const { guild, user } = req.params;

    const [err, result] = await getUser(user, guild);

    if (err) {
        console.error("Error fetching user:", err);
        res.status(500).json({ message: "Internal server error" });
    } else if (result) {
        res.status(200).json(result);
    } else {
        res.status(404).json({ message: "User not found" });
    }
});

app.get("/get/:guild", async (req, res) => {
    const { guild } = req.params;

    const [guildErr, guildData] = await getGuild(guild);
    const [usersErr, usersData] = await getUsers(guild);

    if (guildErr) {
        console.error("Error fetching guild:", guildErr);
        res.status(500).json({ message: "Internal server error" });
    } else if (usersErr) {
        console.error("Error fetching users:", usersErr);
        res.status(500).json({ message: "Internal server error" });
    } else if (!guildData) {
        res.status(404).json({ message: "Guild not found" });
    } else {
        const totalXp = usersData.reduce((sum, user) => sum + user.xp, 0);

        res.status(200).json({
            guild: guildData,
            leaderboard: usersData,
            totalXp: totalXp,
        });
    }
});

app.post("/admin/:action/:guild/:target", authMiddleware, async (req, res) => {
    const { guild, action, target } = req.params;
    const { extraData } = req.body;

    switch (action) {
        case "include":
            // TODO: implement this
            // target: channel id
            // run function to include target to guild
            break;
        case "exclude":
            // TODO: implement this
            // target: channel id
            // run function to exclude target from guild
            break;
        case "updates":
            if (
                target !== "enable" &&
                target !== "disable" &&
                target !== "set" &&
                target !== "get"
            ) {
                return res.status(400).json({ message: "Illegal request" });
            }

            switch (target) {
                case "enable":
                    try {
                        const [err, success] = await enableUpdates(guild);

                        if (err) {
                            return res.status(500).json({
                                message: "Internal server error",
                                err,
                            });
                        } else {
                            return res.status(200).json(success);
                        }
                    } catch (err) {
                        return res
                            .status(500)
                            .json({ message: "Internal server error", err });
                    }
                case "disable":
                    try {
                        const [err, success] = await disableUpdates(guild);

                        if (err) {
                            return res.status(500).json({
                                message: "Internal server error",
                                err,
                            });
                        } else {
                            return res.status(200).json(success);
                        }
                    } catch (err) {
                        return res
                            .status(500)
                            .json({ message: "Internal server error", err });
                    }
                case "set":
                    if (
                        !extraData ||
                        typeof extraData.channelId === "undefined"
                    ) {
                        return res
                            .status(400)
                            .json({ message: "Illegal request" });
                    }

                    try {
                        const [err, success] = await setUpdatesChannel(
                            guild,
                            extraData.channelId
                        );

                        if (err) {
                            return res.status(500).json({
                                message: "Internal server error",
                                err,
                            });
                        } else {
                            return res.status(200).json(success);
                        }
                    } catch (err) {
                        return res
                            .status(500)
                            .json({ message: "Internal server error", err });
                    }
                default:
                    if (guild == "all") {
                        try {
                            const [err, data] =
                                await getAllServersWithUpdatesEnabled();

                            if (err) {
                                return res.status(500).json({
                                    message: "Internal server error",
                                    err,
                                });
                            }

                            return res.status(200).json(data);
                        } catch (error) {
                            return res
                                .status(500)
                                .json({ message: "Internal server error" });
                        }
                    }
                    try {
                        const [err, data] = await getGuild(guild);

                        if (err) {
                            return res.status(500).json({
                                message: "Internal server error",
                                err,
                            });
                        }

                        return res.status(200).json({
                            enabled: (data?.updates_enabled ?? 1) === 1,
                            channel: data?.updates_channel_id ?? null,
                        });
                    } catch (error) {
                        return res
                            .status(500)
                            .json({ message: "Internal server error" });
                    }
            }
        case "roles":
            if (target !== "add" && target !== "remove" && target !== "get") {
                return res.status(400).json({ message: "Illegal request" });
            }

            if ((target === "add" || target === "remove") && !extraData) {
                return res.status(400).json({ message: "Illegal request" });
            }

            switch (target) {
                case "get":
                    try {
                        const data = await adminRolesGet(guild);

                        return res.status(200).json(data);
                    } catch (error) {
                        return res
                            .status(500)
                            .json({ message: "Internal server error" });
                    }
                case "remove":
                    try {
                        const data = await adminRolesRemove(
                            guild,
                            extraData.role
                        );

                        return res.status(200).json(data);
                    } catch (error) {
                        return res
                            .status(500)
                            .json({ message: "Internal server error" });
                    }
                case "add":
                    try {
                        const data = await adminRolesAdd(
                            guild,
                            extraData.role,
                            extraData.level
                        );

                        return res.status(200).json(data);
                    } catch (error) {
                        return res
                            .status(500)
                            .json({ message: "Internal server error" });
                    }
                default:
                    return res
                        .status(500)
                        .json({ message: "Internal server error" });
            }
        case "cooldown":
            if (target !== "set" && target !== "get") {
                return res.status(400).json({ message: "Illegal request" });
            }

            if (target === "set" && !extraData) {
                return res.status(400).json({ message: "Illegal request" });
            }

            switch (target) {
                case "get":
                    try {
                        const [err, data] = await getGuild(guild);

                        if (err) {
                            return res
                                .status(500)
                                .json({ message: "Internal server error" });
                        }

                        return res
                            .status(200)
                            .json({ cooldown: data?.cooldown ?? 30_000 });
                    } catch (error) {
                        return res
                            .status(500)
                            .json({ message: "Internal server error" });
                    }
                case "set":
                    try {
                        const data = await setCooldown(
                            guild,
                            extraData.cooldown
                        );

                        return res.status(200).json(data);
                    } catch (error) {
                        return res
                            .status(500)
                            .json({ message: "Internal server error" });
                    }
                default:
                    return res
                        .status(500)
                        .json({ message: "Internal server error" });
            }
        case "set": {
            if (target !== "xp" && target !== "level") {
                return res.status(400).json({ message: "Illegal request" });
            }

            if (!extraData || !extraData.user || !extraData.value) {
                return res.status(400).json({ message: "Illegal request" });
            }

            switch (target) {
                case "xp":
                    try {
                        const [err, success] = await setXP(
                            guild,
                            extraData.user,
                            extraData.value
                        );

                        if (err) {
                            return res.status(500).json({
                                message: "Internal server error",
                                err,
                            });
                        } else {
                            return res.status(200).json(success);
                        }
                    } catch (err) {
                        return res
                            .status(500)
                            .json({ message: "Internal server error", err });
                    }
                case "level":
                    try {
                        const [err, success] = await setLevel(
                            guild,
                            extraData.user,
                            extraData.value
                        );

                        if (err) {
                            return res.status(500).json({
                                message: "Internal server error",
                                err,
                            });
                        } else {
                            return res.status(200).json(success);
                        }
                    } catch (err) {
                        return res
                            .status(500)
                            .json({ message: "Internal server error", err });
                    }
                default:
                    return res
                        .status(500)
                        .json({ message: "Internal server error" });
            }
        }
        case "sync": {
            if (
                target !== "polaris" &&
                target !== "mee6" &&
                target !== "lurkr"
            ) {
                return res.status(400).json({ message: "Illegal request" });
            }

            switch (target) {
                case "polaris": {
                    try {
                        const [err, success] = await syncFromPolaris(guild);

                        if (err) {
                            if (
                                err instanceof Error &&
                                err.message === "Server not found in Polaris"
                            ) {
                                return res.status(404).json({
                                    message: "Server not found in Polaris",
                                });
                            }

                            return res.status(500).json({
                                message: "Internal server error",
                                err,
                            });
                        } else {
                            return res.status(200).json(success);
                        }
                    } catch (err) {
                        return res
                            .status(500)
                            .json({ message: "Internal server error", err });
                    }
                }
                case "mee6": {
                    try {
                        const [err, success] = await syncFromMee6(guild);

                        if (err) {
                            if (
                                err instanceof Error &&
                                err.message === "Server not found in MEE6"
                            ) {
                                return res.status(404).json({
                                    message: "Server not found in MEE6",
                                });
                            }

                            return res.status(500).json({
                                message: "Internal server error",
                                err,
                            });
                        } else {
                            return res.status(200).json(success);
                        }
                    } catch (err) {
                        return res
                            .status(500)
                            .json({ message: "Internal server error", err });
                    }
                }
                case "lurkr": {
                    try {
                        const [err, success] = await syncFromLurkr(guild);

                        if (err) {
                            if (
                                err instanceof Error &&
                                err.message === "Server not found in Lurkr"
                            ) {
                                return res.status(404).json({
                                    message: "Server not found in Lurkr",
                                });
                            }

                            return res.status(500).json({
                                message: "Internal server error",
                                err,
                            });
                        } else {
                            return res.status(200).json(success);
                        }
                    } catch (err) {
                        return res
                            .status(500)
                            .json({ message: "Internal server error", err });
                    }
                }
                default:
                    return res
                        .status(500)
                        .json({ message: "Internal server error" });
            }
        }
        case "tracking": {
            await addUserToTrackingData(target, guild);
            break;
        }
        default:
            return res.status(400).json({ message: "Illegal request" });
    }
});

const API_URL =
    process.env.NODE_ENV === "development"
        ? `http://localhost:${PORT}`
        : "https://api.chatr.fun";
const WEBSITE_URL =
    process.env.NODE_ENV === "development"
        ? `http://localhost:56413`
        : "https://chatr.fun";
const REDIRECT_URI = `${API_URL}/auth/callback`;

app.get("/auth/login", (_req, res) => {
    const params = new URLSearchParams();
    const state = crypto.randomBytes(32).toString("hex");

    params.append("client_id", process.env.DISCORD_CLIENT_ID!);
    params.append("redirect_uri", REDIRECT_URI);
    params.append("response_type", "code");
    params.append("scope", "identify guilds");
    params.append("state", state);

    res.appendHeader(
        "Set-Cookie",
        serializeCookie("state", state, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 10,
        })
    );
    res.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
});

app.get("/auth/callback", async (req, res) => {
    const { code, state } = req.query;
    const storedState = req.cookies.get("state");

    if (
        !code ||
        typeof code !== "string" ||
        !state ||
        typeof state !== "string" ||
        !storedState
    )
        return res.status(400).json({ message: "Illegal request" });

    if (state !== storedState)
        return res.status(400).json({ message: "Invalid state" });

    const body = new URLSearchParams();

    body.append("client_id", process.env.DISCORD_CLIENT_ID!);
    body.append("client_secret", process.env.DISCORD_CLIENT_SECRET!);
    body.append("grant_type", "authorization_code");
    body.append("code", code);
    body.append("redirect_uri", REDIRECT_URI);
    body.append("scope", "identify guilds");

    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        body,
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
    });

    if (tokenResponse.status !== 200) {
        console.error("Error fetching token:", tokenResponse);

        return res.status(500).json({ message: "Internal server error" });
    }

    const tokenData = await tokenResponse.json();

    const userResponse = await fetch("https://discord.com/api/users/@me", {
        headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
        },
    });

    if (userResponse.status !== 200) {
        console.error("Error fetching user:", userResponse);

        return res.status(500).json({ message: "Internal server error" });
    }

    const userData = await userResponse.json();

    const [err, success] = await updateOAuthUser({
        id: userData.id,
        name: userData.display_name ?? userData.username,
        username: userData.username,
        avatar: `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.webp`,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: new Date(
            new Date().getTime() + tokenData.expires_in * 1000
        ),
    });

    if (!success) {
        console.error("Error updating OAuth user:", err);

        return res.status(500).json({ message: "Internal server error" });
    }

    const token = jwt.sign(
        {
            sub: userData.id,
        },
        process.env.JWT_SECRET!,
        {
            expiresIn: "30d",
        }
    );

    res.appendHeader(
        "Set-Cookie",
        serializeCookie("token", token, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 60 * 24 * 400,
        })
    );
    res.redirect(`${WEBSITE_URL}/dashboard`);
});

app.get(
    "/auth/user",
    cors({
        origin: ["http://localhost:56413", "https://chatr.fun"],
        credentials: true,
    }),
    async (req, res) => {
        const user = await getUserFromRequest(req);

        if (!user) return res.status(401).json({ message: "Unauthorized" });

        res.json({
            ...user,
            access_token: undefined,
            refresh_token: undefined,
            expires_at: undefined,
        });
    }
);

app.post(
    "/auth/logout",
    cors({
        origin: ["http://localhost:56413", "https://chatr.fun"],
        credentials: true,
    }),
    async (req, res) => {
        if (!(await getUserFromRequest(req))) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        res.clearCookie("token");

        return res.sendStatus(200);
    }
);

app.get("/auth/user/guilds", async (req, res) => {
    const user = await getUserFromRequest(req);

    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const botGuildsResponse = await fetch(
        "https://discord.com/api/users/@me/guilds",
        {
            headers: {
                Authorization: `Bot ${process.env.DISCORD_TOKEN_DEV ?? process.env.DISCORD_TOKEN}`,
            },
        }
    );
    const botGuilds = await botGuildsResponse.json();

    const [err, accessToken] = await getAccessToken(user);

    if (err) return res.status(500).json({ message: err });

    const userGuildsResponse = await fetch(
        "https://discord.com/api/users/@me/guilds",
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );
    const userGuilds = await userGuildsResponse.json();

    const filteredGuilds = userGuilds.filter(
        (guild: any) => guild.owner || (guild.permissions & 0x20) === 0x20
    );

    res.json(
        filteredGuilds
            .map((guild: any) => ({
                ...guild,
                icon: guild.icon
                    ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.webp`
                    : null,
                botIsInGuild: botGuilds.some(
                    (botGuild: any) => botGuild.id === guild.id
                ),
            }))
            .sort((a: any, b: any) => {
                if (a.botIsInGuild === b.botIsInGuild) {
                    return a.name.localeCompare(b.name);
                }

                return Number(b.botIsInGuild) - Number(a.botIsInGuild);
            })
    );
});

app.options(
    "/auth/update-guild",
    cors({
        origin: ["http://localhost:56413", "https://chatr.fun"],
        credentials: true,
    })
);
app.put(
    "/auth/update-guild",
    cors({
        origin: ["http://localhost:56413", "https://chatr.fun"],
        credentials: true,
    }),
    async (req, res) => {
        if (!(await getUserFromRequest(req)))
            return res.status(401).json({ message: "Unauthorized" });

        const body = req.body;
        const { guild } = req.body;

        if (!guild) return res.status(400).json({ message: "Illegal request" });

        if (body.cooldown) {
            await setCooldown(guild, body.cooldown);
        }

        if (body.updates.enabled === true) {
            await enableUpdates(guild);
        } else if (body.updates.enabled === false) {
            await disableUpdates(guild);
        }

        if (body.updates.channel) {
            await setUpdatesChannel(guild, body.updates.channel);
        }

        return res.sendStatus(204);
    }
);

// TODO: fetch from the bot itself using discord.js
// (would allow us to do permission filtering)
app.get("/channels/:guild", authMiddleware, async (req, res) => {
    const { guild } = req.params;

    const channelsResponse = await fetch(
        `https://discord.com/api/v10/guilds/${guild}/channels`,
        {
            headers: {
                Authorization: `Bot ${process.env.DISCORD_TOKEN_DEV ?? process.env.DISCORD_TOKEN}`,
            },
        }
    );
    const channelsData = await channelsResponse.json();

    if (channelsData.code === 50007) {
        return res.status(404).json({ message: "Guild not found" });
    }

    const channels = channelsData
        .filter((channel: any) => channel.type === 0)
        .sort((a: any, b: any) => a.position - b.position);

    res.json(channels);
});

app.get("/invite", (req, res) => {
    const guildId = req.query.guild_id;

    if (!guildId || typeof guildId !== "string")
        res.status(308).redirect(
            "https://discord.com/oauth2/authorize?client_id=1245807579624378601&permissions=1099780115520&integration_type=0&scope=bot+applications.commands"
        );
    else {
        const params = new URLSearchParams();

        params.append("client_id", process.env.DISCORD_CLIENT_ID!);
        params.append("permissions", "1099780115520");
        params.append("integration_type", "0");
        params.append("scope", "bot applications.commands identify guilds");
        params.append("guild_id", guildId);
        params.append("response_type", "code");
        params.append("redirect_uri", REDIRECT_URI);
        res.redirect(
            `https://discord.com/oauth2/authorize?${params.toString()}`
        );
    }
});

app.get("/support", (_req, res) =>
    res.status(308).redirect("https://discord.gg/fpJVTkVngm")
);

app.use((_req, res) => {
    res.status(404).send();
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

//#region Cookies
// Mostly taken from https://github.com/pilcrowonpaper/oslo/blob/main/src/cookie/index.ts
interface CookieAttributes {
    secure?: boolean;
    path?: string;
    domain?: string;
    sameSite?: "lax" | "strict" | "none";
    httpOnly?: boolean;
    maxAge?: number;
    expires?: Date;
}

function parseCookies(header: string): Map<string, string> {
    const cookies = new Map<string, string>();
    const items = header.split("; ");

    for (const item of items) {
        const pair = item.split("=");
        const rawKey = pair[0];
        const rawValue = pair[1] ?? "";

        if (!rawKey) continue;
        cookies.set(decodeURIComponent(rawKey), decodeURIComponent(rawValue));
    }

    return cookies;
}

function serializeCookie(
    name: string,
    value: string,
    attributes: CookieAttributes
): string {
    const keyValueEntries: Array<[string, string] | [string]> = [];

    keyValueEntries.push([encodeURIComponent(name), encodeURIComponent(value)]);
    if (attributes?.domain !== undefined) {
        keyValueEntries.push(["Domain", attributes.domain]);
    }
    if (attributes?.expires !== undefined) {
        keyValueEntries.push(["Expires", attributes.expires.toUTCString()]);
    }
    if (attributes?.httpOnly) {
        keyValueEntries.push(["HttpOnly"]);
    }
    if (attributes?.maxAge !== undefined) {
        keyValueEntries.push(["Max-Age", attributes.maxAge.toString()]);
    }
    if (attributes?.path !== undefined) {
        keyValueEntries.push(["Path", attributes.path]);
    }
    if (attributes?.sameSite === "lax") {
        keyValueEntries.push(["SameSite", "Lax"]);
    }
    if (attributes?.sameSite === "none") {
        keyValueEntries.push(["SameSite", "None"]);
    }
    if (attributes?.sameSite === "strict") {
        keyValueEntries.push(["SameSite", "Strict"]);
    }
    if (attributes?.secure) {
        keyValueEntries.push(["Secure"]);
    }

    return keyValueEntries.map((pair) => pair.join("=")).join("; ");
}

async function getUserFromRequest(req: Request): Promise<OAuthUser | null> {
    const token = req.cookies?.get("token");

    if (!token) return null;

    let decoded: JwtPayload;

    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    } catch (err) {
        // most likely an invalid or expired token
        return null;
    }

    const userId = decoded.sub;

    if (!userId) return null;

    const [err, user] = await getOAuthUser(userId);

    if (err) return null;

    return user;
}

async function getAccessToken(
    user: OAuthUser
): Promise<[string, null] | [null, string]> {
    let accessToken = user.access_token;

    if (new Date().getTime() > user.expires_at.getTime()) {
        const body = new URLSearchParams();

        body.append("client_id", process.env.DISCORD_CLIENT_ID!);
        body.append("client_secret", process.env.DISCORD_CLIENT_SECRET!);
        body.append("grant_type", "refresh_token");
        body.append("refresh_token", user.refresh_token);
        body.append("scope", "identify guilds");

        const tokenResponse = await fetch(
            "https://discord.com/api/oauth2/token",
            {
                method: "POST",
                body,
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            }
        );

        if (tokenResponse.status !== 200) {
            console.error("Error fetching token:", tokenResponse);

            return ["Internal server error", null];
        }

        const tokenData = await tokenResponse.json();

        accessToken = tokenData.access_token;
    }

    return [null, accessToken];
}
//#endregion

// TODO: actually implement this in a real way
//#region Admin: Roles
async function adminRolesGet(guild: string) {
    const selectRolesQuery = `SELECT id, level FROM roles WHERE guild_id = ?`;

    return new Promise((resolve, reject) => {
        pool.query(selectRolesQuery, [guild], (err, results) => {
            if (err) {
                console.error("Error fetching roles:", err);
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
}

async function adminRolesRemove(guild: string, role: string) {
    const deleteRoleQuery = `
		DELETE FROM roles
		WHERE id = ? AND guild_id = ?
	`;

    return new Promise((resolve, reject) => {
        pool.query(deleteRoleQuery, [role, guild], (err, results) => {
            if (err) {
                console.error("Error removing role:", err);
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
}

async function adminRolesAdd(guild: string, role: string, level: number) {
    const insertRoleQuery = `
		INSERT INTO roles (id, guild_id, level)
		VALUES (?, ?, ?)
	`;

    return new Promise((resolve, reject) => {
        pool.query(insertRoleQuery, [role, guild, level], (err, results) => {
            if (err) {
                console.error("Error adding role:", err);
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
}
//#endregion

//#region Syncing
async function syncFromPolaris(guild: string) {
    const res = await fetch(
        `https://gdcolon.com/polaris/api/leaderboard/${guild}`
    );
    const data = await res.json();

    if (data.apiError && data.code === "invalidServer") {
        return [new Error("Server not found in Polaris"), false];
    }
    const users = data.leaderboard;

    for (let i = 1; i < data.pageInfo.pageCount; i++) {
        const res = await fetch(
            `https://gdcolon.com/polaris/api/leaderboard/${guild}?page=${i + 1}`
        );
        const data = await res.json();

        users.push(...data.leaderboard);
    }

    if (users.length === 0) {
        return [new Error("No users found"), false];
    }

    try {
        for (const user of users) {
            const xpValue = user.xp;
            const level = Math.floor(Math.sqrt(xpValue / 100));
            const nextLevel = level + 1;
            const nextLevelXp = Math.pow(nextLevel, 2) * 100;
            const xpNeededForNextLevel = nextLevelXp - xpValue;
            const currentLevelXp = Math.pow(level, 2) * 100;
            const progressToNextLevel =
                ((xpValue - currentLevelXp) / (nextLevelXp - currentLevelXp)) *
                100;

            await new Promise((resolve, reject) => {
                pool.query(
                    `INSERT INTO users (id, guild_id, xp, pfp, name, nickname, level, xp_needed_next_level, progress_next_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        user.id,
                        guild,
                        xpValue,
                        user.avatar,
                        user.username,
                        user.nickname ?? user.displayName,
                        level,
                        xpNeededForNextLevel,
                        progressToNextLevel.toFixed(2),
                    ],
                    (err) => {
                        if (err) {
                            console.error("Error syncing from Polaris:", err);
                            reject(err);
                        } else {
                            resolve(null);
                        }
                    }
                );
            });
        }

        return [null, true];
    } catch (err) {
        return [err, false];
    }
}

async function syncFromMee6(guild: string) {
    const res = await fetch(
        `https://mee6.xyz/api/plugins/levels/leaderboard/${guild}?limit=1000&page=0`
    );
    const data = await res.json();

    if (data.status_code === 404) {
        return [new Error("Server not found in MEE6"), false];
    }
    const users = data.players;
    let pageNumber = 1;

    // this is needed because MEE6 doesn't give us the total amount of pages
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const res = await fetch(
            `https://mee6.xyz/api/plugins/levels/leaderboard/${guild}?limit=1000&page=${pageNumber}`
        );
        const data = await res.json();

        users.push(...data.players);
        if (data.players.length < 1000) break;
        pageNumber += 1;
    }

    if (users.length === 0) {
        return [new Error("No users found"), false];
    }

    try {
        for (const user of users) {
            const xpValue = user.xp;
            const level = Math.floor(Math.sqrt(xpValue / 100));
            const nextLevel = level + 1;
            const nextLevelXp = Math.pow(nextLevel, 2) * 100;
            const xpNeededForNextLevel = nextLevelXp - xpValue;
            const currentLevelXp = Math.pow(level, 2) * 100;
            const progressToNextLevel =
                ((xpValue - currentLevelXp) / (nextLevelXp - currentLevelXp)) *
                100;

            await new Promise((resolve, reject) => {
                pool.query(
                    `INSERT INTO users (id, guild_id, xp, pfp, name, nickname, level, xp_needed_next_level, progress_next_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        user.id,
                        guild,
                        xpValue,
                        `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp`,
                        user.username,
                        user.username,
                        level,
                        xpNeededForNextLevel,
                        progressToNextLevel.toFixed(2),
                    ],
                    (err) => {
                        if (err) {
                            console.error("Error syncing from MEE6:", err);
                            reject(err);
                        } else {
                            resolve(null);
                        }
                    }
                );
            });
        }

        return [null, true];
    } catch (err) {
        return [err, false];
    }
}

async function syncFromLurkr(guild: string) {
    const res = await fetch(`https://api.lurkr.gg/v2/levels/${guild}?page=1`);
    const data = await res.json();

    if (data.message === "Guild no found") {
        return [new Error("Server not found in Lurkr"), false];
    }
    const users = data.levels;

    if (users.length === 0) {
        return [new Error("No users found"), false];
    }

    let pageNumber = 2;

    // this is needed because Lurkr doesn't give us the total amount of pages
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const res = await fetch(
            `https://api.lurkr.gg/v2/levels/${guild}?page=${pageNumber}`
        );
        const data = await res.json();

        users.push(...data.levels);
        if (data.levels.length < 100) break;
        pageNumber += 1;
    }

    try {
        for (const user of users) {
            const xpValue = user.xp;
            const level = Math.floor(Math.sqrt(user.xp / 100));
            const nextLevel = level + 1;
            const nextLevelXp = Math.pow(nextLevel, 2) * 100;
            const xpNeededForNextLevel = nextLevelXp - user.xp;
            const currentLevelXp = Math.pow(level, 2) * 100;
            const progressToNextLevel =
                ((user.xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) *
                100;

            await new Promise((resolve, reject) => {
                pool.query(
                    `INSERT INTO users (id, guild_id, xp, pfp, name, nickname, level, xp_needed_next_level, progress_next_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        user.userId,
                        guild,
                        xpValue,
                        `https://cdn.discordapp.com/avatars/${user.userId}/${user.user.avatar}.webp`,
                        user.user.username,
                        user.user.username,
                        level,
                        xpNeededForNextLevel,
                        progressToNextLevel.toFixed(2),
                    ],
                    (err) => {
                        if (err) {
                            console.error("Error syncing from Lurkr:", err);
                            reject(err);
                        } else {
                            resolve(null);
                        }
                    }
                );
            });
        }

        return [null, true];
    } catch (err) {
        return [err, false];
    }
}
//#endregion
