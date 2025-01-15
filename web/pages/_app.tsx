import type { AppProps } from "next/app";

import { NextUIProvider } from "@nextui-org/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useRouter } from "next/router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { fontSans, fontMono } from "@/config/fonts";
import "@/styles/globals.css";

const queryClient = new QueryClient();

export default function App({ Component, pageProps }: AppProps) {
    const router = useRouter();

    return (
        <NextUIProvider navigate={router.push}>
            <NextThemesProvider>
                <QueryClientProvider client={queryClient}>
                    <Component {...pageProps} />
                </QueryClientProvider>
            </NextThemesProvider>
        </NextUIProvider>
    );
}

export const fonts = {
    sans: fontSans.style.fontFamily,
    mono: fontMono.style.fontFamily,
};
