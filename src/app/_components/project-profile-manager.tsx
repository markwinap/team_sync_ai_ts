"use client";

import { useMemo, useState } from "react";
import {
	Alert,
	Button,
	Col,
	Form,
	Input,
	Row,
	Select,
	Space,
	Tabs,
	Typography,
} from "antd";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

import styles from "~/app/team-sync.module.css";
import { DataCard } from "~/app/_components/shared/data-card";
import { FormModal } from "~/app/_components/shared/form-modal";
import { MODAL_WIDTH_WIDE } from "~/app/_components/shared/modal-widths";
import { SectionHeader } from "~/app/_components/shared/section-header";
import { ProjectDetailModal } from "~/app/_components/project-detail-modal";
import { api } from "~/trpc/react";

type ProjectFormValues = {
	requiredTeamByRole: {
		role: string;
		headcount: number;
		assignedMemberId?: string;
	}[];
	companyId: number;
	projectName: string;
	summary: string;
	purpose: string;
	businessGoals: string;
	stakeholders: string;
	scopeIn: string;
	scopeOut: string;
	architectureOverview: string;
	dataModels: string;
	integrations: string;
	requiredCapabilities: string;
	requiredTechStack: string;
	developmentProcess: string;
	timelineMilestones: string;
	riskFactors: string;
	operationsPlan: string;
	qualityCompliance: string;
	dependencies: string;
	environments: string;
	deploymentStrategy: string;
	monitoringAndLogging: string;
	maintenancePlan: string;
};

const defaultFormValues: ProjectFormValues = {
	requiredTeamByRole: [],
	companyId: 0,
	projectName: "",
	summary: "",
	purpose: "",
	businessGoals: "",
	stakeholders: "",
	scopeIn: "",
	scopeOut: "",
	architectureOverview: "",
	dataModels: "",
	integrations: "",
	requiredCapabilities: "",
	requiredTechStack: "",
	developmentProcess: "",
	timelineMilestones: "",
	riskFactors: "",
	operationsPlan: "",
	qualityCompliance: "",
	dependencies: "",
	environments: "",
	deploymentStrategy: "",
	monitoringAndLogging: "",
	maintenancePlan: "",
};

const normalizeText = (value: string | null | undefined) => (value ?? "").trim();

const parseRequiredRole = (value: string) => {
	const trimmedValue = value.trim();
	const matched = /^(.*)\(x(\d+)\)$/i.exec(trimmedValue);

	if (!matched) {
		return {
			role: trimmedValue,
			headcount: 1,
		};
	}

	return {
		role: matched[1]?.trim() ?? trimmedValue,
		headcount: Number(matched[2]) || 1,
	};
};

const normalizeRequiredTeamByRole = (
	value: ProjectFormValues["requiredTeamByRole"] | undefined,
) =>
	(value ?? [])
		.map((entry) => ({
			role: entry.role.trim(),
			headcount: 1,
			assignedMemberId: entry.assignedMemberId?.trim() || undefined,
		}))
		.filter((entry) => entry.role.length > 0);

const formatRequiredRole = (entry: { role: string; headcount: number }) => entry.role;

const resolveRequiredTeamByRole = (project: {
	requiredTeamByRole?: { role: string; headcount: number; assignedMemberId?: string }[];
	teamRoles: string[];
}) => {
	if ((project.requiredTeamByRole ?? []).length > 0) {
		return normalizeRequiredTeamByRole(project.requiredTeamByRole ?? []);
	}

	return normalizeRequiredTeamByRole(project.teamRoles.map(parseRequiredRole));
};

export function ProjectProfileManager() {
	const utils = api.useUtils();
	const [form] = Form.useForm<ProjectFormValues>();
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
	const [activeTabKey, setActiveTabKey] = useState("overview");
	const [modalValidationMessage, setModalValidationMessage] = useState<string | null>(null);
	const [searchValue, setSearchValue] = useState("");
	const [viewingProject, setViewingProject] = useState<(typeof projects)[number] | null>(null);

	const fieldTabMap: Record<string, string> = {
		companyId: "overview",
		projectName: "overview",
		summary: "overview",
		purpose: "overview",
		businessGoals: "business",
		stakeholders: "business",
		scopeIn: "business",
		scopeOut: "business",
		architectureOverview: "architecture",
		dataModels: "architecture",
		integrations: "architecture",
		requiredCapabilities: "architecture",
		requiredTechStack: "architecture",
		developmentProcess: "architecture",
		timelineMilestones: "architecture",
		riskFactors: "risk",
		operationsPlan: "risk",
		qualityCompliance: "risk",
		dependencies: "risk",
		requiredTeamByRole: "team",
		environments: "deployment",
		deploymentStrategy: "deployment",
		monitoringAndLogging: "deployment",
		maintenancePlan: "deployment",
	};

	const tabLabelMap: Record<string, string> = {
		overview: "Overview",
		business: "Business & Scope",
		architecture: "Architecture & Delivery",
		risk: "Risk & Operations",
		team: "Team Size & Roles",
		deployment: "Deployment & Support",
	};

	const projectsQuery = api.teamSync.projectProfiles.useQuery();
	const companiesQuery = api.teamSync.companyProfiles.useQuery();
	const teamMemberProfilesQuery = api.teamSync.teamMemberProfiles.useQuery();

	const companies = companiesQuery.data ?? [];
	const teamMembers = teamMemberProfilesQuery.data ?? [];
	const companyOptions = companies.map((company) => ({
		value: company.id,
		label: company.name,
	}));
	const teamMemberOptions = teamMembers.map((member) => ({
		value: member.id,
		label: `${member.fullName} (${member.role})`,
	}));
	const teamMemberNameById = useMemo(
		() =>
			new Map(
				teamMembers.map((member) => [member.id, `${member.fullName} (${member.role})`] as const),
			),
		[teamMembers],
	);
	const watchedRequiredTeamByRole = Form.useWatch("requiredTeamByRole", form) ?? [];
	const roleOptions = useMemo(() => {
		const roleSet = new Set<string>();

		for (const member of teamMembers) {
			const role = member.role.trim();
			if (role.length > 0) {
				roleSet.add(role);
			}
		}

		for (const entry of watchedRequiredTeamByRole) {
			const role = entry?.role?.trim();
			if (role) {
				roleSet.add(role);
			}
		}

		return [...roleSet]
			.sort((left, right) => left.localeCompare(right))
			.map((role) => ({ value: role, label: role }));
	}, [teamMembers, watchedRequiredTeamByRole]);

	const createMutation = api.teamSync.createProjectProfile.useMutation({
		onSuccess: async () => {
			setEditingProjectId(null);
			form.setFieldsValue(defaultFormValues);
			setIsModalOpen(false);
			await utils.teamSync.projectProfiles.invalidate();
			await utils.teamSync.snapshot.invalidate();
		},
	});

	const updateMutation = api.teamSync.updateProjectProfile.useMutation({
		onSuccess: async () => {
			setEditingProjectId(null);
			form.setFieldsValue(defaultFormValues);
			setIsModalOpen(false);
			await utils.teamSync.projectProfiles.invalidate();
			await utils.teamSync.snapshot.invalidate();
		},
	});

	const isSubmitting = createMutation.isPending || updateMutation.isPending;

	const projects = useMemo(() => {
		const normalizedSearch = searchValue.trim().toLowerCase();
		const source = projectsQuery.data ?? [];

		if (!normalizedSearch) {
			return source;
		}

		return source.filter((project) => {
			const requiredTeamLabels = resolveRequiredTeamByRole(project).map(formatRequiredRole);

			const searchableText = [
				project.projectName,
				project.summary,
				project.purpose,
				project.businessGoals,
				project.stakeholders,
				project.scopeIn,
				project.scopeOut,
				project.architectureOverview,
				project.dataModels,
				project.integrations,
				project.requiredCapabilities,
				project.requiredTechStack,
				project.developmentProcess,
				project.timelineMilestones,
				project.riskFactors,
				project.operationsPlan,
				project.qualityCompliance,
				project.dependencies,
				project.environments,
				project.deploymentStrategy,
				project.monitoringAndLogging,
				project.maintenancePlan,
				...requiredTeamLabels,
			]
				.join(" ")
				.toLowerCase();

			return searchableText.includes(normalizedSearch);
		});
	}, [projectsQuery.data, searchValue]);

	const resolveCompanyName = (companyId: number) => {
		const company = companies.find((item) => item.id === companyId);
		return company?.name ?? `Company #${companyId}`;
	};

	const openCreateModal = () => {
		setEditingProjectId(null);
		setActiveTabKey("overview");
		setModalValidationMessage(null);
		form.setFieldsValue({
			...defaultFormValues,
			companyId: companies[0]?.id ?? 0,
		});
		setIsModalOpen(true);
	};

	const getCompanyNameForProject = (companyId: number) => resolveCompanyName(companyId);

	const openEditModal = (project: (typeof projects)[number]) => {
		const requiredTeamByRole = resolveRequiredTeamByRole(project);

		setEditingProjectId(project.id);
		setActiveTabKey("overview");
		setModalValidationMessage(null);
		form.setFieldsValue({
			requiredTeamByRole,
			companyId: project.companyId,
			projectName: project.projectName,
			summary: project.summary,
			purpose: project.purpose,
			businessGoals: project.businessGoals,
			stakeholders: project.stakeholders,
			scopeIn: project.scopeIn,
			scopeOut: project.scopeOut,
			architectureOverview: project.architectureOverview,
			dataModels: project.dataModels,
			integrations: project.integrations,
			requiredCapabilities: project.requiredCapabilities,
			requiredTechStack: project.requiredTechStack,
			developmentProcess: project.developmentProcess,
			timelineMilestones: project.timelineMilestones,
			riskFactors: project.riskFactors,
			operationsPlan: project.operationsPlan,
			qualityCompliance: project.qualityCompliance,
			dependencies: project.dependencies,
			environments: project.environments,
			deploymentStrategy: project.deploymentStrategy,
			monitoringAndLogging: project.monitoringAndLogging,
			maintenancePlan: project.maintenancePlan,
		});
		setIsModalOpen(true);
	};

	const closeModal = () => {
		if (isSubmitting) {
			return;
		}

		setEditingProjectId(null);
		setActiveTabKey("overview");
		setModalValidationMessage(null);
		form.setFieldsValue(defaultFormValues);
		setIsModalOpen(false);
	};

	const onSubmit = (values: ProjectFormValues) => {
		setModalValidationMessage(null);
		const requiredTeamByRole = normalizeRequiredTeamByRole(values.requiredTeamByRole);

		const payload = {
			companyId: values.companyId,
			projectName: normalizeText(values.projectName),
			summary: values.summary,
			purpose: values.purpose,
			businessGoals: values.businessGoals,
			stakeholders: values.stakeholders,
			scopeIn: values.scopeIn,
			scopeOut: values.scopeOut,
			architectureOverview: values.architectureOverview,
			dataModels: values.dataModels,
			integrations: values.integrations,
			requiredCapabilities: values.requiredCapabilities,
			requiredTechStack: values.requiredTechStack,
			developmentProcess: values.developmentProcess,
			timelineMilestones: values.timelineMilestones,
			riskFactors: values.riskFactors,
			operationsPlan: values.operationsPlan,
			qualityCompliance: values.qualityCompliance,
			dependencies: values.dependencies,
			requiredTeamByRole,
			environments: values.environments,
			deploymentStrategy: values.deploymentStrategy,
			monitoringAndLogging: values.monitoringAndLogging,
			maintenancePlan: values.maintenancePlan,
		};

		if (editingProjectId) {
			updateMutation.mutate({ projectId: editingProjectId, profile: payload });
			return;
		}

		createMutation.mutate(payload);
	};

	const onSubmitFailed = (errorInfo: { errorFields: Array<{ name: Array<string | number> }> }) => {
		const firstField = errorInfo.errorFields[0];
		const rootField = firstField?.name?.[0];
		const mappedTabKey = typeof rootField === "string" ? fieldTabMap[rootField] : undefined;

		if (mappedTabKey) {
			setActiveTabKey(mappedTabKey);
			setModalValidationMessage(
				`Please complete required fields in ${tabLabelMap[mappedTabKey]} before saving.`,
			);
			return;
		}

		setModalValidationMessage("Please complete the required fields before saving.");
	};

	const columns: ColumnsType<(typeof projects)[number]> = [
		{
			title: "Project",
			dataIndex: "projectName",
			key: "projectName",
			sorter: (left, right) => left.projectName.localeCompare(right.projectName),
			defaultSortOrder: "ascend",
		},
		{
			title: "Company",
			dataIndex: "companyId",
			key: "companyId",
			render: (companyId: number) => resolveCompanyName(companyId),
		},
		{
			title: "Purpose",
			dataIndex: "purpose",
			key: "purpose",
			render: (value: string) => (
				<Typography.Text ellipsis={{ tooltip: value }} style={{ maxWidth: 240 }}>
					{value}
				</Typography.Text>
			),
		},
		{
			title: "Stakeholders",
			dataIndex: "stakeholders",
			key: "stakeholders",
			render: (value: string) => (
				<Typography.Text ellipsis={{ tooltip: value }} style={{ maxWidth: 240 }}>
					{value}
				</Typography.Text>
			),
		},
		{
			title: "Capabilities",
			dataIndex: "requiredCapabilities",
			key: "requiredCapabilities",
			render: (value: string) => (
				<Typography.Text ellipsis={{ tooltip: value }} style={{ maxWidth: 240 }}>
					{value}
				</Typography.Text>
			),
		},
		{
			title: "Tech Stack",
			dataIndex: "requiredTechStack",
			key: "requiredTechStack",
			render: (value: string) => (
				<Typography.Text ellipsis={{ tooltip: value }} style={{ maxWidth: 240 }}>
					{value}
				</Typography.Text>
			),
		},
		{
			title: "Actions",
			key: "actions",
			render: (_, project) => (
				<Space>
					<Button size="small" onClick={() => openEditModal(project)}>
						Edit
					</Button>
				</Space>
			),
		},
	];

	return (
		<section className={styles.panel}>
			<SectionHeader
				title="Project Profiles"
				description="Manage project records and planning dimensions persisted in PostgreSQL."
				actionLabel="Add Project"
				onAction={openCreateModal}
				actionDisabled={companyOptions.length === 0}
			/>

			{companyOptions.length === 0 && (
				<Alert
					showIcon
					type="warning"
					title="Create at least one company before adding projects."
				/>
			)}

			<div className={styles.profileToolbar}>
				<Typography.Text strong>Search</Typography.Text>
				<Input
					placeholder="Search by project, purpose, capability, stakeholder, or risk"
					value={searchValue}
					onChange={(event) => setSearchValue(event.target.value)}
				/>
			</div>

			{createMutation.error && (
				<Alert
					showIcon
					type="error"
					title={`Failed to create project: ${createMutation.error.message}`}
				/>
			)}
			{updateMutation.error && (
				<Alert
					showIcon
					type="error"
					title={`Failed to update project: ${updateMutation.error.message}`}
				/>
			)}

			<DataCard
				title="Project Portfolio"
				rowKey="id"
				columns={columns}
				dataSource={projects}
				loading={
					projectsQuery.isLoading || companiesQuery.isLoading || teamMemberProfilesQuery.isLoading
				}
				pageSize={6}
			/>

			{!projectsQuery.isLoading && projects.length === 0 && (
				<Typography.Text type="secondary">No projects matched your search.</Typography.Text>
			)}

			<FormModal
				title={editingProjectId ? "Edit Project Profile" : "Add Project Profile"}
				open={isModalOpen}
				onCancel={closeModal}
				width={MODAL_WIDTH_WIDE}
				form={form}
				onFinish={onSubmit}
				onFinishFailed={onSubmitFailed}
				okText={editingProjectId ? "Save Changes" : "Create Project"}
				confirmLoading={createMutation.isPending || updateMutation.isPending}
				subtitle="All project profile dimensions are editable from this form."
			>
				{modalValidationMessage && (
					<Alert showIcon type="error" title={modalValidationMessage} style={{ marginBottom: 12 }} />
				)}
				<Tabs
					activeKey={activeTabKey}
					onChange={(nextKey) => {
						setActiveTabKey(nextKey);
						if (modalValidationMessage) {
							setModalValidationMessage(null);
						}
					}}
					items={[
						{
							key: "overview",
							label: "Overview",
							children: (
								<>
									<Row gutter={16}>
										<Col xs={24} md={12}>
											<Form.Item label="Company" name="companyId" rules={[{ required: true }]}>
												<Select options={companyOptions} placeholder="Select company" />
											</Form.Item>
										</Col>
										<Col xs={24} md={12}>
											<Form.Item
												label="Project Name"
												name="projectName"
												rules={[{ required: true, whitespace: true, message: "Project Name is required" }]}
											>
												<Input placeholder="Project title (markdown supported)" />
											</Form.Item>
										</Col>
									</Row>
									<Form.Item
										label="Description"
										name="summary"
										rules={[{ required: true, whitespace: true, message: "Description is required" }]}
									>
										<Input.TextArea rows={4} placeholder="Project summary and context (markdown supported)" />
									</Form.Item>
									<Form.Item
										label="Purpose"
										name="purpose"
										rules={[{ required: true, whitespace: true, message: "Purpose is required" }]}
									>
										<Input.TextArea rows={3} placeholder="Why this project exists (markdown supported)" />
									</Form.Item>
								</>
							),
						},
						{
							key: "business",
							label: "Business & Scope",
							children: (
								<>
									<Form.Item label="Business Goals" name="businessGoals">
										<Input.TextArea rows={4} placeholder="Markdown list, one item per line" />
									</Form.Item>
									<Form.Item label="Stakeholders" name="stakeholders">
										<Input.TextArea rows={4} placeholder="Markdown list, one item per line" />
									</Form.Item>
									<Row gutter={16}>
										<Col xs={24} md={12}>
											<Form.Item label="Scope In" name="scopeIn">
												<Input.TextArea rows={4} placeholder="Markdown list, one item per line" />
											</Form.Item>
										</Col>
										<Col xs={24} md={12}>
											<Form.Item label="Scope Out" name="scopeOut">
												<Input.TextArea rows={4} placeholder="Markdown list, one item per line" />
											</Form.Item>
										</Col>
									</Row>
								</>
							),
						},
						{
							key: "architecture",
							label: "Architecture & Delivery",
							children: (
								<>
									<Form.Item label="Architecture Overview" name="architectureOverview">
										<Input.TextArea rows={4} placeholder="Architecture direction and key patterns (markdown supported)" />
									</Form.Item>
									<Form.Item label="Data Models" name="dataModels">
										<Input.TextArea rows={4} placeholder="Markdown list, one item per line" />
									</Form.Item>
									<Form.Item label="Integrations" name="integrations">
										<Input.TextArea rows={4} placeholder="Markdown list, one item per line" />
									</Form.Item>
									<Form.Item label="Required Capabilities" name="requiredCapabilities">
										<Input.TextArea rows={4} placeholder="Markdown list, one item per line" />
									</Form.Item>
									<Form.Item label="Technology Stack" name="requiredTechStack">
										<Input.TextArea rows={4} placeholder="Markdown list, one item per line" />
									</Form.Item>
									<Form.Item label="Development Process" name="developmentProcess">
										<Input.TextArea rows={4} placeholder="Delivery process, cadence, and governance (markdown supported)" />
									</Form.Item>
									<Form.Item label="Timeline & Milestones" name="timelineMilestones">
										<Input.TextArea rows={4} placeholder="Markdown list, one item per line" />
									</Form.Item>
								</>
							),
						},
						{
							key: "risk",
							label: "Risk & Operations",
							children: (
								<>
									<Form.Item label="Risks & Constraints" name="riskFactors">
										<Input.TextArea rows={4} placeholder="Markdown list, one item per line" />
									</Form.Item>
									<Form.Item label="Operations Plan" name="operationsPlan">
										<Input.TextArea rows={4} placeholder="Operations model and ownership (markdown supported)" />
									</Form.Item>
									<Form.Item label="Quality & Compliance" name="qualityCompliance">
										<Input.TextArea rows={4} placeholder="Markdown list, one item per line" />
									</Form.Item>
									<Form.Item label="Dependencies" name="dependencies">
										<Input.TextArea rows={4} placeholder="Markdown list, one item per line" />
									</Form.Item>
								</>
							),
						},
						{
							key: "deployment",
							label: "Deployment & Support",
							children: (
								<>
									<Form.Item label="Environments" name="environments">
										<Input.TextArea rows={4} placeholder="Markdown list, one item per line" />
									</Form.Item>
									<Form.Item label="Deployment Strategy" name="deploymentStrategy">
										<Input.TextArea rows={4} placeholder="How releases are rolled out safely (markdown supported)" />
									</Form.Item>
									<Form.Item label="Monitoring & Logging" name="monitoringAndLogging">
										<Input.TextArea rows={4} placeholder="Telemetry, dashboards, and alerting (markdown supported)" />
									</Form.Item>
									<Form.Item label="Maintenance Plan" name="maintenancePlan">
										<Input.TextArea rows={4} placeholder="Ongoing maintenance and review cadence (markdown supported)" />
									</Form.Item>
									<Typography.Text type="secondary">
										Team size is optional. Add roles only if needed.
									</Typography.Text>
								</>
							),
						},
												{
							key: "team",
							label: "Team Size & Roles",
							children: (
								<>
									<Form.List name="requiredTeamByRole">
										{(fields, { add, remove }, { errors }) => (
											<>
												<Row justify="end" align="middle" style={{ marginBottom: 12 }}>
													<Button
														type="dashed"
														icon={<PlusOutlined />}
														onClick={() => add({ role: "", headcount: 1 })}
													>
														Add Required Role
													</Button>
												</Row>
												{fields.map((field) => (
													<Row
														key={field.key}
														gutter={[12, 0]}
														align="middle"
														style={{
															marginBottom: 10,
															padding: 12,
															border: "1px solid rgba(255, 255, 255, 0.1)",
															borderRadius: 10,
														}}
													>
														<Col xs={24} md={11}>
															<Form.Item
																{...field}
																label="Role"
																name={[field.name, "role"]}
																rules={[{ required: true, message: "Role is required" }]}
															>
																<Select
																	showSearch
																	options={roleOptions}
																	placeholder="Select role"
																	optionFilterProp="label"
																	notFoundContent="No roles available"
																/>
															</Form.Item>
														</Col>
														<Col xs={24} md={11}>
															<Form.Item
																{...field}
																label="Optional Team Member"
																name={[field.name, "assignedMemberId"]}
															>
																<Select
																	allowClear
																	showSearch
																	options={teamMemberOptions}
																	placeholder="Select profile"
																	optionFilterProp="label"
																	notFoundContent="No team profiles"
																/>
															</Form.Item>
														</Col>
														<Col xs={24} md={2}>
															<Form.Item label=" " style={{ marginBottom: 0 }}>
																<Button
																	type="text"
																	danger
																	icon={<MinusCircleOutlined />}
																	onClick={() => remove(field.name)}
																/>
															</Form.Item>
														</Col>
													</Row>
												))}
												<Form.ErrorList errors={errors} />
											</>
										)}
									</Form.List>
									<Typography.Text type="secondary">
										You can optionally pre-assign a profile to each role from available team members.
									</Typography.Text>
								</>
							),
						},
					]}
				/>

			<ProjectDetailModal
				open={viewingProject !== null}
				onClose={() => setViewingProject(null)}
				project={viewingProject}
				companyName={viewingProject ? getCompanyNameForProject(viewingProject.companyId) : ""}
			/>
		</FormModal>
		</section>
	);
}
