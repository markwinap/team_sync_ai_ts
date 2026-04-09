"use client";

import { useMemo, useState } from "react";
import {
	Alert,
	Button,
	Form,
	Input,
	InputNumber,
	Modal,
	Popconfirm,
	Space,
	Table,
	Tabs,
	Tag,
	Typography,
} from "antd";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

import styles from "~/app/team-sync.module.css";
import { SectionHeader } from "~/app/_components/shared/section-header";
import { api } from "~/trpc/react";

type LanguageEntry = {
	language: string;
	percent: number;
};

type ProfileFormValues = {
	fullName: string;
	email: string;
	roles: string;
	expertise: string;
	techStack: string;
	certifications: string;
	responsibilities: string;
	communicationStyle: string;
	growthGoals: string;
	languages: LanguageEntry[];
};

const toArray = (value?: string | null) =>
	(value ?? "")
		.split(",")
		.map((item) => item.trim())
		.filter((item) => item.length > 0);

const toText = (value?: string | null) => (value ?? "").trim();

const defaultFormValues: ProfileFormValues = {
	fullName: "",
	email: "",
	roles: "",
	expertise: "",
	techStack: "",
	certifications: "",
	responsibilities: "",
	communicationStyle: "",
	growthGoals: "",
	languages: [],
};

export function TeamMemberProfileManager() {
	const utils = api.useUtils();
	const [form] = Form.useForm<ProfileFormValues>();
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
	const [searchValue, setSearchValue] = useState("");
	const [activeTabKey, setActiveTabKey] = useState("identity");
	const [validationMessage, setValidationMessage] = useState<string | null>(null);
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

	const closeModal = () => {
		if (createMutation.isPending || updateMutation.isPending) {
			return;
		}

		setEditingMemberId(null);
		setActiveTabKey("identity");
		setValidationMessage(null);
		form.setFieldsValue(defaultFormValues);
		setIsModalOpen(false);
	};

	const openCreateModal = () => {
		setEditingMemberId(null);
		setActiveTabKey("identity");
		setValidationMessage(null);
		form.setFieldsValue(defaultFormValues);
		setIsModalOpen(true);
	};

	const openEditModal = (profile: (typeof profiles)[number]) => {
		setEditingMemberId(profile.id);
		setActiveTabKey("identity");
		setValidationMessage(null);
		form.setFieldsValue({
			fullName: profile.fullName,
			email: profile.email,
			roles: profile.roles.join(", "),
			expertise: profile.expertise.join(", "),
			techStack: profile.techStack.join(", "),
			certifications: profile.certifications.join(", "),
			responsibilities: profile.responsibilities.join(", "),
			communicationStyle: profile.communicationStyle,
			growthGoals: profile.growthGoals.join(", "),
			languages: profile.languages,
		});
		setIsModalOpen(true);
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
			roles: toArray(values.roles),
			expertise: toArray(values.expertise),
			techStack: toArray(values.techStack),
			certifications: toArray(values.certifications),
			responsibilities: toArray(values.responsibilities),
			communicationStyle: toText(values.communicationStyle),
			growthGoals: toArray(values.growthGoals),
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
			render: (_, profile) => (
				<Space>
					<Button size="small" type="primary" onClick={() => openEditModal(profile)}>
						Edit
					</Button>
					<Popconfirm
						title="Remove this profile?"
						description="This action cannot be undone."
						onConfirm={() => deleteMutation.mutate({ memberId: profile.id })}
						okButtonProps={{ danger: true }}
					>
						<Button danger loading={isSubmitting} size="small" type="default">
							Remove
						</Button>
					</Popconfirm>
				</Space>
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
							{(assignedProjectsQuery.data ?? []).map((project) => (
								<div key={project.id} className={styles.memberProjectItem}>
									<Typography.Text strong>{project.projectName}</Typography.Text>
									<Typography.Paragraph
										type="secondary"
										ellipsis={{ rows: 2, tooltip: project.summary }}
										className={styles.memberProjectSummary}
									>
										{project.summary}
									</Typography.Paragraph>
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

			<Table
				rowKey="id"
				columns={columns}
				dataSource={profiles}
				loading={profilesQuery.isLoading}
				size="middle"
				pagination={{ pageSize: 8, showSizeChanger: false }}
				scroll={{ x: 1100 }}
			/>

			{!profilesQuery.isLoading && profiles.length === 0 && (
				<Typography.Text type="secondary">No profiles matched your search.</Typography.Text>
			)}

			<Modal
				title={editingMemberId ? "Edit Team Member Profile" : "Add Team Member Profile"}
				open={isModalOpen}
				onCancel={closeModal}
				footer={null}
				width={640}
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
										<Form.Item label="Roles (comma separated)" name="roles" rules={[{ required: true }]}>
											<Input placeholder="Senior Engineer, Tech Lead" />
										</Form.Item>
									</>
								),
							},
							{
								key: "skills",
								label: "Skills",
								children: (
									<>
										<Form.Item label="Expertise (comma separated)" name="expertise" rules={[{ required: true }]}>
											<Input placeholder="System architecture, API design" />
										</Form.Item>
										<Form.Item label="Tech Stack (comma separated)" name="techStack" rules={[{ required: true }]}>
											<Input placeholder="TypeScript, PostgreSQL, AWS" />
										</Form.Item>
										<Form.Item label="Certifications (comma separated)" name="certifications">
											<Input placeholder="AWS Solutions Architect" />
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
																	<Input placeholder="English" style={{ width: 180 }} />
																</Form.Item>
																<Form.Item
																	{...restField}
																	name={[name, "percent"]}
																	rules={[{ required: true, message: "%" }]}
																	style={{ marginBottom: 0 }}
																>
																	<Space.Compact>
																		<InputNumber min={0} max={100} placeholder="%" style={{ width: 80 }} />
																		<Input disabled value="%" style={{ width: 44, textAlign: "center" }} />
																	</Space.Compact>
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
										<Form.Item label="Responsibilities (comma separated)" name="responsibilities" rules={[{ required: true }]}>
											<Input placeholder="Guide architecture, coordinate integration" />
										</Form.Item>
										<Form.Item label="Growth Goals (comma separated)" name="growthGoals">
											<Input placeholder="Increase mentoring impact" />
										</Form.Item>
									</>
								),
							},
							...projectsTab,
						].map((item) => ({
							...item,
							forceRender: true,
						}))}
					/>
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
