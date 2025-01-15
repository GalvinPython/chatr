import type { QueryError } from "mysql2";

import { pool } from "..";

export interface OAuthUser {
    id: string;
    name: string;
    username: string;
    avatar: string;
    access_token: string;
    refresh_token: string;
    expires_at: Date;
}

export type OAuthUserWithoutTokens = Without<
    OAuthUser,
    "access_token" | "refresh_token" | "expires_at"
>;

type Without<T, K> = {
    [L in keyof T]: L extends K ? undefined : T[L];
};

export function getOAuthUser(
    id: string
): Promise<[QueryError, null] | [null, OAuthUser]> {
    return new Promise((resolve, reject) => {
        pool.query(
            "SELECT * FROM oauth_users WHERE id = ?",
            [id],
            (err, results) => {
                if (err) {
                    reject([err, null]);
                } else {
                    resolve([null, (results as OAuthUser[])[0]]);
                }
            }
        );
    });
}

export function updateOAuthUser(
    oauthUser: Partial<OAuthUser>
): Promise<[QueryError, false] | [null, true]> {
    return new Promise((resolve, reject) => {
        pool.query(
            `
			INSERT INTO oauth_users (id, name, username, avatar, access_token, refresh_token, expires_at)
			VALUES (?, ?, ?, ?, ?, ?, ?)
			ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          username = VALUES(username),
          avatar = VALUES(avatar),
          access_token = VALUES(access_token),
          refresh_token = VALUES(refresh_token),
          expires_at = VALUES(expires_at)
			`,
            [
                oauthUser.id,
                oauthUser.name,
                oauthUser.username,
                oauthUser.avatar,
                oauthUser.access_token,
                oauthUser.refresh_token,
                oauthUser.expires_at,
            ],
            (err) => {
                if (err) {
                    reject([err, false]);
                } else {
                    resolve([null, true]);
                }
            }
        );
    });
}
