import { Head } from "./head";

import { Navbar } from "@/components/navbar";

export default function DefaultLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="relative flex flex-col h-screen">
            <Head />
            <Navbar />
            <main className="container mx-auto px-6 flex-grow">{children}</main>
        </div>
    );
}
