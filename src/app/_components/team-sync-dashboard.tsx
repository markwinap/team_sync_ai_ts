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
	data: DashboardViewModel;
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

export function TeamSyncDashboard({ data, user }: TeamSyncDashboardProps) {
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
	const averageFitScore = useMemo(() => {
		if (data.teamRows.length === 0) {
			return 0;
		}

		const total = data.teamRows.reduce((sum, row) => sum + row.scorePercent, 0);
		return Math.round(total / data.teamRows.length);
	}, [data.teamRows]);

	const artifactCount =
		data.artifacts.functionalRequirements.length +
		data.artifacts.nonFunctionalRequirements.length +
		data.artifacts.userStories.length +
		data.artifacts.risksAndConstraints.length +
		data.artifacts.highLevelArchitecture.length +
		data.artifacts.scopeIn.length +
		data.artifacts.scopeOut.length;

	const renderArtifactList = (items: string[], emptyLabel: string) => {
		if (items.length === 0) {
			return <Typography.Text type="secondary">{emptyLabel}</Typography.Text>;
		}

		return (
			<div className={styles.simpleList}>
				{items.map((item) => (
					<div key={item} className={styles.simpleListItem}>
						{item}
					</div>
				))}
			</div>
		);
	};

	const artifactTabs = [
		{
			key: "functional",
			label: "Functional",
			children: renderArtifactList(
				data.artifacts.functionalRequirements,
				"No functional requirements generated yet.",
			),
		},
		{
			key: "non-functional",
			label: "Non-Functional",
			children: renderArtifactList(
				data.artifacts.nonFunctionalRequirements,
				"No non-functional requirements generated yet.",
			),
		},
		{
			key: "stories",
			label: "User Stories",
			children: renderArtifactList(
				data.artifacts.userStories,
				"No user stories generated yet.",
			),
		},
		{
			key: "risks",
			label: "Risks",
			children: renderArtifactList(
				data.artifacts.risksAndConstraints,
				"No risks or constraints generated yet.",
			),
		},
		{
			key: "architecture",
			label: "Architecture",
			children: renderArtifactList(
				data.artifacts.highLevelArchitecture,
				"No architecture notes generated yet.",
			),
		},
		{
			key: "scope",
			label: "Scope",
			children: (
				<Space orientation="vertical" size={10} style={{ width: "100%" }}>
					<Typography.Text strong>In Scope</Typography.Text>
					{renderArtifactList(data.artifacts.scopeIn, "No in-scope items yet.")}
					<Typography.Text strong>Out of Scope</Typography.Text>
					{renderArtifactList(data.artifacts.scopeOut, "No out-of-scope items yet.")}
				</Space>
			),
		},
	];

	const compactSections = [
		{
			key: "company",
			label: "Company",
			children: (
				<Space orientation="vertical" size={12} style={{ width: "100%" }}>
					<Typography.Text className={styles.kicker}>{data.subheading}</Typography.Text>
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

					<Row gutter={[12, 12]}>
						<Col xs={24} sm={12} lg={6}>
							<Card className={styles.statCard}>
								<Statistic title="Recommended Members" value={data.teamRows.length} />
							</Card>
						</Col>
						<Col xs={24} sm={12} lg={6}>
							<Card className={styles.statCard}>
								<Statistic title="Average Fit" suffix="%" value={averageFitScore} />
							</Card>
						</Col>
						<Col xs={24} sm={12} lg={6}>
							<Card className={styles.statCard}>
								<Statistic title="Capability Gaps" value={data.uncoveredCapabilities.length} />
							</Card>
						</Col>
						<Col xs={24} sm={12} lg={6}>
							<Card className={styles.statCard}>
								<Statistic title="Artifacts Generated" value={artifactCount} />
							</Card>
						</Col>
					</Row>

					<Card title="Project Artifacts" className={styles.panelCard}>
						<Tabs items={artifactTabs} />
					</Card>

					{data.uncoveredCapabilities.length > 0 ? (
						<Alert
							showIcon
							type="warning"
							className={styles.gapAlert}
							title="Capability gaps detected"
							description={
								<Space wrap size={[6, 6]}>
									{data.uncoveredCapabilities.map((item) => (
										<Tag key={item} color="gold">
											{item}
										</Tag>
									))}
								</Space>
							}
						/>
					) : (
						<Alert
							showIcon
							type="success"
							className={styles.gapAlert}
							title="All required capabilities are covered by the recommended team."
						/>
					)}
				</Space>
			),
		},
		{
			key: "team-members",
			label: "Team Members",
			children: (
				<Space orientation="vertical" size={12} style={{ width: "100%" }}>
					<Card title="Recommended Team" className={styles.panelCard}>
						{data.teamRows.length > 0 ? (
							<div className={styles.memberList}>
								{data.teamRows.map((member) => (
									<div key={member.name} className={styles.memberListItem}>
										<Space orientation="vertical" style={{ width: "100%" }} size={6}>
											<div className={styles.memberHeader}>
												<div>
													<Typography.Text strong>{member.name}</Typography.Text>
													<Typography.Paragraph type="secondary" style={{ margin: 0 }}>
														{member.role}
													</Typography.Paragraph>
												</div>
												<Tag color="blue">Fit {member.scorePercent}%</Tag>
											</div>
											<Progress percent={member.scorePercent} size="small" showInfo={false} />
											<Space wrap size={[4, 4]}>
												{member.reasons.map((reason) => (
													<Tag key={reason}>{reason}</Tag>
												))}
											</Space>
										</Space>
									</div>
								))}
							</div>
						) : (
							<Typography.Text type="secondary">
								No team recommendation available yet.
							</Typography.Text>
						)}
					</Card>

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
