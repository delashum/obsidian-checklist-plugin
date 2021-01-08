export type TodoItem = {
  checked: boolean;
  text: string;
  file: string;
  line: number;
};

export type FileTodos = {
  todos: TodoItem[];
  name: string;
  path: string;
};
