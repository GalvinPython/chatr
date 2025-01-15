import { useQuery } from "@tanstack/react-query";
import { createContext, useContext } from "react";

import { User } from "@/types/api";

export const API_URL =
    process.env.NODE_ENV === "development"
        ? "http://localhost:18103"
        : "https://api.chatr.fun";

const UserContext = createContext<User | null>(null);

export const UserProvider = ({
    children,
    user,
}: {
    children: React.ReactNode;
    user: User;
}) => {
    return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
};

export const useUser = () => {
    const user = useContext(UserContext);
    const query = useQuery<User | null>({
        queryKey: ["user"],
        queryFn: async () => {
            const res = await fetch(`${API_URL}/user/me`, {
                credentials: "include",
            });

            if (res.status === 401) return null;

            return await res.json();
        },
        initialData: user,
    });

    return { user: query.data, isLoading: query.isLoading };
};
