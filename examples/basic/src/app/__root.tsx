import { Link, Outlet, createRootRoute } from "@tanstack/react-router";

export const Route = createRootRoute({
	component: RootLayout,
});

function RootLayout() {
	return (
		<div className="flex min-h-svh flex-col">
			<header className="border-b bg-card/80 backdrop-blur">
				<div className="mx-auto flex h-12 max-w-2xl items-center justify-between px-6">
					<Link to="/" className="text-sm font-medium tracking-tight">
						Electro Start
					</Link>
					<nav className="flex items-center gap-4 text-sm text-muted-foreground">
						<Link
							to="/"
							className="hover:text-foreground [&.active]:text-foreground"
						>
							Home
						</Link>
						<Link
							to="/todos"
							className="hover:text-foreground [&.active]:text-foreground"
						>
							Todos
						</Link>
					</nav>
				</div>
			</header>
			<main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
				<Outlet />
			</main>
		</div>
	);
}
