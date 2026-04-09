"use client";

import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import { Typography } from "antd";
import styles from "~/app/team-sync.module.css";

interface MarkdownDisplayProps {
	content: string | null | undefined;
	inline?: boolean;
	className?: string;
}

export function MarkdownDisplay({ content, inline = false, className }: MarkdownDisplayProps) {
	if (!content || content.trim() === "") {
		return <Typography.Text type="secondary">No content</Typography.Text>;
	}

	const components = {
		// Custom link rendering
		a: ({ node, children, ...props }: any) => (
			<a {...props} target="_blank" rel="noopener noreferrer" style={{ color: "#1890ff" }}>
				{children}
			</a>
		),
		// Custom code rendering
		code: ({ node, children, ...props }: any) => (
			<code
				{...props}
				style={{
					backgroundColor: "#f5f5f5",
					padding: "2px 6px",
					borderRadius: "2px",
					fontFamily: "monospace",
					fontSize: "0.9em",
				}}
			>
				{children}
			</code>
		),
		// Custom heading rendering
		h1: ({ node, children, ...props }: any) => (
			<Typography.Title level={1} {...props}>
				{children}
			</Typography.Title>
		),
		h2: ({ node, children, ...props }: any) => (
			<Typography.Title level={2} {...props}>
				{children}
			</Typography.Title>
		),
		h3: ({ node, children, ...props }: any) => (
			<Typography.Title level={3} {...props}>
				{children}
			</Typography.Title>
		),
		h4: ({ node, children, ...props }: any) => (
			<Typography.Title level={4} {...props}>
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
				}}
			>
				{children}
			</ol>
		),
		blockquote: ({ node, children, ...props }: any) => (
			<blockquote
				{...props}
				style={{
					borderLeft: "4px solid #1890ff",
					paddingLeft: "12px",
					marginLeft: "0",
					marginBottom: "10px",
					color: "#666",
				}}
			>
				{children}
			</blockquote>
		),
		// Custom paragraph rendering
		p: ({ node, children, ...props }: any) => (
			<Typography.Paragraph {...props} style={{ marginBottom: inline ? 0 : 8 }}>
				{children}
			</Typography.Paragraph>
		),
	};

	return (
		<div className={className} style={{ wordWrap: "break-word", overflowWrap: "break-word" }}>
			<ReactMarkdown components={components}>{content}</ReactMarkdown>
		</div>
	);
}
