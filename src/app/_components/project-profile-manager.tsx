"use client";

import { useMemo, useState } from "react";
import {
	Alert,
	Button,
	Col,
	Form,
	Input,
	InputNumber,
	Divider,
	Row,
	Select,
	Space,
	Tabs,
	Tag,
	Typography,
} from "antd";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

import styles from "~/app/team-sync.module.css";
import { DataCard } from "~/app/_components/shared/data-card";
import { FormModal } from "~/app/_components/shared/form-modal";
import { MODAL_WIDTH_WIDE } from "~/app/_components/shared/modal-widths";
import { SearchSelect } from "~/app/_components/shared/search-select";
import { SectionHeader } from "~/app/_components/shared/section-header";
import { api } from "~/trpc/react";

type ProjectFormValues = {
	requiredTeamByRole: {
		role: string;
		headcount: number;
	}[];
	companyId: number;
	projectName: string;
	summary: string;
	purpose: string;
	businessGoals: string[];
	stakeholders: string[];
	scopeIn: string[];
	scopeOut: string[];
	architectureOverview: string;
	dataModels: string[];
	integrations: string[];
	requiredCapabilities: string[];
	requiredTechStack: string[];
	developmentProcess: string;
	timelineMilestones: string[];
	riskFactors: string[];
	operationsPlan: string;
	qualityCompliance: string[];
	dependencies: string[];
	environments: string[];
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
	businessGoals: [],
	stakeholders: [],
	scopeIn: [],
	scopeOut: [],
	architectureOverview: "",
	dataModels: [],
	integrations: [],
	requiredCapabilities: [],
	requiredTechStack: [],
	developmentProcess: "",
	timelineMilestones: [],
	riskFactors: [],
	operationsPlan: "",
	qualityCompliance: [],
	dependencies: [],
	environments: [],
	deploymentStrategy: "",
	monitoringAndLogging: "",
	maintenancePlan: "",
};

const toArray = (value: string[]) =>
	value
		.map((item) => item.trim())
		.filter((item) => item.length > 0);

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
	value: ProjectFormValues["requiredTeamByRole"],
) =>
	value
		.map((entry) => ({
			role: entry.role.trim(),
			headcount: Number(entry.headcount) || 0,
		}))
		.filter((entry) => entry.role.length > 0 && entry.headcount > 0);

const formatRequiredRole = (entry: { role: string; headcount: number }) => `${entry.role} (x${entry.headcount})`;

const resolveRequiredTeamByRole = (project: {
	requiredTeamByRole?: { role: string; headcount: number }[];
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
	const [searchValue, setSearchValue] = useState("");

	const projectsQuery = api.teamSync.projectProfiles.useQuery();
	const companiesQuery = api.teamSync.companyProfiles.useQuery();

	const companies = companiesQuery.data ?? [];
	const companyOptions = companies.map((company) => ({
		value: company.id,
		label: company.name,
	}));

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
				project.architectureOverview,
				project.developmentProcess,
				project.operationsPlan,
				project.deploymentStrategy,
				project.monitoringAndLogging,
				project.maintenancePlan,
				...project.businessGoals,
				...project.stakeholders,
				...project.scopeIn,
				...project.scopeOut,
				...project.dataModels,
				...project.integrations,
				...project.requiredCapabilities,
				...project.requiredTechStack,
				...project.timelineMilestones,
				...project.riskFactors,
				...project.qualityCompliance,
				...project.dependencies,
				...requiredTeamLabels,
				...project.environments,
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
		form.setFieldsValue({
			...defaultFormValues,
			companyId: companies[0]?.id ?? 0,
		});
		setIsModalOpen(true);
	};

	const openEditModal = (project: (typeof projects)[number]) => {
		const requiredTeamByRole = resolveRequiredTeamByRole(project);

		setEditingProjectId(project.id);
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
		form.setFieldsValue(defaultFormValues);
		setIsModalOpen(false);
	};

	const onSubmit = (values: ProjectFormValues) => {
		const requiredTeamByRole = normalizeRequiredTeamByRole(values.requiredTeamByRole);

		const payload = {
			companyId: values.companyId,
			projectName: values.projectName.trim(),
			summary: values.summary.trim(),
			purpose: values.purpose.trim(),
			businessGoals: toArray(values.businessGoals),
			stakeholders: toArray(values.stakeholders),
			scopeIn: toArray(values.scopeIn),
			scopeOut: toArray(values.scopeOut),
			architectureOverview: values.architectureOverview.trim(),
			dataModels: toArray(values.dataModels),
			integrations: toArray(values.integrations),
			requiredCapabilities: toArray(values.requiredCapabilities),
			requiredTechStack: toArray(values.requiredTechStack),
			developmentProcess: values.developmentProcess.trim(),
			timelineMilestones: toArray(values.timelineMilestones),
			riskFactors: toArray(values.riskFactors),
			operationsPlan: values.operationsPlan.trim(),
			qualityCompliance: toArray(values.qualityCompliance),
			dependencies: toArray(values.dependencies),
			requiredTeamByRole,
			environments: toArray(values.environments),
			deploymentStrategy: values.deploymentStrategy.trim(),
			monitoringAndLogging: values.monitoringAndLogging.trim(),
			maintenancePlan: values.maintenancePlan.trim(),
		};

		if (editingProjectId) {
			updateMutation.mutate({ projectId: editingProjectId, profile: payload });
			return;
		}

		createMutation.mutate(payload);
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
			title: "Required Team",
			dataIndex: "targetTeamSize",
			key: "targetTeamSize",
			sorter: (left, right) => left.targetTeamSize - right.targetTeamSize,
			render: (_value: number, project) => (
				<Space size={[4, 4]} wrap>
					{resolveRequiredTeamByRole(project).map((roleEntry) => (
						<Tag key={`${roleEntry.role}:${roleEntry.headcount}`} color="cyan">
							{formatRequiredRole(roleEntry)}
						</Tag>
					))}
				</Space>
			),
		},
		{
			title: "Stakeholders",
			dataIndex: "stakeholders",
			key: "stakeholders",
			render: (values: string[]) => (
				<Typography.Text ellipsis={{ tooltip: values.join(", ") }} style={{ maxWidth: 240 }}>
					{values.join(", ")}
				</Typography.Text>
			),
		},
		{
			title: "Capabilities",
			dataIndex: "requiredCapabilities",
			key: "requiredCapabilities",
			render: (values: string[]) => (
				<Space size={[4, 4]} wrap>
					{values.map((item) => (
						<Tag key={item} color="blue">
							{item}
						</Tag>
					))}
				</Space>
			),
		},
		{
			title: "Tech Stack",
			dataIndex: "requiredTechStack",
			key: "requiredTechStack",
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
			render: (_, project) => (
				<Button size="small" onClick={() => openEditModal(project)}>
					Edit
				</Button>
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
				loading={projectsQuery.isLoading || companiesQuery.isLoading}
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
				okText={editingProjectId ? "Save Changes" : "Create Project"}
				confirmLoading={createMutation.isPending || updateMutation.isPending}
				subtitle="All project profile dimensions are editable from this form."
			>
				<Tabs
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
											<Form.Item label="Project Name" name="projectName" rules={[{ required: true }]}>
												<Input placeholder="Orion Program" />
											</Form.Item>
										</Col>
									</Row>
									<Form.Item label="Description" name="summary" rules={[{ required: true }]}>
										<Input.TextArea rows={3} placeholder="Project summary and context" />
									</Form.Item>
									<Form.Item label="Purpose" name="purpose" rules={[{ required: true }]}>
										<Input.TextArea rows={2} placeholder="Why this project exists" />
									</Form.Item>
								</>
							),
						},
						{
							key: "business",
							label: "Business & Scope",
							children: (
								<>
									<Form.Item label="Business Goals" name="businessGoals" rules={[{ required: true }]}>
										<SearchSelect mode="tags" tokenSeparators={[","]} placeholder="Add business goals" />
									</Form.Item>
									<Form.Item label="Stakeholders" name="stakeholders" rules={[{ required: true }]}>
										<SearchSelect mode="tags" tokenSeparators={[","]} placeholder="Add stakeholders" />
									</Form.Item>
									<Row gutter={16}>
										<Col xs={24} md={12}>
											<Form.Item label="Scope In" name="scopeIn" rules={[{ required: true }]}>
												<SearchSelect mode="tags" tokenSeparators={[","]} placeholder="In-scope items" />
											</Form.Item>
										</Col>
										<Col xs={24} md={12}>
											<Form.Item label="Scope Out" name="scopeOut" rules={[{ required: true }]}>
												<SearchSelect mode="tags" tokenSeparators={[","]} placeholder="Out-of-scope items" />
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
									<Form.Item label="Architecture Overview" name="architectureOverview" rules={[{ required: true }]}>
										<Input.TextArea rows={3} placeholder="Architecture direction and key patterns" />
									</Form.Item>
									<Form.Item label="Data Models" name="dataModels" rules={[{ required: true }]}>
										<SearchSelect mode="tags" tokenSeparators={[","]} placeholder="Add data model concepts" />
									</Form.Item>
									<Form.Item label="Integrations" name="integrations" rules={[{ required: true }]}>
										<SearchSelect mode="tags" tokenSeparators={[","]} placeholder="Add integration points" />
									</Form.Item>
									<Form.Item label="Required Capabilities" name="requiredCapabilities" rules={[{ required: true }]}>
										<SearchSelect mode="tags" tokenSeparators={[","]} placeholder="Add required capabilities" />
									</Form.Item>
									<Form.Item label="Technology Stack" name="requiredTechStack" rules={[{ required: true }]}>
										<SearchSelect mode="tags" tokenSeparators={[","]} placeholder="Add required technologies" />
									</Form.Item>
									<Form.Item label="Development Process" name="developmentProcess" rules={[{ required: true }]}>
										<Input.TextArea rows={3} placeholder="Delivery process, cadence, and governance" />
									</Form.Item>
									<Form.Item label="Timeline & Milestones" name="timelineMilestones" rules={[{ required: true }]}>
										<SearchSelect mode="tags" tokenSeparators={[","]} placeholder="Add timeline checkpoints" />
									</Form.Item>
								</>
							),
						},
						{
							key: "risk",
							label: "Risk & Operations",
							children: (
								<>
									<Form.Item label="Risks & Constraints" name="riskFactors" rules={[{ required: true }]}>
										<SearchSelect mode="tags" tokenSeparators={[","]} placeholder="Add risks and constraints" />
									</Form.Item>
									<Form.Item label="Operations Plan" name="operationsPlan" rules={[{ required: true }]}>
										<Input.TextArea rows={3} placeholder="Operations model and ownership" />
									</Form.Item>
									<Form.Item label="Quality & Compliance" name="qualityCompliance" rules={[{ required: true }]}>
										<SearchSelect mode="tags" tokenSeparators={[","]} placeholder="Add quality and compliance requirements" />
									</Form.Item>
									<Form.Item label="Dependencies" name="dependencies" rules={[{ required: true }]}>
										<SearchSelect mode="tags" tokenSeparators={[","]} placeholder="Add dependencies" />
									</Form.Item>
									<Divider>Required Team Members</Divider>
									<Form.List
										name="requiredTeamByRole"
										rules={[
											{
												validator: async (_, value: ProjectFormValues["requiredTeamByRole"]) => {
													if (normalizeRequiredTeamByRole(value ?? []).length > 0) {
														return;
													}

													throw new Error("Add at least one role and required headcount.");
												},
											},
										]}
									>
										{(fields, { add, remove }, { errors }) => (
											<>
												{fields.map((field) => (
													<Row key={field.key} gutter={12} align="middle" style={{ marginBottom: 8 }}>
														<Col xs={24} md={14}>
															<Form.Item
																{...field}
																label="Role"
																name={[field.name, "role"]}
																rules={[{ required: true, message: "Role is required" }]}
															>
																<Input placeholder="AI Engineer" />
															</Form.Item>
														</Col>
														<Col xs={20} md={8}>
															<Form.Item
																{...field}
																label="People"
																name={[field.name, "headcount"]}
																rules={[{ required: true, message: "Count is required" }]}
															>
																<InputNumber min={1} max={50} style={{ width: "100%" }} />
															</Form.Item>
														</Col>
														<Col xs={4} md={2}>
															<Button
																type="text"
																danger
																icon={<MinusCircleOutlined />}
																onClick={() => remove(field.name)}
															/>
														</Col>
													</Row>
												))}
												<Form.ErrorList errors={errors} />
												<Button
													type="dashed"
													icon={<PlusOutlined />}
													onClick={() => add({ role: "", headcount: 1 })}
												>
													Add Required Role
												</Button>
											</>
										)}
									</Form.List>
								</>
							),
						},
						{
							key: "deployment",
							label: "Deployment & Support",
							children: (
								<>
									<Form.Item label="Environments" name="environments" rules={[{ required: true }]}>
										<SearchSelect mode="tags" tokenSeparators={[","]} placeholder="dev, staging, prod" />
									</Form.Item>
									<Form.Item label="Deployment Strategy" name="deploymentStrategy" rules={[{ required: true }]}>
										<Input.TextArea rows={2} placeholder="How releases are rolled out safely" />
									</Form.Item>
									<Form.Item label="Monitoring & Logging" name="monitoringAndLogging" rules={[{ required: true }]}>
										<Input.TextArea rows={2} placeholder="Telemetry, dashboards, and alerting" />
									</Form.Item>
									<Form.Item label="Maintenance Plan" name="maintenancePlan" rules={[{ required: true }]}>
										<Input.TextArea rows={2} placeholder="Ongoing maintenance and review cadence" />
									</Form.Item>
									<Typography.Text type="secondary">
										Target team size is calculated from required roles and people counts.
									</Typography.Text>
								</>
							),
						},
					]}
				/>
			</FormModal>
		</section>
	);
}
