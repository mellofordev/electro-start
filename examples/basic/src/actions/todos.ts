import { createMainFn, MainFnError } from "electro-start";

export interface Todo {
	id: number;
	title: string;
	done: boolean;
	createdAt: Date;
}

const todos = new Map<number, Todo>();
let nextId = 1;

export const listTodos = createMainFn().handler(async () => {
	return [...todos.values()].toSorted((a, b) => a.id - b.id);
});

export const addTodo = createMainFn()
	.validator((title: string) => {
		const trimmed = title.trim();
		if (!trimmed) {
			throw new MainFnError("Todo title cannot be empty", {
				data: { field: "title" },
			});
		}
		return trimmed;
	})
	.handler(async ({ data: title }) => {
		const todo: Todo = {
			id: nextId++,
			title,
			done: false,
			createdAt: new Date(),
		};
		todos.set(todo.id, todo);
		return todo;
	});

export const toggleTodo = createMainFn()
	.validator((id: number) => id)
	.handler(async ({ data: id }) => {
		const todo = todos.get(id);
		if (!todo) throw new MainFnError(`No todo with id ${id}`);
		todo.done = !todo.done;
		return todo;
	});
