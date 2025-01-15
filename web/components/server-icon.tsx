import { Image, ImageProps } from "@nextui-org/react";
import clsx from "clsx";
import NextImage from "next/image";

export function ServerIcon({
    guild,
    className,
    width,
    height,
    ...props
}: ImageProps & {
    guild: { name: string; icon?: string };
}) {
    if (!guild.icon) {
        return (
            <div
                key="default"
                className={clsx(
                    "rounded-large bg-default flex items-center justify-center",
                    className
                )}
                style={{ width: width + "px", height: height + "px" }}
            >
                {guild.name.match(/[A-Z]/g)?.join("")}
            </div>
        );
    }

    return (
        <Image
            {...props}
            alt={guild.name + " icon"}
            as={NextImage}
            className={clsx("text-center", className)}
            height={height}
            src={
                guild.icon
                    ? guild.icon + "?size=256"
                    : "https://cdn.discordapp.com/embed/avatars/0.png"
            }
            width={width}
        />
    );
}
