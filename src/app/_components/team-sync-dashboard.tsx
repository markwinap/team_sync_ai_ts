"use client";

import { useEffect, useMemo, useState } from "react";
import {
	Alert,
	Avatar,
	Button,
	Card,
	Col,
	ConfigProvider,
	Divider,
	Progress,
	Row,
	Space,
	Statistic,
	Switch,
	Tag,
	Tabs,
	Typography,
	theme as antdTheme,
} from "antd";
import { LogoutOutlined, MoonOutlined, SunOutlined } from "@ant-design/icons";

import type { DashboardViewModel } from "~/modules/team-sync/presentation/view-models/dashboard-view-model";
import styles from "~/app/team-sync.module.css";
import { CompanyProfileManager } from "~/app/_components/company-profile-manager";
import { ProjectProfileManager } from "~/app/_components/project-profile-manager";
import { TeamMemberProfileManager } from "~/app/_components/team-member-profile-manager";

type TeamSyncDashboardProps = {
	user: {
		name: string | null;
		email: string | null;
		image: string | null;
	} | null;
};

const isDarkThemeInitial = () => {
	if (typeof window === "undefined") {
		return false;
	}

	const storedTheme = window.localStorage.getItem("team-sync-theme");
	if (storedTheme === "dark") {
		return true;
	}
	if (storedTheme === "light") {
		return false;
	}

	return window.matchMedia("(prefers-color-scheme: dark)").matches;
};

export function TeamSyncDashboard({ user }: TeamSyncDashboardProps) {
	const [isDarkTheme, setIsDarkTheme] = useState(false);

	useEffect(() => {
		setIsDarkTheme(isDarkThemeInitial());
	}, []);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}

		window.localStorage.setItem("team-sync-theme", isDarkTheme ? "dark" : "light");
	}, [isDarkTheme]);

	const antdThemeConfig = useMemo(
		() => ({
			algorithm: isDarkTheme
				? antdTheme.darkAlgorithm
				: antdTheme.defaultAlgorithm,
			token: {
				colorPrimary: "#0f6f8f",
				borderRadius: 12,
			},
		}),
		[isDarkTheme],
	);

	const userLabel = user?.name ?? user?.email ?? "Signed-in user";



	const compactSections = [
		{
			key: "company",
			label: "Company",
			children: (
				<Space orientation="vertical" size={12} style={{ width: "100%" }}>
					<CompanyProfileManager />
				</Space>
			),
		},
		{
			key: "project",
			label: "Project",
			children: (
				<Space orientation="vertical" size={12} style={{ width: "100%" }}>
					<ProjectProfileManager />
				</Space>
			),
		},
		{
			key: "team-members",
			label: "Team Members",
			children: (
				<Space orientation="vertical" size={12} style={{ width: "100%" }}>
					<TeamMemberProfileManager />
				</Space>
			),
		},
	];

	return (
		<ConfigProvider theme={antdThemeConfig}>
			<main className={`${styles.page} ${isDarkTheme ? styles.pageDark : ""}`}>
				<Card className={styles.hero}>
					<div className={styles.topBar}>
						<Space size={10}>
							<Space size={6}>
								<SunOutlined />
								<Switch checked={isDarkTheme} onChange={setIsDarkTheme} />
								<MoonOutlined />
							</Space>
							<Divider orientation="vertical" />
							{user ? (
								<Space>
									<Avatar size="small" src={user.image ?? undefined}>
										{userLabel.charAt(0).toUpperCase()}
									</Avatar>
									<Typography.Text>{userLabel}</Typography.Text>
									<Button danger href="/api/auth/signout" icon={<LogoutOutlined />}>
										Sign out
									</Button>
								</Space>
							) : (
								<Button type="primary" href="/api/auth/signin">
									Sign in with GitHub
								</Button>
							)}
						</Space>
					</div>
				</Card>

				<Card className={styles.compactTabsCard}>
					<Tabs items={compactSections} />
				</Card>
			</main>
		</ConfigProvider>
	);
}
