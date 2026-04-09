"use client";

import { useMemo, useState } from "react";
import {
	Alert,
	Button,
	Form,
	Input,
	InputNumber,
	Modal,
	Select,
	Space,
	Table,
	Tag,
	Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";

import styles from "~/app/team-sync.module.css";
import { api } from "~/trpc/react";

type ProjectFormValues = {
	companyId: number;
	projectName: string;
	summary: string;
	requiredCapabilities: string;
	requiredTechStack: string;
	riskFactors: string;
	targetTeamSize: number;
};

const defaultFormValues: ProjectFormValues = {
	companyId: 0,
	projectName: "",
	summary: "",
	requiredCapabilities: "",
	requiredTechStack: "",
	riskFactors: "",
	targetTeamSize: 3,
};

const toArray = (value: string) =>
	value
		.split(",")
		.map((item) => item.trim())
		.filter((item) => item.length > 0);

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
			const searchableText = [
				project.projectName,
				project.summary,
				...project.requiredCapabilities,
				...project.requiredTechStack,
				...project.riskFactors,
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
		setEditingProjectId(project.id);
		form.setFieldsValue({
			companyId: project.companyId,
			projectName: project.projectName,
			summary: project.summary,
			requiredCapabilities: project.requiredCapabilities.join(", "),
			requiredTechStack: project.requiredTechStack.join(", "),
			riskFactors: project.riskFactors.join(", "),
			targetTeamSize: project.targetTeamSize,
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
		const payload = {
			companyId: values.companyId,
			projectName: values.projectName.trim(),
			summary: values.summary.trim(),
			requiredCapabilities: toArray(values.requiredCapabilities),
			requiredTechStack: toArray(values.requiredTechStack),
			riskFactors: toArray(values.riskFactors),
			targetTeamSize: values.targetTeamSize,
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
			title: "Target Team",
			dataIndex: "targetTeamSize",
			key: "targetTeamSize",
			sorter: (left, right) => left.targetTeamSize - right.targetTeamSize,
			render: (value: number) => `${value}`,
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
			<div className={styles.profileSectionHeader}>
				<div>
					<Typography.Title level={2} style={{ marginBottom: 4 }}>
						Project Profiles
					</Typography.Title>
					<Typography.Text type="secondary">
						Manage project records stored in PostgreSQL.
					</Typography.Text>
				</div>
				<Button
					type="primary"
					onClick={openCreateModal}
					disabled={companyOptions.length === 0}
				>
					Add Project
				</Button>
			</div>

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
					placeholder="Search by project, capability, tech stack, or risk"
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

			<Table
				rowKey="id"
				columns={columns}
				dataSource={projects}
				loading={projectsQuery.isLoading || companiesQuery.isLoading}
				size="middle"
				pagination={{ pageSize: 6, showSizeChanger: false }}
				scroll={{ x: 1080 }}
			/>

			{!projectsQuery.isLoading && projects.length === 0 && (
				<Typography.Text type="secondary">No projects matched your search.</Typography.Text>
			)}

			<Modal
				title={editingProjectId ? "Edit Project" : "Add Project"}
				open={isModalOpen}
				onCancel={closeModal}
				footer={null}
				destroyOnHidden
			>
				<Form
					layout="vertical"
					form={form}
					initialValues={defaultFormValues}
					onFinish={onSubmit}
				>
					<Form.Item label="Company" name="companyId" rules={[{ required: true }]}> 
						<Select options={companyOptions} placeholder="Select company" />
					</Form.Item>
					<Form.Item label="Project Name" name="projectName" rules={[{ required: true }]}> 
						<Input placeholder="Orion Program" />
					</Form.Item>
					<Form.Item label="Summary" name="summary" rules={[{ required: true }]}> 
						<Input.TextArea rows={3} placeholder="Project summary and intent" />
					</Form.Item>
					<Form.Item
						label="Target Team Size"
						name="targetTeamSize"
						rules={[{ required: true }]}
					>
						<InputNumber min={1} max={50} style={{ width: "100%" }} />
					</Form.Item>
					<Form.Item
						label="Required Capabilities (comma separated)"
						name="requiredCapabilities"
						rules={[{ required: true }]}
					>
						<Input placeholder="System architecture, Prompt engineering" />
					</Form.Item>
					<Form.Item
						label="Required Tech Stack (comma separated)"
						name="requiredTechStack"
						rules={[{ required: true }]}
					>
						<Input placeholder="TypeScript, Next.js, PostgreSQL" />
					</Form.Item>
					<Form.Item
						label="Risk Factors (comma separated)"
						name="riskFactors"
						rules={[{ required: true }]}
					>
						<Input placeholder="Integration dependencies, timeline risk" />
					</Form.Item>
					<Space style={{ width: "100%", justifyContent: "flex-end" }}>
						<Button onClick={closeModal}>Cancel</Button>
						<Button
							type="primary"
							htmlType="submit"
							loading={createMutation.isPending || updateMutation.isPending}
						>
							{editingProjectId ? "Save Changes" : "Create Project"}
						</Button>
					</Space>
				</Form>
			</Modal>
		</section>
	);
}
