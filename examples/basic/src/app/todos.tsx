import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MainFnError } from "electro-start/client";
import { addTodo, listTodos, toggleTodo, type Todo } from "@/actions/todos";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export const Route = createFileRoute("/todos")({
	component: TodosPage,
});

function TodosPage() {
	const [todos, setTodos] = useState<Todo[]>([]);
	const [title, setTitle] = useState("");
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		setTodos(await listTodos());
	}, []);

	useEffect(() => {
		refresh().catch((err: unknown) => setError(String(err)));
	}, [refresh]);

	async function onSubmit(event: FormEvent) {
		event.preventDefault();
		setError(null);
		try {
			await addTodo({ data: title });
			setTitle("");
			await refresh();
		} catch (err) {
			if (err instanceof MainFnError) {
				setError(err.message);
			} else {
				setError(String(err));
			}
		}
	}

	async function onToggle(id: number) {
		await toggleTodo({ data: id });
		await refresh();
	}

	return (
		<div className="mx-auto max-w-md space-y-6">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">Todos</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					State lives in the Bun process.
				</p>
			</div>

			<Card className="shadow-sm">
				<CardHeader className="pb-4">
					<CardTitle className="text-base">New todo</CardTitle>
					<CardDescription>Calls `addTodo` via RPC.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<form onSubmit={onSubmit} className="flex gap-2">
						<input
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="Buy milk"
							className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
						/>
						<Button type="submit">Add</Button>
					</form>

					{error && (
						<p className="text-sm text-destructive">{error}</p>
					)}

					<ul className="divide-y rounded-md border">
						{todos.map((todo) => (
							<li key={todo.id}>
								<button
									type="button"
									onClick={() => onToggle(todo.id)}
									className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted/50"
								>
									<span
										className={
											todo.done
												? "text-muted-foreground line-through"
												: "text-foreground"
										}
									>
										{todo.title}
									</span>
								</button>
							</li>
						))}
						{todos.length === 0 && (
							<li className="px-3 py-6 text-center text-sm text-muted-foreground">
								No todos yet.
							</li>
						)}
					</ul>
				</CardContent>
			</Card>
		</div>
	);
}
