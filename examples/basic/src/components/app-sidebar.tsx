import { Link, useRouterState } from "@tanstack/react-router";
import { CheckSquare, Home } from "lucide-react";
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
} from "@/components/ui/sidebar";

const navItems = [
	{ to: "/", label: "Home", icon: Home, exact: true },
	{ to: "/todos", label: "Todos", icon: CheckSquare, exact: false },
] as const;

export function AppSidebar() {
	const pathname = useRouterState({ select: (s) => s.location.pathname });

	return (
		<Sidebar collapsible="icon">
			{/* Space for macOS traffic lights + window drag */}
			<div className="app-region-drag electrobun-webkit-app-region-drag h-12 shrink-0" />

			<SidebarHeader className="app-region-no-drag electrobun-webkit-app-region-no-drag px-2 pb-0">
				<div className="flex flex-col gap-0.5 px-2 py-1.5 group-data-[collapsible=icon]:hidden">
					<span className="truncate text-sm font-medium tracking-tight">
						Electro Start
					</span>
				</div>
			</SidebarHeader>

			<SidebarContent className="app-region-no-drag electrobun-webkit-app-region-no-drag">
				<SidebarGroup>
					<SidebarGroupLabel>Navigation</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{navItems.map(({ to, label, icon: Icon, exact }) => {
								const isActive = exact
									? pathname === to
									: pathname === to || pathname.startsWith(`${to}/`);
								return (
									<SidebarMenuItem key={to}>
										<SidebarMenuButton
											render={<Link to={to} />}
											isActive={isActive}
											tooltip={label}
										>
											<Icon />
											<span>{label}</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
								);
							})}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>

			<SidebarRail />
		</Sidebar>
	);
}
