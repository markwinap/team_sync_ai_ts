"use client";

import { useMemo, useState } from "react";
import {
	Alert,
	Button,
	Form,
	Input,
	Modal,
	Space,
	Table,
	Tabs,
	Tag,
	Typography,
} from "antd";
import { EditOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

import styles from "~/app/team-sync.module.css";
import { SectionHeader } from "~/app/_components/shared/section-header";
import { csvToArray } from "~/lib/normalize";
import { api } from "~/trpc/react";

type CompanyFormValues = {
	name: string;
	industry: string;
	businessIntent: string;
	technologyIntent: string;
	standards: string;
	partnerships: string;
};

const defaultFormValues: CompanyFormValues = {
	name: "",
	industry: "",
	businessIntent: "",
	technologyIntent: "",
	standards: "",
	partnerships: "",
};

export function CompanyProfileManager() {
	const utils = api.useUtils();
	const [form] = Form.useForm<CompanyFormValues>();
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingCompanyId, setEditingCompanyId] = useState<number | null>(null);
	const [searchValue, setSearchValue] = useState("");

	const companiesQuery = api.teamSync.companyProfiles.useQuery();

	const createMutation = api.teamSync.createCompanyProfile.useMutation({
		onSuccess: async () => {
			form.setFieldsValue(defaultFormValues);
			setEditingCompanyId(null);
			setIsModalOpen(false);
			await utils.teamSync.companyProfiles.invalidate();
			await utils.teamSync.snapshot.invalidate();
		},
	});

	const updateMutation = api.teamSync.updateCompanyProfile.useMutation({
		onSuccess: async () => {
			form.setFieldsValue(defaultFormValues);
			setEditingCompanyId(null);
			setIsModalOpen(false);
			await utils.teamSync.companyProfiles.invalidate();
			await utils.teamSync.snapshot.invalidate();
		},
	});

	const isSubmitting = createMutation.isPending || updateMutation.isPending;

	const companies = useMemo(() => {
		const normalizedSearch = searchValue.trim().toLowerCase();
		const source = companiesQuery.data ?? [];

		if (!normalizedSearch) {
			return source;
		}

		return source.filter((company) => {
			const searchableText = [
				company.name,
				company.industry,
				company.businessIntent,
				company.technologyIntent,
				...company.standards,
				...company.partnerships,
			]
				.join(" ")
				.toLowerCase();

			return searchableText.includes(normalizedSearch);
		});
	}, [companiesQuery.data, searchValue]);

	const openCreateModal = () => {
		setEditingCompanyId(null);
		form.setFieldsValue(defaultFormValues);
		setIsModalOpen(true);
	};

	const openEditModal = (company: (typeof companies)[number]) => {
		setEditingCompanyId(company.id);
		form.setFieldsValue({
			name: company.name,
			industry: company.industry,
			businessIntent: company.businessIntent,
			technologyIntent: company.technologyIntent,
			standards: company.standards.join(", "),
			partnerships: company.partnerships.join(", "),
		});
		setIsModalOpen(true);
	};

	const closeModal = () => {
		if (isSubmitting) {
			return;
		}

		setEditingCompanyId(null);
		form.setFieldsValue(defaultFormValues);
		setIsModalOpen(false);
	};

	const onSubmit = (values: CompanyFormValues) => {
		const payload = {
			name: values.name.trim(),
			industry: values.industry.trim(),
			businessIntent: values.businessIntent.trim(),
			technologyIntent: values.technologyIntent.trim(),
			standards: csvToArray(values.standards),
			partnerships: csvToArray(values.partnerships),
		};

		if (editingCompanyId) {
			updateMutation.mutate({ companyId: editingCompanyId, profile: payload });
			return;
		}

		createMutation.mutate(payload);
	};

	const columns: ColumnsType<(typeof companies)[number]> = [
		{
			title: "Company",
			dataIndex: "name",
			key: "name",
			sorter: (left, right) => left.name.localeCompare(right.name),
			defaultSortOrder: "ascend",
		},
		{
			title: "Industry",
			dataIndex: "industry",
			key: "industry",
			sorter: (left, right) => left.industry.localeCompare(right.industry),
		},
		{
			title: "Standards",
			dataIndex: "standards",
			key: "standards",
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
			title: "Partnerships",
			dataIndex: "partnerships",
			key: "partnerships",
			render: (values: string[]) => (
				<Space size={[4, 4]} wrap>
					{values.map((item) => (
						<Tag key={item} color="cyan">
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
			render: (_, company) => (
				<Button
					icon={<EditOutlined />}
					type="link"
					size="small"
					onClick={() => openEditModal(company)}
				>
					Edit
				</Button>
			),
		},
	];

	return (
		<section className={styles.panel}>
			<SectionHeader
				title="Company Profiles"
				description="Manage company records persisted in PostgreSQL."
				actionLabel="Add Company"
				onAction={openCreateModal}
			/>

			{createMutation.error && (
				<Alert
					showIcon
					type="error"
					title={`Failed to create company: ${createMutation.error.message}`}
				/>
			)}
			{updateMutation.error && (
				<Alert
					showIcon
					type="error"
					title={`Failed to update company: ${updateMutation.error.message}`}
				/>
			)}

			<Table
				rowKey="id"
				columns={columns}
				dataSource={companies}
				loading={companiesQuery.isLoading}
				size="middle"
				pagination={{ pageSize: 6, showSizeChanger: false }}
				scroll={{ x: 980 }}
			/>

			{!companiesQuery.isLoading && companies.length === 0 && (
				<Typography.Text type="secondary">No companies matched your search.</Typography.Text>
			)}

			<Modal
				title={editingCompanyId ? "Edit Company" : "Add Company"}
				open={isModalOpen}
				onCancel={closeModal}
				footer={null}
			>
				<Form
					layout="vertical"
					form={form}
					initialValues={defaultFormValues}
					onFinish={onSubmit}
				>
					<Tabs
						items={[
							{
								key: "overview",
								label: "Overview",
								children: (
									<>
										<Form.Item label="Company Name" name="name" rules={[{ required: true }]}>
											<Input placeholder="Team Sync Labs" />
										</Form.Item>
										<Form.Item label="Industry" name="industry" rules={[{ required: true }]}>
											<Input placeholder="Enterprise Software" />
										</Form.Item>
									</>
								),
							},
							{
								key: "strategy",
								label: "Strategy",
								children: (
									<>
										<Form.Item label="Business Intent" name="businessIntent" rules={[{ required: true }]}>
											<Input.TextArea rows={3} placeholder="Business goals and outcomes" />
										</Form.Item>
										<Form.Item label="Technology Intent" name="technologyIntent" rules={[{ required: true }]}>
											<Input.TextArea rows={3} placeholder="Technology strategy and constraints" />
										</Form.Item>
									</>
								),
							},
							{
								key: "compliance",
								label: "Compliance",
								children: (
									<>
										<Form.Item label="Standards (comma separated)" name="standards" rules={[{ required: true }]}>
											<Input placeholder="SOC 2, ISO 27001" />
										</Form.Item>
										<Form.Item label="Partnerships (comma separated)" name="partnerships" rules={[{ required: true }]}>
											<Input placeholder="Cloud Platform Partners" />
										</Form.Item>
									</>
								),
							},
						]}
					/>
					<Space style={{ width: "100%", justifyContent: "flex-end" }}>
						<Button onClick={closeModal}>Cancel</Button>
						<Button
							type="primary"
							htmlType="submit"
							loading={createMutation.isPending || updateMutation.isPending}
						>
							{editingCompanyId ? "Save Changes" : "Create Company"}
						</Button>
					</Space>
				</Form>
			</Modal>
		</section>
	);
}
