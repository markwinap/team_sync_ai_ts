"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Typography } from "antd";

interface MarkdownDisplayProps {
	content: string | null | undefined;
	inline?: boolean;
	className?: string;
}

export function MarkdownDisplay({ content, inline = false, className }: MarkdownDisplayProps) {
	if (!content || content.trim() === "") {
		return <Typography.Text type="secondary">No content</Typography.Text>;
	}

	const themedColors = {
		text: "var(--ant-color-text, var(--text, #f5f5f5))",
		muted:
			"var(--ant-color-text-secondary, var(--muted, rgba(255, 255, 255, 0.75)))",
		accent: "var(--ant-color-link, var(--accent, #69c0ff))",
		border: "var(--ant-color-border, var(--border, #d9d9d9))",
		panel: "var(--ant-color-bg-container, var(--panel, #1f1f1f))",
		panelSoft:
			"var(--ant-color-fill-tertiary, var(--panel-soft, rgba(255, 255, 255, 0.08)))",
	};

	const components = {
		// Custom link rendering
		a: ({ node, children, ...props }: any) => (
			<a
				{...props}
				target="_blank"
				rel="noopener noreferrer"
				style={{ color: themedColors.accent }}
			>
				{children}
			</a>
		),
		// Custom code rendering
		code: ({ node, children, ...props }: any) => (
			<code
				{...props}
				style={{
					backgroundColor: themedColors.panelSoft,
					color: themedColors.text,
					padding: "2px 6px",
					borderRadius: "2px",
					border: `1px solid ${themedColors.border}`,
					fontFamily: "monospace",
					fontSize: "0.9em",
				}}
			>
				{children}
			</code>
		),
		// Custom heading rendering
		h1: ({ node, children, ...props }: any) => (
			<Typography.Title level={1} {...props} style={{ color: themedColors.text }}>
				{children}
			</Typography.Title>
		),
		h2: ({ node, children, ...props }: any) => (
			<Typography.Title level={2} {...props} style={{ color: themedColors.text }}>
				{children}
			</Typography.Title>
		),
		h3: ({ node, children, ...props }: any) => (
			<Typography.Title level={3} {...props} style={{ color: themedColors.text }}>
				{children}
			</Typography.Title>
		),
		h4: ({ node, children, ...props }: any) => (
			<Typography.Title level={4} {...props} style={{ color: themedColors.text }}>
				{children}
			</Typography.Title>
		),
		// Custom list rendering
		ul: ({ node, children, ...props }: any) => (
			<ul
				{...props}
				style={{
					marginLeft: "20px",
					marginBottom: "10px",
					color: themedColors.text,
				}}
			>
				{children}
			</ul>
		),
		ol: ({ node, children, ...props }: any) => (
			<ol
				{...props}
				style={{
					marginLeft: "20px",
					marginBottom: "10px",
					color: themedColors.text,
				}}
			>
				{children}
			</ol>
		),
		blockquote: ({ node, children, ...props }: any) => (
			<blockquote
				{...props}
				style={{
					borderLeft: `4px solid ${themedColors.accent}`,
					paddingLeft: "12px",
					paddingTop: "6px",
					paddingBottom: "6px",
					background: themedColors.panelSoft,
					marginLeft: "0",
					marginBottom: "10px",
					color: themedColors.muted,
				}}
			>
				{children}
			</blockquote>
		),
		// Custom paragraph rendering
		p: ({ node, children, ...props }: any) => (
			<Typography.Paragraph
				{...props}
				style={{ marginBottom: inline ? 0 : 8, color: themedColors.text }}
			>
				{children}
			</Typography.Paragraph>
		),
		table: ({ node, children, ...props }: any) => (
			<div style={{ overflowX: "auto", marginBottom: inline ? 0 : 8 }}>
				<table
					{...props}
					style={{
						width: "100%",
						borderCollapse: "collapse",
						border: `1px solid ${themedColors.border}`,
						background: themedColors.panel,
					}}
				>
					{children}
				</table>
			</div>
		),
		th: ({ node, children, ...props }: any) => (
			<th
				{...props}
				style={{
					textAlign: "left",
					padding: "8px",
					border: `1px solid ${themedColors.border}`,
					backgroundColor: themedColors.panelSoft,
					color: themedColors.text,
				}}
			>
				{children}
			</th>
		),
		td: ({ node, children, ...props }: any) => (
			<td
				{...props}
				style={{
					padding: "8px",
					border: `1px solid ${themedColors.border}`,
					verticalAlign: "top",
					color: themedColors.text,
				}}
			>
				{children}
			</td>
		),
	};

	return (
		<div
			className={className}
			style={{
				wordWrap: "break-word",
				overflowWrap: "break-word",
				color: themedColors.text,
			}}
		>
			<ReactMarkdown components={components} remarkPlugins={[remarkGfm]}>
				{content}
			</ReactMarkdown>
		</div>
	);
}
