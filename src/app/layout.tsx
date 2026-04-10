import "~/styles/globals.css";
import "antd/dist/reset.css";

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Space_Grotesk } from "next/font/google";

import { auth } from "~/server/auth";
import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
	title: "Team Sync AI",
	description:
		"AI-powered team orchestration and project artifact generation workspace.",
	icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const spaceGrotesk = Space_Grotesk({
	subsets: ["latin"],
});

export default async function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	const session = await auth();
	if (!session?.user) {
		redirect("/api/auth/signin");
	}

	return (
		<html lang="en">
			<body className={spaceGrotesk.className}>
				<TRPCReactProvider>{children}</TRPCReactProvider>
			</body>
		</html>
	);
}
