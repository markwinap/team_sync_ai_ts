"use client";

import { Button, Typography } from "antd";

interface SectionHeaderProps {
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
    actionDisabled?: boolean;
}

export function SectionHeader({
    title,
    description,
    actionLabel,
    onAction,
    actionDisabled,
}: SectionHeaderProps) {
    return (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", paddingBottom: 12 }}>
            <div>
                <Typography.Title level={3} style={{ marginBottom: 4 }}>
                    {title}
                </Typography.Title>
                <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                    {description}
                </Typography.Paragraph>
            </div>
            {actionLabel && onAction ? (
                <Button type="primary" onClick={onAction} disabled={actionDisabled}>
                    {actionLabel}
                </Button>
            ) : null}
        </div>
    );
}
