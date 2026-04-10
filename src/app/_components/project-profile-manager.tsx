"use client";

import { useMemo, useState } from "react";
import {
	Alert,
	Button,
	Col,
	Divider,
	Form,
	Input,
	InputNumber,
	Modal,
	Row,
	Select,
	Space,
	Table,
	Tabs,
	Typography,
} from "antd";
import { EditOutlined, MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

import styles from "~/app/team-sync.module.css";
import { FormModal } from "~/app/_components/shared/form-modal";
import { MODAL_WIDTH_WIDE } from "~/app/_components/shared/modal-widths";
import { mostSpokenLanguageOptions } from "~/app/_components/shared/persona-portal.constants";
import { SectionHeader } from "~/app/_components/shared/section-header";
import type { TeamMemberLanguage } from "~/modules/team-sync/domain/entities";
import {
	normalizeText,
	normalizeStringArray,
	normalizeLanguages,
	normalizeRequiredTeamByRole,
	resolveRequiredTeamByRole as resolveTeamByRole,
	parseLegacyTeamRole,
	formatTeamMemberLabel,
} from "~/lib/normalize";
import { api } from "~/trpc/react";
import {
	MarkdownEditableField,
	type MarkdownReferenceField,
} from "./shared/markdown-editable-field";

const MIN_PROJECT_LANGUAGE_PERCENT = 1;

type ProjectFormValues = {
	requiredTeamByRole: {
		role: string;
		headcount: number;
		allocationPercent: number;
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
	requiredTechStack: string;
	developmentProcess: string;
	timelineMilestones: string;
	riskFactors: string;
	operationsPlan: string;
	qualityCompliance: string;
	dependencies: string;
	languages: TeamMemberLanguage[];
	environments: string;
	deploymentStrategy: string;
	monitoringAndLogging: string;
	maintenancePlan: string;
};

type RecommendedTeamMemberCandidate = {
	memberId: string;
	fullName: string;
	roles: string[];
	expertise: string[];
	matchedLanguages: string[];
	generatedSummary: string;
	matchScore: number;
	rationale: string;
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
	requiredTechStack: "",
	developmentProcess: "",
	timelineMilestones: "",
	riskFactors: "",
	operationsPlan: "",
	qualityCompliance: "",
	dependencies: "",
	languages: [],
	environments: "",
	deploymentStrategy: "",
	monitoringAndLogging: "",
	maintenancePlan: "",
};

type ProjectMarkdownField =
	| "summary"
	| "purpose"
	| "businessGoals"
	| "stakeholders"
	| "scopeIn"
	| "scopeOut"
	| "architectureOverview"
	| "dataModels"
	| "integrations"
	| "requiredTechStack"
	| "developmentProcess"
	| "timelineMilestones"
	| "riskFactors"
	| "operationsPlan"
	| "qualityCompliance"
	| "dependencies"
	| "environments"
	| "deploymentStrategy"
	| "monitoringAndLogging"
	| "maintenancePlan";

type ProjectReferenceFieldKey =
	| "companyName"
	| "companyProfile"
	| "projectName"
	| ProjectMarkdownField
	| "requiredTeamByRole";

const projectFieldReferenceDefaults: Record<ProjectMarkdownField, ProjectReferenceFieldKey[]> = {
	summary: ["projectName", "purpose", "businessGoals", "stakeholders"],
	purpose: ["projectName", "summary", "businessGoals", "stakeholders"],
	businessGoals: ["projectName", "summary", "purpose", "stakeholders"],
	stakeholders: ["projectName", "summary", "purpose", "businessGoals"],
	scopeIn: ["projectName", "summary", "purpose", "scopeOut"],
	scopeOut: ["projectName", "summary", "purpose", "scopeIn"],
	architectureOverview: ["projectName", "summary", "requiredTechStack", "integrations"],
	dataModels: ["projectName", "architectureOverview", "integrations", "scopeIn"],
	integrations: ["projectName", "architectureOverview", "dataModels", "requiredTechStack"],
	requiredTechStack: ["projectName", "architectureOverview", "integrations", "developmentProcess"],
	developmentProcess: ["projectName", "summary", "timelineMilestones", "requiredTeamByRole"],
	timelineMilestones: ["projectName", "summary", "developmentProcess", "dependencies"],
	riskFactors: ["projectName", "summary", "dependencies", "operationsPlan"],
	operationsPlan: ["projectName", "riskFactors", "qualityCompliance", "monitoringAndLogging"],
	qualityCompliance: ["projectName", "riskFactors", "operationsPlan", "requiredTechStack"],
	dependencies: ["projectName", "summary", "timelineMilestones", "integrations"],
	environments: ["projectName", "deploymentStrategy", "monitoringAndLogging", "maintenancePlan"],
	deploymentStrategy: ["projectName", "environments", "timelineMilestones", "requiredTechStack"],
	monitoringAndLogging: ["projectName", "deploymentStrategy", "operationsPlan", "riskFactors"],
	maintenancePlan: ["projectName", "deploymentStrategy", "monitoringAndLogging", "operationsPlan"],
};

const projectFieldGenerationInstructions: Record<ProjectMarkdownField, string> = {
	summary:
		"Output markdown only. Use this structure: '## Project Summary', a 2-4 sentence overview paragraph, then '### Key Outcomes' with 4-6 bullets. Each bullet must be specific to this project and include business value.",
	purpose:
		"Output markdown only. Use headings: '## Purpose', '### Problem Statement', '### Expected Impact'. Include one short paragraph per section and end with 3 measurable outcome bullets.",
	businessGoals:
		"Output markdown only. Use heading '## Business Goals' and 5-8 bullets. Format each bullet as: Goal, Metric/KPI, Target date (if known), and Value to business.",
	stakeholders:
		"Output markdown only. Use heading '## Stakeholders' and a bullet list. Format each bullet as: Stakeholder - primary concern - success criteria - decision authority.",
	scopeIn:
		"Output markdown only. Use heading '## In Scope' and grouped bullet lists by capability area. Each bullet must describe a testable deliverable, not a vague statement.",
	scopeOut:
		"Output markdown only. Use heading '## Out of Scope' and 5-10 bullets. Each bullet should clearly state an exclusion and, when relevant, whether it is deferred or permanently excluded.",
	architectureOverview:
		"Output markdown only. Use headings exactly: '## Architecture Overview', '### Architecture Style', '### Core Components', '### Data Flow', '### Integration Boundaries', '### Constraints'. Use concise bullets and concrete technologies when known.",
	dataModels:
		"Output markdown only. Use headings: '## Data Model', '### Core Entities', '### Relationships', '### Data Ownership', '### Lifecycle & Retention'. Prefer bullets and include key fields where useful.",
	integrations:
		"Output markdown only. Use heading '## Integrations' and one bullet per integration with this format: System, Purpose, Data Direction, Protocol/API, Failure Impact.",
	requiredTechStack:
		"Output markdown only. Use headings: '## Technology Stack', '### Frontend', '### Backend', '### Data', '### Infrastructure', '### Observability'. For each item include a short rationale.",
	developmentProcess:
		"Output markdown only. Use headings: '## Development Process', '### Delivery Phases', '### Ceremonies', '### Quality Gates', '### Release Cadence'. Keep it execution-focused and practical.",
	timelineMilestones:
		"Output markdown only. Use heading '## Timeline & Milestones' and a numbered list. Each item must include milestone name, objective, dependencies, and exit criteria.",
	riskFactors:
		"Output markdown only. Use heading '## Risks & Constraints' and bullets formatted as: Risk, Likelihood, Impact, Mitigation, Owner.",
	operationsPlan:
		"Output markdown only. Use headings: '## Operations Plan', '### Support Model', '### Incident Management', '### Ownership & Escalation', '### Readiness Checklist'. Keep responsibilities explicit.",
	qualityCompliance:
		"Output markdown only. Use headings: '## Quality & Compliance', '### Test Strategy', '### Acceptance Criteria', '### Security/Regulatory', '### Auditability'. Include concrete controls when possible.",
	dependencies:
		"Output markdown only. Use heading '## Dependencies' with bullets formatted as: Dependency, Owner, Needed By, Impact if Delayed, Mitigation.",
	environments:
		"Output markdown only. Use heading '## Environments' and a subsection for each environment (Dev, Test, Staging, Production). Include purpose, data policy, and promotion criteria.",
	deploymentStrategy:
		"Output markdown only. Use headings: '## Deployment Strategy', '### Release Approach', '### Validation', '### Rollback', '### Production Safeguards'. Prefer concrete steps over generic advice.",
	monitoringAndLogging:
		"Output markdown only. Use headings: '## Monitoring & Logging', '### Metrics', '### Logging', '### Alerts', '### Dashboards', '### Response Playbook'. Include examples of key signals.",
	maintenancePlan:
		"Output markdown only. Use headings: '## Maintenance Plan', '### Ownership', '### Patch & Upgrade Cadence', '### Dependency Management', '### Technical Debt', '### Continuous Improvement'. Include cadence and accountability.",
};

const teamRoleGenerationReferenceKeys: ProjectReferenceFieldKey[] = [
	"companyName",
	"companyProfile",
	"projectName",
	"summary",
	"purpose",
	"businessGoals",
	"stakeholders",
	"scopeIn",
	"scopeOut",
	"architectureOverview",
	"dataModels",
	"integrations",
	"requiredTechStack",
	"developmentProcess",
	"timelineMilestones",
	"riskFactors",
	"operationsPlan",
	"qualityCompliance",
	"dependencies",
	"environments",
	"deploymentStrategy",
	"monitoringAndLogging",
	"maintenancePlan",
];

const formatRequiredRole = (entry: { role: string; headcount: number }) => entry.role;

const resolveRequiredTeamByRole = (project: {
	requiredTeamByRole?: {
		role: string;
		headcount: number;
		allocationPercent?: number;
		assignedMemberId?: string;
	}[];
	teamRoles: string[];
}) => resolveTeamByRole(project.requiredTeamByRole, project.teamRoles);

export function ProjectProfileManager() {
	const utils = api.useUtils();
	const [form] = Form.useForm<ProjectFormValues>();
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isTeamMemberPickerModalOpen, setIsTeamMemberPickerModalOpen] = useState(false);
	const [activeTeamRoleFieldIndex, setActiveTeamRoleFieldIndex] = useState<number | null>(null);
	const [candidateRecommendations, setCandidateRecommendations] = useState<
		RecommendedTeamMemberCandidate[]
	>([]);
	const [selectedRecommendedMemberId, setSelectedRecommendedMemberId] = useState<string | null>(
		null,
	);
	const [teamMemberPickerMessage, setTeamMemberPickerMessage] = useState<string | null>(null);
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
		requiredTechStack: "architecture",
		developmentProcess: "architecture",
		timelineMilestones: "architecture",
		riskFactors: "risk",
		operationsPlan: "risk",
		qualityCompliance: "risk",
		dependencies: "risk",
		languages: "overview",
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
		label: formatTeamMemberLabel(member),
	}));
	const watchedFormValues = Form.useWatch([], form) as Partial<ProjectFormValues> | undefined;
	const teamMemberNameById = useMemo(
		() =>
			new Map(
				teamMembers.map((member) => [member.id, formatTeamMemberLabel(member)] as const),
			),
		[teamMembers],
	);
	const watchedRequiredTeamByRole = Form.useWatch("requiredTeamByRole", form) ?? [];
	const roleOptions = useMemo(() => {
		const roleSet = new Set<string>();

		for (const member of teamMembers) {
			for (const role of normalizeStringArray(member.roles)) {
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

	const updateFieldMutation = api.teamSync.updateProjectField.useMutation();
	const generateFieldMutation = api.teamSync.generateProjectFieldMarkdown.useMutation();
	const generateTeamRolesMutation = api.teamSync.generateProjectTeamRoles.useMutation();
	const recommendTeamMembersMutation = api.teamSync.recommendProjectRoleTeamMembers.useMutation({
		onError: (error) => {
			setTeamMemberPickerMessage(`Could not load recommendations: ${error.message}`);
		},
	});

	const projectReferenceFields = useMemo<MarkdownReferenceField[]>(() => {
		const companyId = watchedFormValues?.companyId ?? 0;
		const company = companies.find((item) => item.id === companyId);
		const companyName = company?.name;
		const companyProfileLines = [
			company?.name?.trim() ? `Name: ${company.name.trim()}` : "",
			company?.industry?.trim() ? `Industry: ${company.industry.trim()}` : "",
			company?.businessIntent?.trim() ? `Business Intent: ${company.businessIntent.trim()}` : "",
			company?.technologyIntent?.trim() ? `Technology Intent: ${company.technologyIntent.trim()}` : "",
			(company?.standards ?? []).length > 0 ? `Standards: ${company?.standards.join(", ")}` : "",
			(company?.partnerships ?? []).length > 0
				? `Partnerships: ${company?.partnerships.join(", ")}`
				: "",
		].filter((line) => line.length > 0);
		const companyProfileContext = companyProfileLines.join("\n");
		const requiredTeamLines = normalizeRequiredTeamByRole(
			watchedFormValues?.requiredTeamByRole,
		).map((entry) => {
			const assignedLabel = entry.assignedMemberId
				? teamMemberNameById.get(entry.assignedMemberId)
				: undefined;
			const allocationLabel = `${entry.allocationPercent}% allocation`;

			return assignedLabel
				? `- ${entry.role} (${allocationLabel}; ${assignedLabel})`
				: `- ${entry.role} (${allocationLabel})`;
		});

		return [
			{ key: "companyName", label: "Company", value: companyName ?? "" },
			{ key: "companyProfile", label: "Company Profile", value: companyProfileContext },
			{ key: "projectName", label: "Project Name", value: watchedFormValues?.projectName },
			{ key: "summary", label: "Description", value: watchedFormValues?.summary },
			{ key: "purpose", label: "Purpose", value: watchedFormValues?.purpose },
			{ key: "businessGoals", label: "Business Goals", value: watchedFormValues?.businessGoals },
			{ key: "stakeholders", label: "Stakeholders", value: watchedFormValues?.stakeholders },
			{ key: "scopeIn", label: "Scope In", value: watchedFormValues?.scopeIn },
			{ key: "scopeOut", label: "Scope Out", value: watchedFormValues?.scopeOut },
			{
				key: "architectureOverview",
				label: "Architecture Overview",
				value: watchedFormValues?.architectureOverview,
			},
			{ key: "dataModels", label: "Data Models", value: watchedFormValues?.dataModels },
			{ key: "integrations", label: "Integrations", value: watchedFormValues?.integrations },
			{
				key: "requiredTechStack",
				label: "Technology Stack",
				value: watchedFormValues?.requiredTechStack,
			},
			{
				key: "developmentProcess",
				label: "Development Process",
				value: watchedFormValues?.developmentProcess,
			},
			{
				key: "timelineMilestones",
				label: "Timeline & Milestones",
				value: watchedFormValues?.timelineMilestones,
			},
			{ key: "riskFactors", label: "Risks & Constraints", value: watchedFormValues?.riskFactors },
			{ key: "operationsPlan", label: "Operations Plan", value: watchedFormValues?.operationsPlan },
			{
				key: "qualityCompliance",
				label: "Quality & Compliance",
				value: watchedFormValues?.qualityCompliance,
			},
			{ key: "dependencies", label: "Dependencies", value: watchedFormValues?.dependencies },
			{
				key: "requiredTeamByRole",
				label: "Team Size & Roles",
				value: requiredTeamLines.join("\n"),
			},
			{ key: "environments", label: "Environments", value: watchedFormValues?.environments },
			{
				key: "deploymentStrategy",
				label: "Deployment Strategy",
				value: watchedFormValues?.deploymentStrategy,
			},
			{
				key: "monitoringAndLogging",
				label: "Monitoring & Logging",
				value: watchedFormValues?.monitoringAndLogging,
			},
			{ key: "maintenancePlan", label: "Maintenance Plan", value: watchedFormValues?.maintenancePlan },
		];
	}, [companies, teamMemberNameById, watchedFormValues]);

	const handleFieldUpdate = async (fieldName: ProjectMarkdownField, content: string) => {
		form.setFieldValue(fieldName, content);

		if (!editingProjectId) {
			return content;
		}

		await updateFieldMutation.mutateAsync({
			projectId: editingProjectId,
			fieldName,
			content,
		});

		utils.teamSync.projectProfiles.setData(undefined, (currentProjects) => {
			if (!currentProjects) {
				return currentProjects;
			}

			return currentProjects.map((project) =>
				project.id === editingProjectId ? { ...project, [fieldName]: content } : project,
			);
		});

		return content;
	};

	const getReferenceFieldsForTarget = (fieldName: ProjectMarkdownField) =>
		projectReferenceFields.filter((field) => field.key !== fieldName);

	const handleFieldGenerate = async (
		fieldName: ProjectMarkdownField,
		params: {
			currentContent: string;
			referenceFieldKeys: string[];
			prompt: string;
		},
	) => {
		const availableReferenceFields = getReferenceFieldsForTarget(fieldName);
		const selectedReferenceFields = availableReferenceFields
			.filter((field) => params.referenceFieldKeys.includes(field.key))
			.map((field) => ({
				key: field.key,
				label: field.label,
				value: normalizeText(field.value),
			}))
			.filter((field) => field.value.length > 0);

		const companyProfileReference = availableReferenceFields.find(
			(field) => field.key === "companyProfile",
		);

		if (companyProfileReference) {
			const companyProfileValue = normalizeText(companyProfileReference.value);
			if (
				companyProfileValue.length > 0 &&
				!selectedReferenceFields.some((field) => field.key === "companyProfile")
			) {
				selectedReferenceFields.unshift({
					key: "companyProfile",
					label: companyProfileReference.label,
					value: companyProfileValue,
				});
			}
		}

		if (selectedReferenceFields.length === 0) {
			return params.currentContent;
		}

		const generated = await generateFieldMutation.mutateAsync({
			targetField: fieldName,
			currentContent: params.currentContent,
			prompt: params.prompt,
			referenceFields: selectedReferenceFields,
		});

		return generated.generatedContent;
	};

	const handleTeamRolesGenerate = async () => {
		const currentRoles = normalizeRequiredTeamByRole(form.getFieldValue("requiredTeamByRole"));
		const referenceFields = projectReferenceFields
			.filter((field) => teamRoleGenerationReferenceKeys.includes(field.key as ProjectReferenceFieldKey))
			.sort(
				(left, right) =>
					teamRoleGenerationReferenceKeys.indexOf(left.key as ProjectReferenceFieldKey) -
					teamRoleGenerationReferenceKeys.indexOf(right.key as ProjectReferenceFieldKey),
			)
			.map((field) => ({
				key: field.key,
				label: field.label,
				value: normalizeText(field.value),
			}))
			.filter((field) => field.value.length > 0);

		const generated = await generateTeamRolesMutation.mutateAsync({
			currentRoles,
			prompt:
				"Generate required delivery roles and allocation percentages using all provided project context sections. Allocation must be 25 to 100. Use 100 for always-required roles, 50 for partially required roles, and 25 for optional/advisory roles.",
			referenceFields,
		});

		form.setFieldValue("requiredTeamByRole", generated.generatedRoles);
		if (modalValidationMessage) {
			setModalValidationMessage(null);
		}
	};

	const buildProjectProfileMatcherPayload = () => {
		const currentValues = {
			...defaultFormValues,
			...form.getFieldsValue(true),
		} as ProjectFormValues;

		return {
			projectName: normalizeText(currentValues.projectName),
			summary: currentValues.summary,
			purpose: currentValues.purpose,
			businessGoals: currentValues.businessGoals,
			stakeholders: currentValues.stakeholders,
			scopeIn: currentValues.scopeIn,
			scopeOut: currentValues.scopeOut,
			architectureOverview: currentValues.architectureOverview,
			dataModels: currentValues.dataModels,
			integrations: currentValues.integrations,
			requiredTechStack: currentValues.requiredTechStack,
			developmentProcess: currentValues.developmentProcess,
			timelineMilestones: currentValues.timelineMilestones,
			riskFactors: currentValues.riskFactors,
			operationsPlan: currentValues.operationsPlan,
			qualityCompliance: currentValues.qualityCompliance,
			dependencies: currentValues.dependencies,
			environments: currentValues.environments,
			deploymentStrategy: currentValues.deploymentStrategy,
			monitoringAndLogging: currentValues.monitoringAndLogging,
			maintenancePlan: currentValues.maintenancePlan,
			languages: normalizeLanguages(currentValues.languages, MIN_PROJECT_LANGUAGE_PERCENT),
		};
	};

	const closeTeamMemberPickerModal = () => {
		if (recommendTeamMembersMutation.isPending) {
			return;
		}

		setIsTeamMemberPickerModalOpen(false);
		setActiveTeamRoleFieldIndex(null);
		setCandidateRecommendations([]);
		setSelectedRecommendedMemberId(null);
		setTeamMemberPickerMessage(null);
	};

	const openTeamMemberPickerModal = async (fieldIndex: number) => {
		const role = normalizeText(form.getFieldValue(["requiredTeamByRole", fieldIndex, "role"]));
		if (!role) {
			setModalValidationMessage("Choose a role first before opening team member recommendations.");
			return;
		}

		setModalValidationMessage(null);
		setActiveTeamRoleFieldIndex(fieldIndex);
		setTeamMemberPickerMessage(null);
		setIsTeamMemberPickerModalOpen(true);

		const matcherPayload = buildProjectProfileMatcherPayload();
		const minimumLanguagePercent = matcherPayload.languages.length
			? Math.min(...matcherPayload.languages.map((entry) => entry.percent))
			: MIN_PROJECT_LANGUAGE_PERCENT;

		const response = await recommendTeamMembersMutation.mutateAsync({
			role,
			minimumLanguagePercent,
			projectProfile: matcherPayload,
		});

		setCandidateRecommendations(response.candidates);
		setSelectedRecommendedMemberId(response.recommendedMemberId ?? response.candidates[0]?.memberId ?? null);
		setTeamMemberPickerMessage(
			response.candidates.length > 0
				? `Showing ${response.candidates.length} best-fit team members (top 20 ranked by AI match score).`
				: "No candidates matched this role and language threshold. Try adjusting role or language settings.",
		);
	};

	const applyRecommendedTeamMember = () => {
		if (activeTeamRoleFieldIndex === null) {
			return;
		}

		form.setFieldValue(
			["requiredTeamByRole", activeTeamRoleFieldIndex, "assignedMemberId"],
			selectedRecommendedMemberId ?? undefined,
		);
		closeTeamMemberPickerModal();
	};

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
				...(project.languages ?? []).map((entry) => `${entry.language} ${entry.percent}`),
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
			languages: project.languages ?? [],
			businessGoals: project.businessGoals,
			stakeholders: project.stakeholders,
			scopeIn: project.scopeIn,
			scopeOut: project.scopeOut,
			architectureOverview: project.architectureOverview,
			dataModels: project.dataModels,
			integrations: project.integrations,
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
		const currentValues = {
			...defaultFormValues,
			...form.getFieldsValue(true),
			...values,
		} as ProjectFormValues;
		const requiredTeamByRole = normalizeRequiredTeamByRole(currentValues.requiredTeamByRole);

		const payload = {
			companyId: currentValues.companyId,
			projectName: normalizeText(currentValues.projectName),
			summary: currentValues.summary,
			purpose: currentValues.purpose,
			languages: normalizeLanguages(currentValues.languages, MIN_PROJECT_LANGUAGE_PERCENT),
			businessGoals: currentValues.businessGoals,
			stakeholders: currentValues.stakeholders,
			scopeIn: currentValues.scopeIn,
			scopeOut: currentValues.scopeOut,
			architectureOverview: currentValues.architectureOverview,
			dataModels: currentValues.dataModels,
			integrations: currentValues.integrations,
			requiredTechStack: currentValues.requiredTechStack,
			developmentProcess: currentValues.developmentProcess,
			timelineMilestones: currentValues.timelineMilestones,
			riskFactors: currentValues.riskFactors,
			operationsPlan: currentValues.operationsPlan,
			qualityCompliance: currentValues.qualityCompliance,
			dependencies: currentValues.dependencies,
			requiredTeamByRole,
			environments: currentValues.environments,
			deploymentStrategy: currentValues.deploymentStrategy,
			monitoringAndLogging: currentValues.monitoringAndLogging,
			maintenancePlan: currentValues.maintenancePlan,
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
			title: "Actions",
			key: "actions",
			align: "right",
			render: (_, project) => (
				<Space>
					<Button
						icon={<EditOutlined />}
						type="link"
						size="small"
						onClick={() => openEditModal(project)}
					>
						Edit
					</Button>
				</Space>
			),
		},
	];

	const candidateColumns: ColumnsType<RecommendedTeamMemberCandidate> = [
		{
			title: "Team Member",
			dataIndex: "fullName",
			key: "fullName",
			width: 280,
			render: (_, candidate) => (
				<Space direction="vertical" size={2}>
					<Typography.Text strong>{candidate.fullName}</Typography.Text>
					<Typography.Paragraph style={{ margin: 0 }}>
						{[...candidate.roles, ...candidate.expertise].slice(0, 4).join(", ") || "No role details"}
					</Typography.Paragraph>
				</Space>
			),
		},
		{
			title: "Match Score",
			dataIndex: "matchScore",
			key: "matchScore",
			align: "center",
			sorter: (left, right) => left.matchScore - right.matchScore,
			render: (value: number) => `${value}%`,
			width: 120,
		},
		{
			title: "Matched Languages",
			dataIndex: "matchedLanguages",
			key: "matchedLanguages",
			width: 220,
			render: (value: string[]) =>
				value.length > 0 ? (
					<Typography.Paragraph style={{ margin: 0 }}>
						{value.join(", ")}
					</Typography.Paragraph>
				) : (
					<Typography.Text type="secondary">None</Typography.Text>
				),
		},
		{
			title: "Rationale",
			dataIndex: "rationale",
			key: "rationale",
			width: 420,
			render: (value: string) => (
				<Typography.Paragraph ellipsis={{ rows: 3, tooltip: value }} style={{ margin: 0 }}>
					{value}
				</Typography.Paragraph>
			),
		},
	];

	const tabItems = [
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
					<Form.Item label="Languages">
						<Form.List name="languages">
							{(fields, { add, remove }) => (
								<>
									{fields.map(({ key, name, ...restField }) => (
										<Space key={key} align="baseline" style={{ display: "flex", marginBottom: 4 }}>
											<Form.Item
												{...restField}
												name={[name, "language"]}
												rules={[{ required: true, message: "Language is required" }]}
												style={{ marginBottom: 0 }}
											>
												<Select
													placeholder="Select language"
													options={mostSpokenLanguageOptions}
													style={{ width: 220 }}
													showSearch
													optionFilterProp="label"
												/>
											</Form.Item>
											<Form.Item
												{...restField}
												name={[name, "percent"]}
												rules={[
													{ required: true, message: "% is required" },
													{ type: "number", min: MIN_PROJECT_LANGUAGE_PERCENT, max: 100, message: `Use a value from ${MIN_PROJECT_LANGUAGE_PERCENT} to 100` },
												]}
												style={{ marginBottom: 0 }}
											>
												<InputNumber
													min={MIN_PROJECT_LANGUAGE_PERCENT}
													max={100}
													placeholder="%"
													style={{ width: 124 }}
												/>
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
	];

	if (editingProjectId) {
		tabItems.push(
			{
				key: "business",
				label: "Business & Scope",
				children: (
					<>
						<div style={{ marginBottom: 16 }}>
							<MarkdownEditableField
								label="Business Goals"
								content={form.getFieldValue("businessGoals")}
								onSave={(content) => handleFieldUpdate("businessGoals", content)}
								onGenerate={(params) => handleFieldGenerate("businessGoals", params)}
								referenceFields={getReferenceFieldsForTarget("businessGoals")}
								defaultReferenceFieldKeys={projectFieldReferenceDefaults.businessGoals}
								defaultGeneratePrompt={projectFieldGenerationInstructions.businessGoals}
							/>
						</div>
						<Divider style={{ margin: "12px 0" }} />
						<div style={{ marginBottom: 16 }}>
							<MarkdownEditableField
								label="Stakeholders"
								content={form.getFieldValue("stakeholders")}
								onSave={(content) => handleFieldUpdate("stakeholders", content)}
								onGenerate={(params) => handleFieldGenerate("stakeholders", params)}
								referenceFields={getReferenceFieldsForTarget("stakeholders")}
								defaultReferenceFieldKeys={projectFieldReferenceDefaults.stakeholders}
								defaultGeneratePrompt={projectFieldGenerationInstructions.stakeholders}
							/>
						</div>
						<Divider style={{ margin: "12px 0" }} />
						<Row gutter={16}>
							<Col xs={24}>
								<div style={{ marginBottom: 16 }}>
									<MarkdownEditableField
										label="Scope In"
										content={form.getFieldValue("scopeIn")}
										onSave={(content) => handleFieldUpdate("scopeIn", content)}
										onGenerate={(params) => handleFieldGenerate("scopeIn", params)}
										referenceFields={getReferenceFieldsForTarget("scopeIn")}
										defaultReferenceFieldKeys={projectFieldReferenceDefaults.scopeIn}
										defaultGeneratePrompt={projectFieldGenerationInstructions.scopeIn}
									/>
								</div>
								<Divider style={{ margin: "12px 0" }} />
							</Col>
							<Col xs={24}>
								<div>
									<MarkdownEditableField
										label="Scope Out"
										content={form.getFieldValue("scopeOut")}
										onSave={(content) => handleFieldUpdate("scopeOut", content)}
										onGenerate={(params) => handleFieldGenerate("scopeOut", params)}
										referenceFields={getReferenceFieldsForTarget("scopeOut")}
										defaultReferenceFieldKeys={projectFieldReferenceDefaults.scopeOut}
										defaultGeneratePrompt={projectFieldGenerationInstructions.scopeOut}
									/>
								</div>
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
						<div style={{ marginBottom: 16 }}>
							<MarkdownEditableField
								label="Architecture Overview"
								content={form.getFieldValue("architectureOverview")}
								onSave={(content) => handleFieldUpdate("architectureOverview", content)}
								onGenerate={(params) => handleFieldGenerate("architectureOverview", params)}
								referenceFields={getReferenceFieldsForTarget("architectureOverview")}
								defaultReferenceFieldKeys={projectFieldReferenceDefaults.architectureOverview}
								defaultGeneratePrompt={projectFieldGenerationInstructions.architectureOverview}
							/>
						</div>
						<Divider style={{ margin: "12px 0" }} />
						<div style={{ marginBottom: 16 }}>
							<MarkdownEditableField
								label="Data Models"
								content={form.getFieldValue("dataModels")}
								onSave={(content) => handleFieldUpdate("dataModels", content)}
								onGenerate={(params) => handleFieldGenerate("dataModels", params)}
								referenceFields={getReferenceFieldsForTarget("dataModels")}
								defaultReferenceFieldKeys={projectFieldReferenceDefaults.dataModels}
								defaultGeneratePrompt={projectFieldGenerationInstructions.dataModels}
							/>
						</div>
						<Divider style={{ margin: "12px 0" }} />
						<div style={{ marginBottom: 16 }}>
							<MarkdownEditableField
								label="Integrations"
								content={form.getFieldValue("integrations")}
								onSave={(content) => handleFieldUpdate("integrations", content)}
								onGenerate={(params) => handleFieldGenerate("integrations", params)}
								referenceFields={getReferenceFieldsForTarget("integrations")}
								defaultReferenceFieldKeys={projectFieldReferenceDefaults.integrations}
								defaultGeneratePrompt={projectFieldGenerationInstructions.integrations}
							/>
						</div>
						<Divider style={{ margin: "12px 0" }} />
						<div style={{ marginBottom: 16 }}>
							<MarkdownEditableField
								label="Technology Stack"
								content={form.getFieldValue("requiredTechStack")}
								onSave={(content) => handleFieldUpdate("requiredTechStack", content)}
								onGenerate={(params) => handleFieldGenerate("requiredTechStack", params)}
								referenceFields={getReferenceFieldsForTarget("requiredTechStack")}
								defaultReferenceFieldKeys={projectFieldReferenceDefaults.requiredTechStack}
								defaultGeneratePrompt={projectFieldGenerationInstructions.requiredTechStack}
							/>
						</div>
						<Divider style={{ margin: "12px 0" }} />
						<div style={{ marginBottom: 16 }}>
							<MarkdownEditableField
								label="Development Process"
								content={form.getFieldValue("developmentProcess")}
								onSave={(content) => handleFieldUpdate("developmentProcess", content)}
								onGenerate={(params) => handleFieldGenerate("developmentProcess", params)}
								referenceFields={getReferenceFieldsForTarget("developmentProcess")}
								defaultReferenceFieldKeys={projectFieldReferenceDefaults.developmentProcess}
								defaultGeneratePrompt={projectFieldGenerationInstructions.developmentProcess}
							/>
						</div>
						<Divider style={{ margin: "12px 0" }} />
						<div>
							<MarkdownEditableField
								label="Timeline & Milestones"
								content={form.getFieldValue("timelineMilestones")}
								onSave={(content) => handleFieldUpdate("timelineMilestones", content)}
								onGenerate={(params) => handleFieldGenerate("timelineMilestones", params)}
								referenceFields={getReferenceFieldsForTarget("timelineMilestones")}
								defaultReferenceFieldKeys={projectFieldReferenceDefaults.timelineMilestones}
								defaultGeneratePrompt={projectFieldGenerationInstructions.timelineMilestones}
							/>
						</div>
					</>
				),
			},
			{
				key: "risk",
				label: "Risk & Operations",
				children: (
					<>
						<div style={{ marginBottom: 16 }}>
							<MarkdownEditableField
								label="Risks & Constraints"
								content={form.getFieldValue("riskFactors")}
								onSave={(content) => handleFieldUpdate("riskFactors", content)}
								onGenerate={(params) => handleFieldGenerate("riskFactors", params)}
								referenceFields={getReferenceFieldsForTarget("riskFactors")}
								defaultReferenceFieldKeys={projectFieldReferenceDefaults.riskFactors}
								defaultGeneratePrompt={projectFieldGenerationInstructions.riskFactors}
							/>
						</div>
						<Divider style={{ margin: "12px 0" }} />
						<div style={{ marginBottom: 16 }}>
							<MarkdownEditableField
								label="Operations Plan"
								content={form.getFieldValue("operationsPlan")}
								onSave={(content) => handleFieldUpdate("operationsPlan", content)}
								onGenerate={(params) => handleFieldGenerate("operationsPlan", params)}
								referenceFields={getReferenceFieldsForTarget("operationsPlan")}
								defaultReferenceFieldKeys={projectFieldReferenceDefaults.operationsPlan}
								defaultGeneratePrompt={projectFieldGenerationInstructions.operationsPlan}
							/>
						</div>
						<Divider style={{ margin: "12px 0" }} />
						<div style={{ marginBottom: 16 }}>
							<MarkdownEditableField
								label="Quality & Compliance"
								content={form.getFieldValue("qualityCompliance")}
								onSave={(content) => handleFieldUpdate("qualityCompliance", content)}
								onGenerate={(params) => handleFieldGenerate("qualityCompliance", params)}
								referenceFields={getReferenceFieldsForTarget("qualityCompliance")}
								defaultReferenceFieldKeys={projectFieldReferenceDefaults.qualityCompliance}
								defaultGeneratePrompt={projectFieldGenerationInstructions.qualityCompliance}
							/>
						</div>
						<Divider style={{ margin: "12px 0" }} />
						<div>
							<MarkdownEditableField
								label="Dependencies"
								content={form.getFieldValue("dependencies")}
								onSave={(content) => handleFieldUpdate("dependencies", content)}
								onGenerate={(params) => handleFieldGenerate("dependencies", params)}
								referenceFields={getReferenceFieldsForTarget("dependencies")}
								defaultReferenceFieldKeys={projectFieldReferenceDefaults.dependencies}
								defaultGeneratePrompt={projectFieldGenerationInstructions.dependencies}
							/>
						</div>
					</>
				),
			},
			{
				key: "deployment",
				label: "Deployment & Support",
				children: (
					<>
						<div style={{ marginBottom: 16 }}>
							<MarkdownEditableField
								label="Environments"
								content={form.getFieldValue("environments")}
								onSave={(content) => handleFieldUpdate("environments", content)}
								onGenerate={(params) => handleFieldGenerate("environments", params)}
								referenceFields={getReferenceFieldsForTarget("environments")}
								defaultReferenceFieldKeys={projectFieldReferenceDefaults.environments}
								defaultGeneratePrompt={projectFieldGenerationInstructions.environments}
							/>
						</div>
						<Divider style={{ margin: "12px 0" }} />
						<div style={{ marginBottom: 16 }}>
							<MarkdownEditableField
								label="Deployment Strategy"
								content={form.getFieldValue("deploymentStrategy")}
								onSave={(content) => handleFieldUpdate("deploymentStrategy", content)}
								onGenerate={(params) => handleFieldGenerate("deploymentStrategy", params)}
								referenceFields={getReferenceFieldsForTarget("deploymentStrategy")}
								defaultReferenceFieldKeys={projectFieldReferenceDefaults.deploymentStrategy}
								defaultGeneratePrompt={projectFieldGenerationInstructions.deploymentStrategy}
							/>
						</div>
						<Divider style={{ margin: "12px 0" }} />
						<div style={{ marginBottom: 16 }}>
							<MarkdownEditableField
								label="Monitoring & Logging"
								content={form.getFieldValue("monitoringAndLogging")}
								onSave={(content) => handleFieldUpdate("monitoringAndLogging", content)}
								onGenerate={(params) => handleFieldGenerate("monitoringAndLogging", params)}
								referenceFields={getReferenceFieldsForTarget("monitoringAndLogging")}
								defaultReferenceFieldKeys={projectFieldReferenceDefaults.monitoringAndLogging}
								defaultGeneratePrompt={projectFieldGenerationInstructions.monitoringAndLogging}
							/>
						</div>
						<Divider style={{ margin: "12px 0" }} />
						<div style={{ marginBottom: 16 }}>
							<MarkdownEditableField
								label="Maintenance Plan"
								content={form.getFieldValue("maintenancePlan")}
								onSave={(content) => handleFieldUpdate("maintenancePlan", content)}
								onGenerate={(params) => handleFieldGenerate("maintenancePlan", params)}
								referenceFields={getReferenceFieldsForTarget("maintenancePlan")}
								defaultReferenceFieldKeys={projectFieldReferenceDefaults.maintenancePlan}
								defaultGeneratePrompt={projectFieldGenerationInstructions.maintenancePlan}
							/>
						</div>
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
									<Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
										<Button
											type="default"
											onClick={() => void handleTeamRolesGenerate()}
											loading={generateTeamRolesMutation.isPending}
										>
											Generate Roles with AI
										</Button>
										<Button
											type="dashed"
											icon={<PlusOutlined />}
											onClick={() => add({ role: "", headcount: 1, allocationPercent: 100 })}
										>
											Add Required Role
										</Button>
									</Row>
									{fields.map((field) => (
										<Row
											key={field.key}
											className={styles.teamRoleRow}
											gutter={[12, 0]}
											align="middle"
											style={{
												marginBottom: 10,
												padding: 12,
												border: "1px solid rgba(255, 255, 255, 0.1)",
												borderRadius: 10,
											}}
										>
											<Col xs={24} md={8}>
												<Form.Item
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
											<Col xs={24} md={3}>
												<Form.Item
													label="Allocation %"
													name={[field.name, "allocationPercent"]}
													rules={[
														{ required: true, message: "Allocation is required" },
														{ type: "number", min: 25, max: 100, message: "Use a value from 25 to 100" },
													]}
												>
													<InputNumber
														min={25}
														max={100}
														style={{ width: "100%" }}
														suffix="%"
														placeholder="100"
													/>
												</Form.Item>
											</Col>
											<Col xs={24} md={12}>
												<Form.Item name={[field.name, "assignedMemberId"]} style={{ display: "none" }}>
													<Input type="hidden" />
												</Form.Item>
												<Form.Item label="Team Member">
													<Space
														direction="vertical"
														size={6}
														style={{ width: "100%" }}
														className={styles.memberAssignmentCell}
													>
														{(() => {
															const assignedMemberLabel = teamMemberNameById.get(
																form.getFieldValue(["requiredTeamByRole", field.name, "assignedMemberId"]),
															);

															return assignedMemberLabel ? (
																<Typography.Text strong>{assignedMemberLabel}</Typography.Text>
															) : (
																<Typography.Text>No team member assigned</Typography.Text>
															);
														})()}
														<Space wrap className={styles.memberAssignmentActions}>
															<Button
																type="default"
																onClick={() => void openTeamMemberPickerModal(field.name)}
															>
																Find Best Match
															</Button>
															<Button
																type="default"
																danger
																onClick={() =>
																	form.setFieldValue(["requiredTeamByRole", field.name, "assignedMemberId"], undefined)
																}
															>
																Remove
															</Button>
														</Space>
													</Space>
												</Form.Item>
											</Col>
											<Col xs={24} md={1}>
												<Form.Item label=" " style={{ marginBottom: 0 }}>
													<Button
														type="text"
														danger
														className={styles.teamRoleRemoveButton}
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
							You can optionally pre-assign a team member for each role using AI-ranked recommendations.
						</Typography.Text>
					</>
				),
			},
		);
	}

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
				loading={
					projectsQuery.isLoading || companiesQuery.isLoading || teamMemberProfilesQuery.isLoading
				}
				style={{ width: "100%" }}
				size="middle"
				tableLayout="fixed"
				pagination={{ pageSize: 6, showSizeChanger: false }}
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
				okText={
					editingProjectId && activeTabKey === "team"
						? "Save Team Roles"
						: editingProjectId
							? "Save Changes"
							: "Create Project"
				}
				okButtonProps={
					editingProjectId && activeTabKey !== "overview" && activeTabKey !== "team"
						? { style: { display: "none" } }
						: undefined
				}
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
					items={tabItems}
				/>
			</FormModal>
			<Modal
				title="Choose Team Member Match"
				open={isTeamMemberPickerModalOpen}
				onCancel={closeTeamMemberPickerModal}
				onOk={applyRecommendedTeamMember}
				okText="Assign Selected Member"
				okButtonProps={{ disabled: !selectedRecommendedMemberId }}
				confirmLoading={recommendTeamMembersMutation.isPending}
				width={1100}
			>
				{teamMemberPickerMessage && (
					<Alert
						showIcon
						type={candidateRecommendations.length > 0 ? "info" : "warning"}
						title={teamMemberPickerMessage}
						style={{ marginBottom: 12 }}
					/>
				)}
				<Table
					rowKey="memberId"
					columns={candidateColumns}
					dataSource={candidateRecommendations}
					tableLayout="auto"
					scroll={{ x: 1040 }}
					pagination={{ pageSize: 8, showSizeChanger: false }}
					size="small"
					rowSelection={{
						type: "radio",
						columnWidth: 48,
						selectedRowKeys: selectedRecommendedMemberId ? [selectedRecommendedMemberId] : [],
						onChange: (selectedRowKeys) => {
							const selectedKey = selectedRowKeys[0];
							setSelectedRecommendedMemberId(typeof selectedKey === "string" ? selectedKey : null);
						},
					}}
					loading={recommendTeamMembersMutation.isPending}
				/>
			</Modal>
		</section>
	);
}
