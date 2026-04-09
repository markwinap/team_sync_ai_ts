"use client";

import { useState } from "react";
import { Button, Input, Space, Spin } from "antd";
import { EditOutlined, SaveOutlined, CloseOutlined } from "@ant-design/icons";
import { MarkdownDisplay } from "~/app/_components/shared/markdown-display";

interface MarkdownEditableFieldProps {
	content: string | null | undefined;
	onSave: (content: string) => Promise<void>;
	readonly?: boolean;
	disabled?: boolean;
}

export function MarkdownEditableField({
	content,
	onSave,
	readonly = false,
	disabled = false,
}: MarkdownEditableFieldProps) {
	const [isEditing, setIsEditing] = useState(!content || content.trim() === "");
	const [editValue, setEditValue] = useState(content ?? "");
	const [isSaving, setIsSaving] = useState(false);

	const isEmpty = !content || content.trim() === "";

	const handleEdit = () => {
		setEditValue(content ?? "");
		setIsEditing(true);
	};

	const handleSave = async () => {
		setIsSaving(true);
		try {
			await onSave(editValue);
			setIsEditing(false);
		} finally {
			setIsSaving(false);
		}
	};

	const handleCancel = () => {
		setEditValue(content ?? "");
		setIsEditing(false);
	};

	if (readonly || disabled) {
		return <MarkdownDisplay content={content} />;
	}

	if (isEditing) {
		return (
			<Spin spinning={isSaving}>
				<Space direction="vertical" style={{ width: "100%" }}>
					<Input.TextArea
						value={editValue}
						onChange={(e) => setEditValue(e.target.value)}
						rows={4}
						placeholder="Enter markdown content"
						disabled={isSaving}
					/>
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
				</Space>
			</Spin>
		);
	}

	return (
		<div
			style={{
				position: "relative",
				padding: "8px 12px",
				borderRadius: "4px",
				border: "1px solid rgba(0, 0, 0, 0.08)",
				backgroundColor: "rgba(0, 0, 0, 0.01)",
			}}
		>
			<MarkdownDisplay content={content} />
			{!isEmpty && (
				<Button
					type="text"
					size="small"
					icon={<EditOutlined />}
					onClick={handleEdit}
					style={{
						position: "absolute",
						top: 8,
						right: 8,
						opacity: 1,
					}}
				>
					Edit
				</Button>
			)}
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
