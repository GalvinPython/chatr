import { Button } from "@nextui-org/react";
import Link from "next/link";
import { GetServerSidePropsContext } from "next";

import DefaultLayout from "@/layouts/default";
import { API_URL, UserProvider } from "@/lib/queries";
import { subtitle, title } from "@/components/primitives";
import { ServerIcon } from "@/components/server-icon";
import { Guild, User } from "@/types/api";

export default function Dashboard({
    user,
    guilds,
}: {
    user: User;
    guilds: Guild[];
}) {
    return (
        <UserProvider user={user}>
            <DefaultLayout>
                <section className="flex flex-col items-center justify-center gap-4 py-8">
                    <div className="inline-block max-w-lg text-center justify-center">
                        <h1 className={title()}>Dashboard</h1>
                        <h4 className={subtitle({ class: "mt-4" })}>
                            Manage and update your server&apos;s settings.
                        </h4>
                    </div>
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
                                        <ServerIcon
                                            guild={guild}
                                            height={64}
                                            width={64}
                                        />
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
                </section>
            </DefaultLayout>
        </UserProvider>
    );
}

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
    const userResponse = await fetch(`${API_URL}/auth/user`, {
        headers: {
            cookie: ctx.req.headers.cookie ?? "",
        },
    });

    if (userResponse.status === 401)
        return {
            props: { user: null, guilds: null },
            redirect: {
                destination: `${API_URL}/auth/login`,
                permanent: false,
            },
        };

    const guildsResponse = await fetch(`${API_URL}/auth/user/guilds`, {
        headers: {
            cookie: ctx.req.headers.cookie ?? "",
        },
    });

    const user = await userResponse.json();
    const guilds = await guildsResponse.json();

    return { props: { user, guilds } };
};
