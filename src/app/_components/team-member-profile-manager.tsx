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
import type { ColumnsType } from "antd/es/table";

import styles from "~/app/team-sync.module.css";
import { SectionHeader } from "~/app/_components/shared/section-header";
import { api } from "~/trpc/react";

type ProfileFormValues = {
	fullName: string;
	role: string;
	expertise: string;
	techStack: string;
	certifications: string;
	responsibilities: string;
	communicationStyle: string;
	growthGoals: string;
	capacityPercent: number;
};

const toArray = (value: string) =>
	value
		.split(",")
		.map((item) => item.trim())
		.filter((item) => item.length > 0);

const defaultFormValues: ProfileFormValues = {
	fullName: "",
	role: "",
	expertise: "",
	techStack: "",
	certifications: "",
	responsibilities: "",
	communicationStyle: "",
	growthGoals: "",
	capacityPercent: 70,
};

export function TeamMemberProfileManager() {
	const utils = api.useUtils();
	const [form] = Form.useForm<ProfileFormValues>();
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
	const [searchValue, setSearchValue] = useState("");
	const profilesQuery = api.teamSync.teamMemberProfiles.useQuery();

	const createMutation = api.teamSync.createTeamMemberProfile.useMutation({
		onSuccess: async () => {
			form.setFieldsValue(defaultFormValues);
			setIsModalOpen(false);
			await utils.teamSync.teamMemberProfiles.invalidate();
			await utils.teamSync.snapshot.invalidate();
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
				profile.role,
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
		form.setFieldsValue(defaultFormValues);
		setIsModalOpen(false);
	};

	const openCreateModal = () => {
		setEditingMemberId(null);
		form.setFieldsValue(defaultFormValues);
		setIsModalOpen(true);
	};

	const openEditModal = (profile: (typeof profiles)[number]) => {
		setEditingMemberId(profile.id);
		form.setFieldsValue({
			fullName: profile.fullName,
			role: profile.role,
			expertise: profile.expertise.join(", "),
			techStack: profile.techStack.join(", "),
			certifications: profile.certifications.join(", "),
			responsibilities: profile.responsibilities.join(", "),
			communicationStyle: profile.communicationStyle,
			growthGoals: profile.growthGoals.join(", "),
			capacityPercent: profile.capacityPercent,
		});
		setIsModalOpen(true);
	};

	const onSubmit = (values: ProfileFormValues) => {
		const payload = {
			fullName: values.fullName.trim(),
			role: values.role.trim(),
			expertise: toArray(values.expertise),
			techStack: toArray(values.techStack),
			certifications: toArray(values.certifications),
			responsibilities: toArray(values.responsibilities),
			communicationStyle: values.communicationStyle.trim(),
			growthGoals: toArray(values.growthGoals),
			capacityPercent: values.capacityPercent,
		};

		if (editingMemberId) {
			updateMutation.mutate({ memberId: editingMemberId, profile: payload });
			return;
		}

		createMutation.mutate(payload);
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
			title: "Role",
			dataIndex: "role",
			key: "role",
			sorter: (left, right) => left.role.localeCompare(right.role),
		},
		{
			title: "Capacity",
			dataIndex: "capacityPercent",
			key: "capacityPercent",
			sorter: (left, right) => left.capacityPercent - right.capacityPercent,
			render: (value: number) => `${value}%`,
		},
		{
			title: "Communication",
			dataIndex: "communicationStyle",
			key: "communicationStyle",
			render: (value: string) => (
				<Typography.Text ellipsis={{ tooltip: value }} style={{ maxWidth: 260 }}>
					{value}
				</Typography.Text>
			),
		},
		{
			title: "Expertise",
			dataIndex: "expertise",
			key: "expertise",
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
					<Button size="small" onClick={() => openEditModal(profile)}>
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
				scroll={{ x: 980 }}
			/>

			{!profilesQuery.isLoading && profiles.length === 0 && (
				<Typography.Text type="secondary">No profiles matched your search.</Typography.Text>
			)}

			<Modal
				title={editingMemberId ? "Edit Team Member Profile" : "Add Team Member Profile"}
				open={isModalOpen}
				forceRender
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
								key: "identity",
								label: "Identity",
								children: (
									<>
										<Form.Item label="Full Name" name="fullName" rules={[{ required: true }]}>
											<Input placeholder="Jane Doe" />
										</Form.Item>
										<Form.Item label="Role" name="role" rules={[{ required: true }]}>
											<Input placeholder="Senior Engineer" />
										</Form.Item>
										<Form.Item label="Capacity (%)" name="capacityPercent" rules={[{ required: true }]}>
											<InputNumber min={0} max={100} style={{ width: "100%" }} />
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
						]}
					/>
					<Space style={{ width: "100%", justifyContent: "flex-end" }}>
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
