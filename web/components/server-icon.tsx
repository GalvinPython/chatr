import { Image } from "@nextui-org/react";

export function ServerIcon({
    guild,
}: {
    guild: { name: string; icon?: string };
}) {
    if (!guild.icon) {
        return (
            <div className="w-16 h-16 rounded-large bg-default flex items-center justify-center">
                {guild.name.match(/[A-Z]/g)?.join("")}
            </div>
        );
    }

    return (
        <Image
            alt={guild.name + " icon"}
            className="text-center"
            height={64}
            src={
                guild.icon
                    ? guild.icon + "?size=256"
                    : "https://cdn.discordapp.com/embed/avatars/0.png"
            }
        />
    );
}
