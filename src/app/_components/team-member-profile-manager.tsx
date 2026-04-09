"use client";

import { useMemo, useState } from "react";
import {
	Alert,
	Button,
	Divider,
	Form,
	Input,
	InputNumber,
	Modal,
	Popconfirm,
	Select,
	Space,
	Table,
	Tabs,
	Tag,
	Typography,
} from "antd";
import { EditOutlined, MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

import styles from "~/app/team-sync.module.css";
import { MarkdownDisplay } from "~/app/_components/shared/markdown-display";
import { SectionHeader } from "~/app/_components/shared/section-header";
import { api } from "~/trpc/react";
import { MODAL_WIDTH_WIDE } from "./shared/modal-widths";

type LanguageEntry = {
	language: string;
	percent: number;
};

type ProfileFormValues = {
	fullName: string;
	email: string;
	roles: string[];
	expertise: string[];
	techStack: string[];
	certifications: string[];
	responsibilities: string[];
	communicationStyle: string;
	growthGoals: string[];
	generatedSummary: string;
	languages: LanguageEntry[];
};

const normalizeTagValues = (values?: string[] | null) =>
	(values ?? []).map((item) => item.trim()).filter((item) => item.length > 0);

const toText = (value?: string | null) => (value ?? "").trim();

const defaultFormValues: ProfileFormValues = {
	fullName: "",
	email: "",
	roles: [],
	expertise: [],
	techStack: [],
	certifications: [],
	responsibilities: [],
	communicationStyle: "",
	growthGoals: [],
	generatedSummary: "",
	languages: [],
};

const mostSpokenLanguages = [
	"English",
	"Mandarin Chinese",
	"Hindi",
	"Spanish",
	"French",
	"Modern Standard Arabic",
	"Bengali",
	"Portuguese",
	"Russian",
	"Urdu",
];

const languageOptions = mostSpokenLanguages.map((language) => ({
	label: language,
	value: language,
}));

export function TeamMemberProfileManager() {
	const utils = api.useUtils();
	const [form] = Form.useForm<ProfileFormValues>();
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
	const [searchValue, setSearchValue] = useState("");
	const [activeTabKey, setActiveTabKey] = useState("identity");
	const [validationMessage, setValidationMessage] = useState<string | null>(null);
	const [generatedSummary, setGeneratedSummary] = useState<string | null>(null);
	const profilesQuery = api.teamSync.teamMemberProfiles.useQuery();

	const assignedProjectsQuery = api.teamSync.memberAssignedProjects.useQuery(
		{ memberId: editingMemberId ?? "" },
		{ enabled: !!editingMemberId },
	);

	const createMutation = api.teamSync.createTeamMemberProfile.useMutation({
		onSuccess: async () => {
			form.setFieldsValue(defaultFormValues);
			setIsModalOpen(false);
			await utils.teamSync.teamMemberProfiles.invalidate();
			await utils.teamSync.snapshot.invalidate();
		},
		onError: (error) => {
			setValidationMessage(`Unable to save profile: ${error.message}`);
		},
	});

	const deleteMutation = api.teamSync.deleteTeamMemberProfile.useMutation({
		onSuccess: async () => {
			await utils.teamSync.teamMemberProfiles.invalidate();
			await utils.teamSync.snapshot.invalidate();
		},
	});

	const updateMutation = api.teamSync.updateTeamMemberProfile.useMutation({
		onSuccess: async () => {
			setEditingMemberId(null);
			form.setFieldsValue(defaultFormValues);
			setIsModalOpen(false);
			await utils.teamSync.teamMemberProfiles.invalidate();
			await utils.teamSync.snapshot.invalidate();
		},
		onError: (error) => {
			setValidationMessage(`Unable to save profile: ${error.message}`);
		},
	});

	const generateSummaryMutation = api.teamSync.generateTeamMemberDecisionSummary.useMutation({
		onError: (error) => {
			setValidationMessage(`Unable to generate summary: ${error.message}`);
		},
	});

	const isSubmitting =
		createMutation.isPending ||
		updateMutation.isPending ||
		deleteMutation.isPending;

	const profiles = useMemo(() => {
		const normalizedSearch = searchValue.trim().toLowerCase();
		const source = profilesQuery.data ?? [];

		const filtered = source.filter((profile) => {
			if (!normalizedSearch) {
				return true;
			}

			const searchableText = [
				profile.fullName,
				profile.email,
				...profile.roles,
				profile.communicationStyle,
				...profile.expertise,
				...profile.techStack,
				...profile.responsibilities,
				...profile.growthGoals,
			]
				.join(" ")
				.toLowerCase();

			return searchableText.includes(normalizedSearch);
		});

		return filtered;
	}, [profilesQuery.data, searchValue]);

	const resetSummaryState = () => {
		setGeneratedSummary(null);
	};

	const closeModal = () => {
		if (createMutation.isPending || updateMutation.isPending) {
			return;
		}

		setEditingMemberId(null);
		setActiveTabKey("identity");
		setValidationMessage(null);
		resetSummaryState();
		form.setFieldsValue(defaultFormValues);
		setIsModalOpen(false);
	};

	const openCreateModal = () => {
		setEditingMemberId(null);
		setActiveTabKey("identity");
		setValidationMessage(null);
		resetSummaryState();
		form.setFieldsValue(defaultFormValues);
		setIsModalOpen(true);
	};

	const openEditModal = (profile: (typeof profiles)[number]) => {
		setEditingMemberId(profile.id);
		setActiveTabKey("identity");
		setValidationMessage(null);
		resetSummaryState();
		form.setFieldsValue({
			fullName: profile.fullName,
			email: profile.email,
			roles: profile.roles,
			expertise: profile.expertise,
			techStack: profile.techStack,
			certifications: profile.certifications,
			responsibilities: profile.responsibilities,
			communicationStyle: profile.communicationStyle,
			growthGoals: profile.growthGoals,
			generatedSummary: profile.generatedSummary,
			languages: profile.languages,
		});
		setGeneratedSummary(profile.generatedSummary || null);
		setIsModalOpen(true);
	};

	const buildSummaryProfilePayload = () => {
		const values = (form.getFieldsValue(true) ?? {}) as Partial<ProfileFormValues>;

		return {
			fullName: toText(values.fullName),
			email: toText(values.email),
			roles: normalizeTagValues(values.roles),
			expertise: normalizeTagValues(values.expertise),
			techStack: normalizeTagValues(values.techStack),
			certifications: normalizeTagValues(values.certifications),
			responsibilities: normalizeTagValues(values.responsibilities),
			communicationStyle: toText(values.communicationStyle),
			growthGoals: normalizeTagValues(values.growthGoals),
			languages: (values.languages ?? [])
				.map((entry) => ({
					language: toText(entry?.language),
					percent: Number(entry?.percent),
				}))
				.filter((entry) => entry.language.length > 0 && Number.isFinite(entry.percent)),
		};
	};

	const onGenerateSummary = async () => {
		setValidationMessage(null);
		const result = await generateSummaryMutation.mutateAsync({
			memberId: editingMemberId ?? undefined,
			memberProfile: buildSummaryProfilePayload(),
		});

		setGeneratedSummary(result.summary);
		form.setFieldValue("generatedSummary", result.summary);
	};

	const onSubmit = (values?: ProfileFormValues) => {
		if (!values) {
			setValidationMessage("Unable to submit form. Please review required fields and try again.");
			return;
		}

		setValidationMessage(null);

		const payload = {
			fullName: toText(values.fullName),
			email: toText(values.email),
			roles: normalizeTagValues(values.roles),
			expertise: normalizeTagValues(values.expertise),
			techStack: normalizeTagValues(values.techStack),
			certifications: normalizeTagValues(values.certifications),
			responsibilities: normalizeTagValues(values.responsibilities),
			communicationStyle: toText(values.communicationStyle),
			growthGoals: normalizeTagValues(values.growthGoals),
			generatedSummary: toText(values.generatedSummary),
			languages: (values.languages ?? [])
				.map((entry) => ({
					language: toText(entry?.language),
					percent: Number(entry?.percent),
				}))
				.filter((entry) => entry.language.length > 0 && Number.isFinite(entry.percent)),
		};

		if (editingMemberId) {
			const input = { memberId: editingMemberId, profile: payload };
			updateMutation.mutate(input);
			return;
		}

		createMutation.mutate(payload);
	};

	const resolveTabByField = (fieldName?: string) => {
		switch (fieldName) {
			case "fullName":
			case "email":
			case "roles":
				return "identity";
			case "expertise":
			case "techStack":
			case "certifications":
			case "languages":
				return "skills";
			case "communicationStyle":
			case "responsibilities":
			case "growthGoals":
				return "workstyle";
			default:
				return "identity";
		}
	};

	const onSubmitFailed = ({ errorFields }: { errorFields: Array<{ name: Array<string | number>; errors: string[] }> }) => {
		const firstError = errorFields[0];
		const firstFieldName = typeof firstError?.name?.[0] === "string" ? firstError.name[0] : undefined;
		const targetTab = resolveTabByField(firstFieldName);

		setActiveTabKey(targetTab);
		setValidationMessage(`Please complete required fields in the ${targetTab === "workstyle" ? "Work Style" : targetTab === "skills" ? "Skills" : "Identity"} tab.`);

		if (firstError?.name) {
			setTimeout(() => {
				form.scrollToField(firstError.name, { behavior: "smooth", block: "center" });
			}, 0);
		}
	};

	const columns: ColumnsType<(typeof profiles)[number]> = [
		{
			title: "Name",
			dataIndex: "fullName",
			key: "fullName",
			sorter: (left, right) => left.fullName.localeCompare(right.fullName),
			defaultSortOrder: "ascend",
		},
		{
			title: "Roles",
			dataIndex: "roles",
			key: "roles",
			render: (values: string[]) => (
				<Space size={[4, 4]} wrap>
					{values.map((item) => (
						<Tag key={item} color="purple">
							{item}
						</Tag>
					))}
				</Space>
			),
		},
		{
			title: "Tech Stack",
			dataIndex: "techStack",
			key: "techStack",
			render: (values: string[]) => (
				<Space size={[4, 4]} wrap>
					{values.map((item) => (
						<Tag key={item} color="geekblue">
							{item}
						</Tag>
					))}
				</Space>
			),
		},
		{
			title: "Actions",
			key: "actions",
			align: "right",
			render: (_, profile) => (
					<Button
						icon={<EditOutlined />}
						type="link"
						size="small"
						onClick={() => openEditModal(profile)}
					>
						Edit
					</Button>
			),
		},
	];

	const projectsTab = editingMemberId
		? [
				{
					key: "projects",
					label: "Projects",
					children: (
						<div className={styles.memberProjectsList}>
							{assignedProjectsQuery.isLoading && (
								<Typography.Text type="secondary">Loading assigned projects...</Typography.Text>
							)}
							{!assignedProjectsQuery.isLoading && (assignedProjectsQuery.data?.length ?? 0) === 0 && (
								<Typography.Text type="secondary">No projects assigned to this member.</Typography.Text>
							)}
							{(assignedProjectsQuery.data ?? []).map((project, index, source) => (
								<div key={project.id} className={styles.memberProjectItem}>
									<Typography.Text strong>{project.projectName}</Typography.Text>
									<Typography.Paragraph
										type="secondary"
										ellipsis={{ rows: 2, tooltip: project.summary }}
										className={styles.memberProjectSummary}
									>
										{project.summary}
									</Typography.Paragraph>
									{index < source.length - 1 && <Divider className={styles.memberProjectDivider} />}
								</div>
							))}
						</div>
					),
				},
			]
		: [];

	return (
		<section className={styles.panel}>
			<SectionHeader
				title="Team Member Profiles"
				description="Manage profile records persisted in PostgreSQL."
				actionLabel="Add Profile"
				onAction={openCreateModal}
			/>

			{createMutation.error && (
				<Alert
					showIcon
					type="error"
					title={`Failed to create profile: ${createMutation.error.message}`}
				/>
			)}
			{deleteMutation.error && (
				<Alert
					showIcon
					type="error"
					title={`Failed to delete profile: ${deleteMutation.error.message}`}
				/>
			)}
			{updateMutation.error && (
				<Alert
					showIcon
					type="error"
					title={`Failed to update profile: ${updateMutation.error.message}`}
				/>
			)}
			{generateSummaryMutation.error && (
				<Alert
					showIcon
					type="error"
					title={`Failed to generate summary: ${generateSummaryMutation.error.message}`}
				/>
			)}

			<Table
				rowKey="id"
				columns={columns}
				dataSource={profiles}
				loading={profilesQuery.isLoading}
				style={{ width: "100%" }}
				size="middle"
				tableLayout="fixed"
				pagination={{ pageSize: 8, showSizeChanger: false }}
			/>

			{!profilesQuery.isLoading && profiles.length === 0 && (
				<Typography.Text type="secondary">No profiles matched your search.</Typography.Text>
			)}

			<Modal
				title={editingMemberId ? "Edit Team Member Profile" : "Add Team Member Profile"}
				open={isModalOpen}
				onCancel={closeModal}
				footer={null}
				width={MODAL_WIDTH_WIDE}
			>
				<Form
					layout="vertical"
					form={form}
					initialValues={defaultFormValues}
					onFinish={onSubmit}
					onFinishFailed={onSubmitFailed}
				>
					{validationMessage && (
						<Alert showIcon type="warning" title={validationMessage} style={{ marginBottom: 12 }} />
					)}
					<Tabs
						activeKey={activeTabKey}
						onChange={setActiveTabKey}
						items={[
							{
								key: "identity",
								label: "Identity",
								children: (
									<>
										<Form.Item label="Full Name" name="fullName" rules={[{ required: true }]}>
											<Input placeholder="Jane Doe" />
										</Form.Item>
										<Form.Item label="Email" name="email" rules={[{ type: "email", message: "Enter a valid email" }]}>
											<Input placeholder="jane@example.com" />
										</Form.Item>
											<Form.Item label="Roles" name="roles" rules={[{ required: true }]}>
												<Select
													mode="tags"
													tokenSeparators={[","]}
													placeholder="Add roles"
												/>
										</Form.Item>
									</>
								),
							},
							{
								key: "skills",
								label: "Skills",
								children: (
									<>
											<Form.Item label="Expertise" name="expertise" rules={[{ required: true }]}>
												<Select
													mode="tags"
													tokenSeparators={[","]}
													placeholder="Add expertise"
												/>
										</Form.Item>
											<Form.Item label="Tech Stack" name="techStack" rules={[{ required: true }]}>
												<Select
													mode="tags"
													tokenSeparators={[","]}
													placeholder="Add technologies"
												/>
										</Form.Item>
											<Form.Item label="Certifications" name="certifications">
												<Select
													mode="tags"
													tokenSeparators={[","]}
													placeholder="Add certifications"
												/>
										</Form.Item>
										<Form.Item label="Languages">
											<Form.List name="languages">
												{(fields, { add, remove }) => (
													<>
														{fields.map(({ key, name, ...restField }) => (
															<Space key={key} align="baseline" style={{ display: "flex", marginBottom: 4 }}>
																<Form.Item
																	{...restField}
																	name={[name, "language"]}
																	rules={[{ required: true, message: "Language required" }]}
																	style={{ marginBottom: 0 }}
																>
																		<Select
																			placeholder="Select language"
																			options={languageOptions}
																			style={{ width: 220 }}
																			showSearch
																			optionFilterProp="label"
																		/>
																</Form.Item>
																<Form.Item
																	{...restField}
																	name={[name, "percent"]}
																	rules={[{ required: true, message: "%" }]}
																	style={{ marginBottom: 0 }}
																>
																		<InputNumber min={0} max={100} placeholder="%" style={{ width: 124 }} />
																</Form.Item>
																<MinusCircleOutlined onClick={() => remove(name)} />
															</Space>
														))}
														<Button
															type="dashed"
															onClick={() => add({ language: "", percent: 100 })}
															icon={<PlusOutlined />}
															size="small"
														>
															Add Language
														</Button>
													</>
												)}
											</Form.List>
										</Form.Item>
									</>
								),
							},
							{
								key: "workstyle",
								label: "Work Style",
								children: (
									<>
										<Form.Item label="Communication Style" name="communicationStyle" rules={[{ required: true }]}>
											<Input.TextArea rows={3} placeholder="Clear and async-friendly updates" />
										</Form.Item>
											<Form.Item label="Responsibilities" name="responsibilities" rules={[{ required: true }]}>
												<Select
													mode="tags"
													tokenSeparators={[","]}
													placeholder="Add responsibilities"
												/>
										</Form.Item>
											<Form.Item label="Growth Goals" name="growthGoals">
												<Select
													mode="tags"
													tokenSeparators={[","]}
													placeholder="Add growth goals"
												/>
										</Form.Item>
									</>
								),
							},
							{
								key: "aiSummary",
								label: "AI Summary",
								children: (
								<>
									<Form.Item name="generatedSummary" style={{ display: "none" }}>
										<Input type="hidden" />
									</Form.Item>
									<Space orientation="vertical" size={12} style={{ width: "100%" }}>
										<Button
											type="primary"
											onClick={onGenerateSummary}
											loading={generateSummaryMutation.isPending}
										>
											Generate AI Summary
										</Button>
											<MarkdownDisplay
												content={generatedSummary ?? "No summary generated yet."}
											/>
									</Space>
								</>
								),
							},
							...projectsTab,
						].map((item) => ({
							...item,
							forceRender: true,
						}))}
					/>
					<Divider className={styles.modalActionDivider} />
					<Space className={styles.modalActionRow}>
						<Button onClick={closeModal}>Cancel</Button>
						<Button
							type="primary"
							htmlType="submit"
							loading={createMutation.isPending || updateMutation.isPending}
						>
							{editingMemberId ? "Save Changes" : "Create Profile"}
						</Button>
					</Space>
				</Form>
			</Modal>
		</section>
	);
}
