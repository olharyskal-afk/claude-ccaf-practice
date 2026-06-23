import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "ccaf-practice-server",
  version: "1.0.0"
});

// Tool 1: get_project_info
server.tool(
  "get_project_info",
  "Повертає інформацію про проект CCAF",
  {},
  async () => ({
    content: [{
      type: "text",
      text: JSON.stringify({
        name: "claude-ccaf-practice",
        owner: "Olha Ryskal",
        purpose: "CCA-F certification practice",
        tools: ["skills", "commands", "rules", "hooks", "mcp"]
      }, null, 2)
    }]
  })
);

// Tool 2: greet
server.tool(
  "greet",
  "Вітає користувача по імені",
  { name: z.string().describe("Ім'я користувача") },
  async ({ name }) => ({
    content: [{
      type: "text",
      text: `Привіт, ${name}! MCP сервер працює.`
    }]
  })
);

// Resource: project_rules
server.resource(
  "project_rules",
  "project://rules",
  async (uri) => ({
    contents: [{
      uri: uri.href,
      text: "1. Використовуй const/let\n2. async/await замість callbacks\n3. Тести обов'язкові\n4. Не редагуй /legacy"
    }]
  })
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("MCP сервер запущено!");
