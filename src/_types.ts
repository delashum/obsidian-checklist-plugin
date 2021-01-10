export type TodoItem = {
  checked: boolean;
  text: string;
  file: string;
  subTag?: string;
  line: number;
};

export type FileTodos = {
  todos: TodoItem[];
  name: string;
  path: string;
};

export type GroupByOptions = "page" | "tag";
