"use client";

import { LoginOutlined, LogoutOutlined } from "@ant-design/icons";
import { Button, Tooltip } from "antd";

type AuthIconButtonProps = {
  isAuthenticated: boolean;
};

export function AuthIconButton({ isAuthenticated }: AuthIconButtonProps) {
  const href = isAuthenticated ? "/api/auth/signout" : "/api/auth/signin";

  return (
    <Tooltip title={isAuthenticated ? "Sign out" : "Sign in with GitHub"}>
      <Button
        aria-label={isAuthenticated ? "Sign out" : "Sign in"}
        href={href}
        icon={isAuthenticated ? <LogoutOutlined /> : <LoginOutlined />}
        shape="circle"
      />
    </Tooltip>
  );
}