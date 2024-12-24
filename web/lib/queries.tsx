import { useQuery } from "@tanstack/react-query";

export interface User {
    id: string;
    name: string;
    username: string;
    avatar: string;
    access_token: string;
    refresh_token: string;
    expires_at: Date;
}

export const API_URL =
    process.env.NODE_ENV === "development"
        ? "http://localhost:18103"
        : "https://api.chatr.fun";

export const useUser = () => {
    const query = useQuery<User | null>({
        queryKey: ["user"],
        queryFn: async () => {
            const res = await fetch(`${API_URL}/auth/user`, {
                credentials: "include",
            });

            if (res.status === 401) return null;

            return await res.json();
        },
    });

    return { user: query.data, isLoading: query.isLoading };
};
