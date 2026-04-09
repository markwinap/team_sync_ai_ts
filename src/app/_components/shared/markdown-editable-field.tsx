"use client";

import { useEffect, useState } from "react";
import { Button, Input, Space, Spin, Typography } from "antd";
import { EditOutlined, SaveOutlined, CloseOutlined } from "@ant-design/icons";
import { MarkdownDisplay } from "~/app/_components/shared/markdown-display";

interface MarkdownEditableFieldProps {
	label?: string;
	content: string | null | undefined;
	onSave: (content: string) => Promise<string | null | undefined | void>;
	readonly?: boolean;
	disabled?: boolean;
}

export function MarkdownEditableField({
	label,
	content,
	onSave,
	readonly = false,
	disabled = false,
}: MarkdownEditableFieldProps) {
	const [renderedContent, setRenderedContent] = useState(content ?? "");
	const [isEditing, setIsEditing] = useState(!content || content.trim() === "");
	const [editValue, setEditValue] = useState(content ?? "");
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		setRenderedContent(content ?? "");
	}, [content]);

	const isEmpty = renderedContent.trim() === "";
	const hasChanges = editValue !== renderedContent;

	const handleEdit = () => {
		setEditValue(renderedContent);
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
			const nextContent = typeof savedContent === "string" ? savedContent : editValue;
			setRenderedContent(nextContent);
			setEditValue(nextContent);
			setIsEditing(false);
		} finally {
			setIsSaving(false);
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
			{!isEditing && !disabled && !readonly && !isEmpty ? (
				<Button type="text" size="small" icon={<EditOutlined />} onClick={handleEdit}>
					Edit
				</Button>
			) : null}
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
			<Spin spinning={isSaving}>
				<Space orientation="vertical" style={{ width: "100%" }}>
					{header}
					<Input.TextArea
						value={editValue}
						onChange={(e) => setEditValue(e.target.value)}
						autoSize={{ minRows: 2 }}
						placeholder="Enter markdown content"
						disabled={isSaving}
					/>
					{hasChanges ? (
						<Space>
							<Button
								type="primary"
								size="small"
								icon={<SaveOutlined />}
								onClick={handleSave}
								disabled={isSaving}
							>
								Save
							</Button>
							<Button size="small" icon={<CloseOutlined />} onClick={handleCancel} disabled={isSaving}>
								Cancel
							</Button>
						</Space>
					) : (
						<Button size="small" icon={<CloseOutlined />} onClick={handleCancel} disabled={isSaving}>
							Close
						</Button>
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
						type="text"
						size="small"
						onClick={handleEdit}
						style={{ marginLeft: 8 }}
					>
						Add
					</Button>
				</div>
			)}
		</div>
	);
}
