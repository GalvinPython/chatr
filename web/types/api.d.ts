export interface User {
    id: string;
    name: string;
    username: string;
    avatar: string;
    access_token: string;
    refresh_token: string;
    expires_at: Date;
}

export interface Guild {
    id: string;
    name: string;
    icon?: string;
    botIsInGuild: boolean;
}
