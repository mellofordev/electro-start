import { Link, createFileRoute } from "@tanstack/react-router";
import { buttonVariants } from "@/components/ui/button";
import {
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
	component: HomePage,
});

function HomePage() {
	return (
		<div className="space-y-8">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">Electro Start</h1>
				<p className="mt-1.5 text-sm text-muted-foreground">
					Edit <code className="text-foreground">src/app/index.tsx</code> to get
					started.
				</p>
			</div>

			<Card className="max-w-sm">
				<CardHeader>
					<CardTitle>Todos</CardTitle>
					<CardDescription>
						A sample page that calls Bun over RPC.
					</CardDescription>
				</CardHeader>
				<CardFooter>
					<Link to="/todos" className={cn(buttonVariants(), "w-full")}>
						Open todos
					</Link>
				</CardFooter>
			</Card>
		</div>
	);
}
