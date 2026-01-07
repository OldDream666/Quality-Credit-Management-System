"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/AuthProvider";
import {
    HomeIcon,
    DocumentPlusIcon,
    ClipboardDocumentCheckIcon,
    UsersIcon,
    MegaphoneIcon,
    Cog6ToothIcon,
    BuildingOffice2Icon,
    ChartBarIcon,
    ClockIcon,
    Bars3Icon,
    XMarkIcon,
    UserCircleIcon,
    ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";

interface MenuItem {
    name: string;
    href: string;
    icon: React.ElementType;
    roles?: string[]; // 如果为空，则所有角色可见
    excludeRoles?: string[]; // 排除的角色
    permissions?: string[]; // 需要的权限
}

const menuItems: MenuItem[] = [
    {
        name: "仪表盘",
        href: "/dashboard",
        icon: HomeIcon,
    },
    {
        name: "学分申请",
        href: "/credits",
        icon: DocumentPlusIcon,
        permissions: ["credits.submit"],
        excludeRoles: ["admin"], // 管理员不显示
    },
    {
        name: "学分审批",
        href: "/admin/credits/overview",
        icon: ClipboardDocumentCheckIcon,
        permissions: ["credits.approve", "credits.reject"],
        excludeRoles: ["admin"], // 管理员不显示
    },
    {
        name: "审批记录",
        href: "/admin/credits/history",
        icon: ClockIcon,
        permissions: ["credits.approve", "credits.reject"],
        excludeRoles: ["admin"], // 管理员不显示
    },
    {
        name: "用户管理",
        href: "/admin/users",
        icon: UsersIcon,
        roles: ["admin"],
    },
    {
        name: "架构管理",
        href: "/admin/structure",
        icon: BuildingOffice2Icon,
        roles: ["admin"],
    },
    {
        name: "公告管理",
        href: "/admin/notices",
        icon: MegaphoneIcon,
        roles: ["admin"],
    },
    {
        name: "系统配置",
        href: "/admin/config",
        icon: Cog6ToothIcon,
        roles: ["admin"],
    },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [systemConfigs, setSystemConfigs] = useState<any>({ roles: [] });

    useEffect(() => {
        fetch("/api/config/system")
            .then((res) => (res.ok ? res.json() : null))
            .then((configData) => {
                if (configData) {
                    setSystemConfigs({
                        roles: configData.roles || [],
                    });
                }
            })
            .catch(() => { });
    }, []);

    // 获取用户权限
    const getUserPermissions = (): string[] => {
        if (!user || !systemConfigs.roles) return [];
        const roleConfig = systemConfigs.roles.find(
            (r: any) => r.key === user.role
        );
        return Array.isArray(roleConfig?.permissions) ? roleConfig.permissions : [];
    };

    // 检查菜单项是否可见
    const isMenuItemVisible = (item: MenuItem): boolean => {
        if (!user) return false;

        // 检查是否在排除角色列表中
        if (item.excludeRoles && item.excludeRoles.includes(user.role)) {
            return false;
        }

        // 管理员可以看到所有未被排除的菜单
        if (user.role === "admin") return true;

        // 检查角色限制
        if (item.roles && item.roles.length > 0) {
            if (!item.roles.includes(user.role)) return false;
        }

        // 检查权限限制
        if (item.permissions && item.permissions.length > 0) {
            const userPermissions = getUserPermissions();
            // 用户需要至少有一个权限
            const hasPermission = item.permissions.some((p) =>
                userPermissions.includes(p)
            );
            if (!hasPermission) return false;
        }

        return true;
    };

    // 检查当前路径是否匹配菜单项
    const isActive = (href: string): boolean => {
        if (href === "/dashboard") {
            return pathname === "/dashboard";
        }
        return pathname.startsWith(href);
    };

    // 获取角色标签
    const getRoleLabel = (role: string): string => {
        const roleConfig = systemConfigs.roles?.find((r: any) => r.key === role);
        return roleConfig?.label || role;
    };

    if (!user) return null;

    const visibleMenuItems = menuItems.filter(isMenuItemVisible);

    return (
        <>
            {/* 移动端菜单按钮 */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed top-4 left-4 z-50 lg:hidden bg-white p-2 rounded-lg shadow-lg hover:bg-gray-50 transition-colors"
                aria-label="Toggle menu"
            >
                {isOpen ? (
                    <XMarkIcon className="w-6 h-6 text-gray-700" />
                ) : (
                    <Bars3Icon className="w-6 h-6 text-gray-700" />
                )}
            </button>

            {/* 遮罩层 - 移动端 */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* 侧边栏 */}
            <aside
                className={`
                    fixed top-0 left-0 z-40 h-screen w-64 
                    bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900
                    transform transition-transform duration-300 ease-in-out
                    lg:relative lg:translate-x-0 lg:z-auto lg:flex-shrink-0
                    ${isOpen ? "translate-x-0" : "-translate-x-full"}
                    flex flex-col shadow-xl overflow-hidden
                `}
            >
                {/* Logo 区域 */}
                <div className="h-16 flex items-center justify-center border-b border-slate-700/50">
                    <Link
                        href="/dashboard"
                        className="text-xl font-bold text-white hover:text-blue-400 transition-colors"
                        onClick={() => setIsOpen(false)}
                    >
                        <span className="text-blue-400">素质</span>学分管理系统
                    </Link>
                </div>

                {/* 用户信息区域 */}
                <div className="px-4 py-4 border-b border-slate-700/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                            {user.name?.charAt(0) || user.username?.charAt(0) || "U"}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                                {user.name || user.username}
                            </p>
                            <p className="text-xs text-slate-400 truncate">
                                {getRoleLabel(user.role)}
                                {user.class && ` · ${user.class}`}
                            </p>
                        </div>
                    </div>
                </div>

                {/* 导航菜单 */}
                <nav className="flex-1 overflow-y-auto py-4 px-3">
                    <ul className="space-y-1">
                        {visibleMenuItems.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.href);
                            return (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        onClick={() => setIsOpen(false)}
                                        className={`
                      flex items-center gap-3 px-4 py-3 rounded-lg
                      transition-all duration-200 group
                      ${active
                                                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                                                : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                                            }
                    `}
                                    >
                                        <Icon
                                            className={`w-5 h-5 transition-transform group-hover:scale-110 ${active ? "text-white" : "text-slate-400 group-hover:text-blue-400"
                                                }`}
                                        />
                                        <span className="font-medium">{item.name}</span>
                                        {active && (
                                            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />
                                        )}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* 底部操作区 */}
                <div className="p-4 border-t border-slate-700/50 space-y-2">
                    <Link
                        href="/profile"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors"
                    >
                        <UserCircleIcon className="w-5 h-5 text-slate-400" />
                        <span className="font-medium">个人信息</span>
                    </Link>
                    <button
                        onClick={() => {
                            setIsOpen(false);
                            logout();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                    >
                        <ArrowRightOnRectangleIcon className="w-5 h-5" />
                        <span className="font-medium">退出登录</span>
                    </button>
                </div>
            </aside>
        </>
    );
}
