import {
    Link,
    Navbar as NextUINavbar,
    NavbarContent,
    NavbarMenu,
    NavbarMenuToggle,
    NavbarBrand,
    NavbarItem,
    NavbarMenuItem,
    Button,
    Image,
    Dropdown,
    DropdownTrigger,
    DropdownMenu,
    DropdownItem,
} from "@nextui-org/react";
import { link as linkStyles } from "@nextui-org/theme";
import NextLink from "next/link";
import clsx from "clsx";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/router";

import { siteConfig } from "@/config/site";
import {
    TwitterIcon,
    GithubIcon,
    DiscordIcon,
    LoaderIcon,
} from "@/components/icons";
import { API_URL, useUser } from "@/lib/queries";

export const Navbar = () => {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { user, isLoading } = useUser();

    const logout = useMutation({
        mutationFn: () =>
            fetch(`${API_URL}/auth/logout`, {
                method: "POST",
                credentials: "include",
            }),
        onSuccess: () => {
            if (router.pathname.includes("dashboard")) {
                router.push("/");
            }
            queryClient.invalidateQueries({
                queryKey: ["user"],
            });
        },
    });

    return (
        <NextUINavbar maxWidth="xl" position="sticky">
            <NavbarContent className="basis-1/5 sm:basis-full" justify="start">
                <NavbarBrand className="gap-3 max-w-fit">
                    <NextLink
                        className="flex justify-start items-center gap-1"
                        href="/"
                    >
                        <p className="font-bold text-inherit">Chatr</p>
                    </NextLink>
                </NavbarBrand>
                <div className="hidden lg:flex gap-4 justify-start ml-2">
                    {siteConfig.navItems.map((item) => (
                        <NavbarItem key={item.href}>
                            <NextLink
                                className={clsx(
                                    linkStyles({ color: "foreground" }),
                                    "data-[active=true]:text-primary data-[active=true]:font-medium"
                                )}
                                color="foreground"
                                href={item.href}
                            >
                                {item.label}
                            </NextLink>
                        </NavbarItem>
                    ))}
                </div>
            </NavbarContent>

            <NavbarContent
                className="hidden sm:flex basis-1/5 sm:basis-full"
                justify="end"
            >
                <NavbarItem className="hidden sm:flex gap-2">
                    <Link isExternal href={siteConfig.links.twitter}>
                        <TwitterIcon className="text-default-500" />
                    </Link>
                    <Link isExternal href={siteConfig.links.discord}>
                        <DiscordIcon className="text-default-500" />
                    </Link>
                    <Link isExternal href={siteConfig.links.github}>
                        <GithubIcon className="text-default-500" />
                    </Link>
                </NavbarItem>
                <NavbarItem className="hidden md:flex">
                    {isLoading ? (
                        <LoaderIcon
                            className="animate-spin"
                            height={24}
                            width={24}
                        />
                    ) : user ? (
                        <Dropdown>
                            <DropdownTrigger>
                                <Image
                                    alt={user.name + " avatar"}
                                    className="rounded-full hover:cursor-pointer"
                                    height={30}
                                    src={user.avatar}
                                    width={30}
                                />
                            </DropdownTrigger>
                            <DropdownMenu aria-label="User menu">
                                <DropdownItem as={NextLink} href="/dashboard">
                                    Dashboard
                                </DropdownItem>
                                <DropdownItem
                                    className="text-danger"
                                    color="danger"
                                    onClick={() => logout.mutate()}
                                >
                                    Log out
                                </DropdownItem>
                            </DropdownMenu>
                        </Dropdown>
                    ) : (
                        <Button
                            as={Link}
                            color="secondary"
                            href={`${API_URL}/auth/login`}
                            variant="solid"
                        >
                            Login
                        </Button>
                    )}
                </NavbarItem>
            </NavbarContent>

            <NavbarContent className="sm:hidden basis-1 pl-4" justify="end">
                <Link isExternal href={siteConfig.links.github}>
                    <GithubIcon className="text-default-500" />
                </Link>
                <NavbarMenuToggle />
            </NavbarContent>

            <NavbarMenu>
                <div className="mx-4 mt-2 flex flex-col gap-2">
                    {siteConfig.navItems.map((item) => (
                        <NavbarItem key={item.href}>
                            <Link color="foreground" href={item.href} size="lg">
                                {item.label}
                            </Link>
                        </NavbarItem>
                    ))}
                    {isLoading ? (
                        <NavbarMenuItem>
                            <LoaderIcon
                                className="animate-spin"
                                height={24}
                                width={24}
                            />
                        </NavbarMenuItem>
                    ) : user ? (
                        <>
                            <NavbarMenuItem>
                                <Link
                                    color="foreground"
                                    href="/dashboard"
                                    size="lg"
                                >
                                    Dashboard
                                </Link>
                            </NavbarMenuItem>
                            <NavbarMenuItem>
                                <Link
                                    color="danger"
                                    href={`${API_URL}/auth/logout`}
                                    size="lg"
                                    onClick={() => logout.mutate()}
                                >
                                    Log out
                                </Link>
                            </NavbarMenuItem>
                            <div className="flex items-center gap-2">
                                <Image
                                    alt={user.name + " avatar"}
                                    className="rounded-full hover:cursor-pointer"
                                    height={30}
                                    src={user.avatar}
                                    width={30}
                                />
                                <p>{user.name}</p>
                            </div>
                        </>
                    ) : null}
                </div>
            </NavbarMenu>
        </NextUINavbar>
    );
};
