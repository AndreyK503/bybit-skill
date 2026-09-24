/** Choose output format (NFR-5): JSON for the agent, text for a human. */
export function formatOutput<T>(value: T, json: boolean, render: (v: T) => string): string {
  throw new Error(`not implemented: ${json} ${render.length} ${typeof value}`);
}
