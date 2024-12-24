import { useRouter } from "next/router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@nextui-org/react";
import Link from "next/link";

import DefaultLayout from "@/layouts/default";
import { API_URL, useUser } from "@/lib/queries";
import { subtitle, title } from "@/components/primitives";
import { LoaderIcon } from "@/components/icons";
import { ServerIcon } from "@/components/server-icon";

interface Guild {
    id: string;
    name: string;
    icon?: string;
    botIsInGuild: boolean;
}

export default function Dashboard() {
    const router = useRouter();
    const { user, isLoading: userLoading } = useUser();
    const { data: guilds, isLoading: guildsLoading } = useQuery<Guild[]>({
        queryKey: ["guilds"],
        queryFn: async () => {
            const res = await fetch(`${API_URL}/auth/user/guilds`, {
                credentials: "include",
            });

            if (res.status === 401) return null;

            return await res.json();
        },
    });

    if (!user && !userLoading) return router.push("/");

    return (
        <DefaultLayout>
            <section className="flex flex-col items-center justify-center gap-4 py-8">
                <div className="inline-block max-w-lg text-center justify-center">
                    <h1 className={title()}>Dashboard</h1>
                    <h4 className={subtitle({ class: "mt-4" })}>
                        Manage and update your server&apos;s settings.
                    </h4>
                </div>
                {userLoading || guildsLoading || !guilds ? (
                    <LoaderIcon
                        className="animate-spin"
                        height={56}
                        width={56}
                    />
                ) : (
                    <>
                        {guilds.length === 0 ? (
                            <p>You are not admin in any servers.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {guilds.map((guild) => (
                                    <div
                                        key={guild.id}
                                        className="bg-gray-800 p-6 rounded-lg flex flex-col justify-center space-y-4 shadow-lg"
                                    >
                                        <div className="flex flex-col space-y-3 items-center justify-center">
                                            <ServerIcon guild={guild} />
                                            <span className="text-white text-2xl font-bold text-center">
                                                {guild.name}
                                            </span>
                                        </div>
                                        <Button
                                            as={Link}
                                            color={
                                                guild.botIsInGuild
                                                    ? "secondary"
                                                    : "default"
                                            }
                                            href={
                                                guild.botIsInGuild
                                                    ? `/dashboard/${guild.id}`
                                                    : `${API_URL}/invite?guild_id=${guild.id}`
                                            }
                                            variant="shadow"
                                        >
                                            {guild.botIsInGuild
                                                ? "Manage"
                                                : "Invite"}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </section>
        </DefaultLayout>
    );
}
