import { GetServerSidePropsContext } from "next";
import {
    Autocomplete,
    AutocompleteItem,
    Button,
    Checkbox,
    Input,
} from "@nextui-org/react";
import { FormEvent, useCallback, useState } from "react";

import { API_URL, UserProvider } from "@/lib/queries";
import { User } from "@/types/api";
import DefaultLayout from "@/layouts/default";
import { ServerIcon } from "@/components/server-icon";

export default function Dashboard({
    user,
    guild,
    channels,
}: {
    user: User;
    guild: any;
    channels: any;
}) {
    const [cooldown, setCooldown] = useState<string>(
        (guild.cooldown / 1000).toString()
    );
    const [updatesEnabled, setUpdatesEnabled] = useState<boolean>(
        guild.updates_enabled === 1
    );
    const [updatesChannel, setUpdatesChannel] = useState<string | null>(
        guild.updates_channel_id
    );

    const onSubmit = useCallback(async (e: FormEvent) => {
        e.preventDefault();
        await fetch(`${API_URL}/auth/update-guild`, {
            body: JSON.stringify({
                guild: guild.id,
                cooldown: parseInt(cooldown) * 1000,
                updates: {
                    enabled: updatesEnabled,
                    channel: updatesChannel,
                },
            }),
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
            method: "PUT",
        });
    }, []);

    return (
        <UserProvider user={user}>
            <DefaultLayout>
                <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10 max-w-[90%] ml-auto mr-auto">
                    <div className="relative w-full p-4 rounded-lg flex flex-col justify-center items-center">
                        <div className="relative z-10 flex gap-4 items-center bg-gray-900 p-6 rounded-full bg-opacity-90">
                            <ServerIcon
                                className="rounded-full border-4 border-blue-500 w-20 h-20"
                                guild={guild}
                                height={80}
                                width={80}
                            />
                            <h2
                                className="text-white text-lg font-semibold  opacity-100"
                                style={{ fontSize: "32px" }}
                            >
                                {guild.name}
                            </h2>
                        </div>
                    </div>
                    <form
                        className="flex flex-col items-center justify-center gap-4"
                        onSubmit={onSubmit}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="bg-gray-800 p-4 rounded-lg">
                                <Input
                                    description="The amount of time until someone can get XP after sending a message in seconds."
                                    label="Cooldown"
                                    labelPlacement="outside"
                                    type="number"
                                    value={cooldown}
                                    onChange={(e) =>
                                        setCooldown(e.target.value)
                                    }
                                />
                            </div>
                            <div className="bg-gray-800 p-4 rounded-lg">
                                <p className="text-foreground text-small -mt-1 mb-2">
                                    Level up messages
                                </p>
                                <div className="flex flex-col gap-3">
                                    <Checkbox
                                        isSelected={updatesEnabled}
                                        onChange={(e) =>
                                            setUpdatesEnabled(e.target.checked)
                                        }
                                    >
                                        Enable level up messages
                                    </Checkbox>
                                    <Autocomplete
                                        defaultItems={channels}
                                        label="Channel"
                                        selectedKey={updatesChannel}
                                        onSelectionChange={(id) =>
                                            setUpdatesChannel(
                                                id as string | null
                                            )
                                        }
                                    >
                                        {(channel: any) => (
                                            <AutocompleteItem key={channel.id}>
                                                {"#" + channel.name}
                                            </AutocompleteItem>
                                        )}
                                    </Autocomplete>
                                </div>
                                <p className="text-foreground-500 text-xs mt-2">
                                    Whether or not and where to send level up
                                    messages to.
                                </p>
                            </div>
                        </div>
                        <Button color="primary" type="submit">
                            Update settings
                        </Button>
                    </form>
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
            props: { user: null, guild: null, channels: null },
            redirect: {
                destination: `${API_URL}/auth/login`,
                permanent: false,
            },
        };

    const guildResponse = await fetch(`${API_URL}/get/${ctx.params!.server}`, {
        headers: {
            cookie: ctx.req.headers.cookie ?? "",
        },
    });

    const channelsResponse = await fetch(
        `${API_URL}/channels/${ctx.params!.server}`,
        {
            headers: {
                Authorization: process.env.AUTH!,
            },
        }
    );

    const user = await userResponse.json();
    const { guild } = await guildResponse.json();
    const channels = await channelsResponse.json();

    console.log(channels);

    return { props: { user, guild, channels } };
};
