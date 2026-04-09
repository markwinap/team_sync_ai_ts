"use client";

import { Divider, Modal, Row, Col, Typography, Space } from "antd";
import { MarkdownEditableField } from "~/app/_components/shared/markdown-editable-field";
import { api } from "~/trpc/react";

interface ProjectDetailModalProps {
	open: boolean;
	onClose: () => void;
	project: {
		id: number;
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
		requiredTeamByRole: { role: string; headcount: number; assignedMemberId?: string }[];
	} | null;
	companyName: string;
}

export function ProjectDetailModal({ open, onClose, project, companyName }: ProjectDetailModalProps) {
	if (!project) return null;

	const utils = api.useUtils();
	const updateMutation = api.teamSync.updateProjectField.useMutation({
		onSuccess: async () => {
			await utils.teamSync.projectProfiles.invalidate();
		},
	});

	const handleFieldUpdate = async (fieldName: string, content: string) => {
		return updateMutation.mutateAsync({
			projectId: project.id,
			fieldName,
			content,
		});
	};

	return (
		<Modal
			title={`Project: ${project.projectName}`}
			open={open}
			onCancel={onClose}
			width={1000}
			footer={null}
			bodyStyle={{ maxHeight: "70vh", overflowY: "auto" }}
		>
			<Space direction="vertical" size="large" style={{ width: "100%" }}>
				<div>
					<Typography.Text strong>Company:</Typography.Text>
					<Typography.Text> {companyName}</Typography.Text>
				</div>

				<Divider>Overview</Divider>
				<div>
					<Typography.Text strong>Description</Typography.Text>
					<div style={{ marginTop: 8 }}>
						<MarkdownEditableField
							content={project.summary}
							onSave={(content) => handleFieldUpdate("summary", content)}
						/>
					</div>
				</div>

				<div>
					<Typography.Text strong>Purpose</Typography.Text>
					<div style={{ marginTop: 8 }}>
						<MarkdownEditableField
							content={project.purpose}
							onSave={(content) => handleFieldUpdate("purpose", content)}
						/>
					</div>
				</div>

				<Divider>Business & Scope</Divider>
				<div>
					<Typography.Text strong>Business Goals</Typography.Text>
					<div style={{ marginTop: 8 }}>
						<MarkdownEditableField
							content={project.businessGoals}
							onSave={(content) => handleFieldUpdate("businessGoals", content)}
						/>
					</div>
				</div>

				<div>
					<Typography.Text strong>Stakeholders</Typography.Text>
					<div style={{ marginTop: 8 }}>
						<MarkdownEditableField
							content={project.stakeholders}
							onSave={(content) => handleFieldUpdate("stakeholders", content)}
						/>
					</div>
				</div>

				<Row gutter={24}>
					<Col xs={24} md={12}>
						<Typography.Text strong>Scope In</Typography.Text>
						<div style={{ marginTop: 8 }}>
							<MarkdownEditableField
								content={project.scopeIn}
								onSave={(content) => handleFieldUpdate("scopeIn", content)}
							/>
						</div>
					</Col>
					<Col xs={24} md={12}>
						<Typography.Text strong>Scope Out</Typography.Text>
						<div style={{ marginTop: 8 }}>
							<MarkdownEditableField
								content={project.scopeOut}
								onSave={(content) => handleFieldUpdate("scopeOut", content)}
							/>
						</div>
					</Col>
				</Row>

				<Divider>Architecture & Delivery</Divider>
				<div>
					<Typography.Text strong>Architecture Overview</Typography.Text>
					<div style={{ marginTop: 8 }}>
						<MarkdownEditableField
							content={project.architectureOverview}
							onSave={(content) => handleFieldUpdate("architectureOverview", content)}
						/>
					</div>
				</div>

				<div>
					<Typography.Text strong>Data Models</Typography.Text>
					<div style={{ marginTop: 8 }}>
						<MarkdownEditableField
							content={project.dataModels}
							onSave={(content) => handleFieldUpdate("dataModels", content)}
						/>
					</div>
				</div>

				<div>
					<Typography.Text strong>Integrations</Typography.Text>
					<div style={{ marginTop: 8 }}>
						<MarkdownEditableField
							content={project.integrations}
							onSave={(content) => handleFieldUpdate("integrations", content)}
						/>
					</div>
				</div>

				<div>
					<Typography.Text strong>Required Capabilities</Typography.Text>
					<div style={{ marginTop: 8 }}>
						<MarkdownEditableField
							content={project.requiredCapabilities}
							onSave={(content) => handleFieldUpdate("requiredCapabilities", content)}
						/>
					</div>
				</div>

				<div>
					<Typography.Text strong>Technology Stack</Typography.Text>
					<div style={{ marginTop: 8 }}>
						<MarkdownEditableField
							content={project.requiredTechStack}
							onSave={(content) => handleFieldUpdate("requiredTechStack", content)}
						/>
					</div>
				</div>

				<div>
					<Typography.Text strong>Development Process</Typography.Text>
					<div style={{ marginTop: 8 }}>
						<MarkdownEditableField
							content={project.developmentProcess}
							onSave={(content) => handleFieldUpdate("developmentProcess", content)}
						/>
					</div>
				</div>

				<div>
					<Typography.Text strong>Timeline & Milestones</Typography.Text>
					<div style={{ marginTop: 8 }}>
						<MarkdownEditableField
							content={project.timelineMilestones}
							onSave={(content) => handleFieldUpdate("timelineMilestones", content)}
						/>
					</div>
				</div>

				<Divider>Risk & Operations</Divider>
				<div>
					<Typography.Text strong>Risks & Constraints</Typography.Text>
					<div style={{ marginTop: 8 }}>
						<MarkdownEditableField
							content={project.riskFactors}
							onSave={(content) => handleFieldUpdate("riskFactors", content)}
						/>
					</div>
				</div>

				<div>
					<Typography.Text strong>Operations Plan</Typography.Text>
					<div style={{ marginTop: 8 }}>
						<MarkdownEditableField
							content={project.operationsPlan}
							onSave={(content) => handleFieldUpdate("operationsPlan", content)}
						/>
					</div>
				</div>

				<div>
					<Typography.Text strong>Quality & Compliance</Typography.Text>
					<div style={{ marginTop: 8 }}>
						<MarkdownEditableField
							content={project.qualityCompliance}
							onSave={(content) => handleFieldUpdate("qualityCompliance", content)}
						/>
					</div>
				</div>

				<div>
					<Typography.Text strong>Dependencies</Typography.Text>
					<div style={{ marginTop: 8 }}>
						<MarkdownEditableField
							content={project.dependencies}
							onSave={(content) => handleFieldUpdate("dependencies", content)}
						/>
					</div>
				</div>

				<Divider>Deployment & Support</Divider>
				<div>
					<Typography.Text strong>Environments</Typography.Text>
					<div style={{ marginTop: 8 }}>
						<MarkdownEditableField
							content={project.environments}
							onSave={(content) => handleFieldUpdate("environments", content)}
						/>
					</div>
				</div>

				<div>
					<Typography.Text strong>Deployment Strategy</Typography.Text>
					<div style={{ marginTop: 8 }}>
						<MarkdownEditableField
							content={project.deploymentStrategy}
							onSave={(content) => handleFieldUpdate("deploymentStrategy", content)}
						/>
					</div>
				</div>

				<div>
					<Typography.Text strong>Monitoring & Logging</Typography.Text>
					<div style={{ marginTop: 8 }}>
						<MarkdownEditableField
							content={project.monitoringAndLogging}
							onSave={(content) => handleFieldUpdate("monitoringAndLogging", content)}
						/>
					</div>
				</div>

				<div>
					<Typography.Text strong>Maintenance Plan</Typography.Text>
					<div style={{ marginTop: 8 }}>
						<MarkdownEditableField
							content={project.maintenancePlan}
							onSave={(content) => handleFieldUpdate("maintenancePlan", content)}
						/>
					</div>
				</div>

				{project.requiredTeamByRole.length > 0 && (
					<>
						<Divider>Team Roles</Divider>
						{project.requiredTeamByRole.map((role, index) => (
							<div key={index}>
								<Typography.Text strong>{role.role}</Typography.Text>
								{role.assignedMemberId && (
									<Typography.Text> - Assigned</Typography.Text>
								)}
							</div>
						))}
					</>
				)}
			</Space>
		</Modal>
	);
}
