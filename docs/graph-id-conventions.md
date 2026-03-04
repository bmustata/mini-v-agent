# Graph ID Conventions

## Node IDs

Format: `{nodeType}{6digits}`

| Node Type     | Prefix     | Example          |
| ------------- | ---------- | ---------------- |
| TEXT_GEN      | `textgen`  | `textgen847293`  |
| IMAGE_GEN     | `imagegen` | `imagegen562018` |
| IMAGE_SOURCE  | `imgsrc`   | `imgsrc182947`   |
| IMAGE_TO_TEXT | `vision`   | `vision526139`   |
| NOTE          | `note`     | `note394765`     |

## Edge IDs

Format: `e{6digits}`

Example: `e925431`

### Edge Rules

- Always starts with the lowercase letter `e`
- Followed by exactly **6 random digits** (000000–999999), zero-padded if necessary
- Must be **unique within the graph file** — no two edges may share the same ID
- No hyphens, dots, or other special characters are allowed

## General Rules

- Lowercase prefixes only
- 6 random digits (000000-999999)
- No hyphens or special characters
- Unique within each graph file

Reference: [`data/graphs/hello-graph.json`](../data/graphs/hello-graph.json)
