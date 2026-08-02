import { useCallback, useEffect, useState, type FormEvent } from "react";
import { MainFnError } from "electro-start/client";
import {
	addTodo,
	getSystemInfo,
	listTodos,
	toggleTodo,
	type SystemInfo,
	type Todo,
} from "./todos";

function App() {
	const [todos, setTodos] = useState<Todo[]>([]);
	const [title, setTitle] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [info, setInfo] = useState<SystemInfo | null>(null);

	const refresh = useCallback(async () => {
		setTodos(await listTodos());
	}, []);

	useEffect(() => {
		refresh().catch((err) => setError(String(err)));
		getSystemInfo()
			.then(setInfo)
			.catch((err) => setError(String(err)));
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
				setError(`${err.message} (data: ${JSON.stringify(err.data)})`);
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
		<div className="min-h-screen bg-slate-950 text-slate-100">
			<div className="mx-auto max-w-3xl px-4 py-10">
				<h1 className="mb-2 text-center text-4xl font-bold tracking-tight">
					__APP_NAME__
				</h1>
				<p className="mb-10 text-center text-slate-400">
					Main fns: call the Bun process like a local async function
				</p>

				<section className="mb-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
					<h2 className="mb-1 text-xl font-semibold text-sky-400">
						Todos (state lives in the main process)
					</h2>
					<p className="mb-4 text-sm text-slate-500">
						Reload the webview — the list survives, because it lives in Bun.
					</p>

					<form onSubmit={onSubmit} className="mb-4 flex gap-3">
						<input
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="What needs doing?"
							className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
						/>
						<button
							type="submit"
							className="rounded-lg bg-sky-600 px-6 py-2 font-medium text-white hover:bg-sky-500"
						>
							Add
						</button>
					</form>

					{error && (
						<p className="mb-4 rounded-lg bg-red-950 px-4 py-2 text-sm text-red-300">
							{error}
						</p>
					)}

					<ul className="space-y-2">
						{todos.map((todo) => (
							<li key={todo.id}>
								<button
									onClick={() => onToggle(todo.id)}
									className="flex w-full items-center gap-3 rounded-lg bg-slate-950 px-4 py-2 text-left hover:bg-slate-800"
								>
									<span
										className={
											todo.done ? "text-slate-500 line-through" : "text-slate-100"
										}
									>
										{todo.title}
									</span>
									<span className="ml-auto text-xs text-slate-500">
										{todo.createdAt.toLocaleTimeString()}
									</span>
								</button>
							</li>
						))}
						{todos.length === 0 && (
							<li className="px-4 py-2 text-sm text-slate-500">
								Nothing yet — add one above.
							</li>
						)}
					</ul>
				</section>

				<section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
					<h2 className="mb-4 text-xl font-semibold text-sky-400">
						System info (from Bun, over RPC)
					</h2>
					{info ? (
						<dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
							<dt className="text-slate-500">Bun</dt>
							<dd className="font-mono">{info.bunVersion}</dd>
							<dt className="text-slate-500">Electrobun</dt>
							<dd className="font-mono">{info.electrobunVersion}</dd>
							<dt className="text-slate-500">Platform</dt>
							<dd className="font-mono">
								{info.platform} / {info.arch}
							</dd>
							<dt className="text-slate-500">Main process PID</dt>
							<dd className="font-mono">{info.pid}</dd>
							<dt className="text-slate-500">CWD</dt>
							<dd className="break-all font-mono">{info.cwd}</dd>
							<dt className="text-slate-500">Fetched at</dt>
							<dd className="font-mono">
								{info.now.toLocaleTimeString()} (a real Date, via superjson)
							</dd>
						</dl>
					) : (
						<p className="text-sm text-slate-500">Loading…</p>
					)}
				</section>
			</div>
		</div>
	);
}

export default App;
