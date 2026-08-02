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
			// Structured errors survive the bridge, including `data`.
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
		<div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 text-gray-900">
			<div className="container mx-auto px-4 py-10 max-w-3xl">
				<h1 className="text-5xl font-bold text-center text-white mb-2 drop-shadow-lg">
					electro-start
				</h1>
				<p className="text-xl text-center text-white/90 mb-10">
					Main fns: call the Bun process like a local async function
				</p>

				<div className="bg-white rounded-xl shadow-xl p-8 mb-8">
					<h2 className="text-2xl font-semibold text-indigo-600 mb-1">
						Todos (state lives in the main process)
					</h2>
					<p className="mb-4 text-gray-500 text-sm">
						Reload the webview — the list survives, because it lives in Bun.
					</p>

					<form onSubmit={onSubmit} className="flex gap-3 mb-4">
						<input
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="What needs doing?"
							className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
						/>
						<button
							type="submit"
							className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
						>
							Add
						</button>
					</form>

					{error && (
						<p className="mb-4 px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm">
							{error}
						</p>
					)}

					<ul className="space-y-2">
						{todos.map((todo) => (
							<li key={todo.id}>
								<button
									onClick={() => onToggle(todo.id)}
									className="w-full flex items-center gap-3 px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-left transition-colors"
								>
									<span
										className={
											todo.done
												? "line-through text-gray-400"
												: "text-gray-800"
										}
									>
										{todo.title}
									</span>
									<span className="ml-auto text-xs text-gray-400">
										{todo.createdAt.toLocaleTimeString()}
									</span>
								</button>
							</li>
						))}
						{todos.length === 0 && (
							<li className="text-gray-400 text-sm px-4 py-2">
								Nothing yet — add one above.
							</li>
						)}
					</ul>
				</div>

				<div className="bg-white rounded-xl shadow-xl p-8">
					<h2 className="text-2xl font-semibold text-indigo-600 mb-4">
						System info (from Bun, over RPC)
					</h2>
					{info ? (
						<dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
							<dt className="text-gray-500">Bun</dt>
							<dd className="font-mono">{info.bunVersion}</dd>
							<dt className="text-gray-500">Electrobun</dt>
							<dd className="font-mono">{info.electrobunVersion}</dd>
							<dt className="text-gray-500">Platform</dt>
							<dd className="font-mono">
								{info.platform} / {info.arch}
							</dd>
							<dt className="text-gray-500">Main process PID</dt>
							<dd className="font-mono">{info.pid}</dd>
							<dt className="text-gray-500">CWD</dt>
							<dd className="font-mono break-all">{info.cwd}</dd>
							<dt className="text-gray-500">Fetched at</dt>
							<dd className="font-mono">
								{info.now.toLocaleTimeString()} (a real Date, via superjson)
							</dd>
						</dl>
					) : (
						<p className="text-gray-400 text-sm">Loading…</p>
					)}
				</div>
			</div>
		</div>
	);
}

export default App;
