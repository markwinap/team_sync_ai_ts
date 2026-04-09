"use client";

import {
	CloseOutlined,
	EditOutlined,
	RobotOutlined,
	SaveOutlined,
} from "@ant-design/icons";
import { Button, Input, Select, Space, Spin, Typography } from "antd";
import { useEffect, useState } from "react";
import { MarkdownDisplay } from "~/app/_components/shared/markdown-display";
import { ReadAloudButton } from "~/app/_components/shared/speakable-text-area";

export type MarkdownReferenceField = {
	key: string;
	label: string;
	value: string | null | undefined;
};

interface MarkdownEditableFieldProps {
	label?: string;
	content: string | null | undefined;
	onSave: (content: string) => Promise<string | null | undefined | void>;
	onGenerate?: (params: {
		currentContent: string;
		referenceFieldKeys: string[];
		prompt: string;
	}) => Promise<string | null | undefined | void>;
	referenceFields?: MarkdownReferenceField[];
	defaultReferenceFieldKeys?: string[];
	readonly?: boolean;
	disabled?: boolean;
}

export function MarkdownEditableField({
	label,
	content,
	onSave,
	onGenerate,
	referenceFields = [],
	defaultReferenceFieldKeys = [],
	readonly = false,
	disabled = false,
}: MarkdownEditableFieldProps) {
	const [renderedContent, setRenderedContent] = useState(content ?? "");
	const [isEditing, setIsEditing] = useState(!content || content.trim() === "");
	const [editValue, setEditValue] = useState(content ?? "");
	const [isSaving, setIsSaving] = useState(false);
	const [isGenerating, setIsGenerating] = useState(false);
	const [generatePrompt, setGeneratePrompt] = useState("");
	const [selectedReferenceFieldKeys, setSelectedReferenceFieldKeys] = useState<
		string[]
	>(defaultReferenceFieldKeys);

	useEffect(() => {
		setRenderedContent(content ?? "");
	}, [content]);

	const isEmpty = renderedContent.trim() === "";
	const hasChanges = editValue !== renderedContent;
	const hasReferenceFields = referenceFields.length > 0;
	const canGenerate = Boolean(onGenerate) && hasReferenceFields;

	const handleEdit = () => {
		setEditValue(renderedContent);
		if (defaultReferenceFieldKeys.length > 0) {
			setSelectedReferenceFieldKeys(defaultReferenceFieldKeys);
		}
		setIsEditing(true);
	};

	const handleSave = async () => {
		if (!hasChanges) {
			setIsEditing(false);
			return;
		}

		setIsSaving(true);
		try {
			const savedContent = await onSave(editValue);
			const nextContent =
				typeof savedContent === "string" ? savedContent : editValue;
			setRenderedContent(nextContent);
			setEditValue(nextContent);
			setIsEditing(false);
		} finally {
			setIsSaving(false);
		}
	};

	const handleGenerate = async () => {
		if (!onGenerate) {
			return;
		}

		setIsGenerating(true);
		try {
			const generatedContent = await onGenerate({
				currentContent: editValue,
				referenceFieldKeys: selectedReferenceFieldKeys,
				prompt: generatePrompt,
			});

			if (typeof generatedContent === "string") {
				setEditValue(generatedContent);
			}
		} finally {
			setIsGenerating(false);
		}
	};

	const handleCancel = () => {
		setEditValue(renderedContent);
		setIsEditing(false);
	};

	const header = label ? (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				marginBottom: 8,
			}}
		>
			<Typography.Text strong>{label}</Typography.Text>
			<Space size={8}>
				{!isEmpty ? (
					<ReadAloudButton size="small" text={renderedContent} />
				) : null}
				{!isEditing && !disabled && !readonly && !isEmpty ? (
					<Button
						icon={<EditOutlined />}
						onClick={handleEdit}
						size="small"
						type="text"
					>
						Edit
					</Button>
				) : null}
			</Space>
		</div>
	) : null;

	if (readonly || disabled) {
		return (
			<div>
				{header}
				<MarkdownDisplay content={renderedContent} />
			</div>
		);
	}

	if (isEditing) {
		return (
			<Spin spinning={isSaving || isGenerating}>
				<Space orientation="vertical" style={{ width: "100%" }}>
					{header}
					<Input.TextArea
						autoSize={{ minRows: 4 }}
						disabled={isSaving || isGenerating}
						onChange={(e) => setEditValue(e.target.value)}
						placeholder="Enter markdown content"
						value={editValue}
					/>
					{canGenerate ? (
						<Space orientation="vertical" size={8} style={{ width: "100%" }}>
							<Typography.Text style={{ fontSize: 12 }} type="secondary">
								AI reference fields
							</Typography.Text>
							<Select
								allowClear
								disabled={isSaving || isGenerating}
								mode="multiple"
								onChange={(nextKeys) => setSelectedReferenceFieldKeys(nextKeys)}
								options={referenceFields.map((field) => ({
									value: field.key,
									label: field.label,
								}))}
								placeholder="Select reference fields"
								value={selectedReferenceFieldKeys}
							/>
							<Input
								disabled={isSaving || isGenerating}
								onChange={(event) => setGeneratePrompt(event.target.value)}
								placeholder="Optional generation instructions"
								value={generatePrompt}
							/>
						</Space>
					) : null}
					{hasChanges ? (
						<Space>
							{canGenerate ? (
								<Button
									disabled={
										isSaving ||
										isGenerating ||
										selectedReferenceFieldKeys.length === 0
									}
									icon={<RobotOutlined />}
									onClick={handleGenerate}
									size="small"
								>
									Generate with AI
								</Button>
							) : null}
							<Button
								disabled={isSaving || isGenerating}
								icon={<SaveOutlined />}
								onClick={handleSave}
								size="small"
								type="primary"
							>
								Save
							</Button>
							<Button
								disabled={isSaving || isGenerating}
								icon={<CloseOutlined />}
								onClick={handleCancel}
								size="small"
							>
								Cancel
							</Button>
						</Space>
					) : (
						<Space>
							{canGenerate ? (
								<Button
									disabled={
										isSaving ||
										isGenerating ||
										selectedReferenceFieldKeys.length === 0
									}
									icon={<RobotOutlined />}
									onClick={handleGenerate}
									size="small"
								>
									Generate with AI
								</Button>
							) : null}
							<Button
								disabled={isSaving || isGenerating}
								icon={<CloseOutlined />}
								onClick={handleCancel}
								size="small"
							>
								Close
							</Button>
						</Space>
					)}
				</Space>
			</Spin>
		);
	}

	return (
		<div
			style={{
				padding: "8px 12px",
				borderRadius: "4px",
				border: "1px solid rgba(0, 0, 0, 0.08)",
				backgroundColor: "rgba(0, 0, 0, 0.01)",
			}}
		>
			{header}
			<MarkdownDisplay content={renderedContent} />
			{isEmpty && (
				<div style={{ color: "#999", fontStyle: "italic", marginBottom: 12 }}>
					<em>Click to add content</em>
					<Button
						onClick={handleEdit}
						size="small"
						style={{ marginLeft: 8 }}
						type="text"
					>
						Add
					</Button>
				</div>
			)}
		</div>
	);
}
