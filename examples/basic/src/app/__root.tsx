import { Outlet, createRootRoute } from "@tanstack/react-router";
import { AppSidebar } from "@/components/app-sidebar";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

export const Route = createRootRoute({
	component: RootLayout,
});

function RootLayout() {
	return (
		<TooltipProvider>
			<SidebarProvider>
				<AppSidebar />
				<SidebarInset>
					<header className="app-region-drag electrobun-webkit-app-region-drag flex h-12 shrink-0 items-center gap-2 border-b px-3">
						<SidebarTrigger className="app-region-no-drag electrobun-webkit-app-region-no-drag" />
						<Separator
							orientation="vertical"
							className="app-region-no-drag electrobun-webkit-app-region-no-drag mr-1 data-[orientation=vertical]:h-4"
						/>
						<div className="flex-1" aria-hidden />
					</header>
					<main className="mx-auto w-full max-w-2xl flex-1 px-8 py-10">
						<Outlet />
					</main>
				</SidebarInset>
			</SidebarProvider>
		</TooltipProvider>
	);
}
