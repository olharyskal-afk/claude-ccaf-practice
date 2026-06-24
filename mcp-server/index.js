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
  {
    name: z.string().min(1).max(100).describe("Ім'я користувача"),
    language: z.enum(["uk", "en", "ru"]).default("uk").describe("Мова привітання")
  },
  async ({ name, language }) => {
    const greetings = {
      uk: `Привіт, ${name}! MCP сервер працює.`,
      en: `Hello, ${name}! MCP server is running.`,
      ru: `Привет, ${name}! MCP сервер работает.`
    };
    return {
      content: [{ type: "text", text: greetings[language] }]
    };
  }
);

// Tool 3: calculate
server.tool(
  "calculate",
  "Виконує математичні операції над двома числами",
  {
    a: z.number().describe("Перше число"),
    b: z.number().describe("Друге число"),
    operation: z.enum(["add", "subtract", "multiply", "divide"]).describe("Операція: add, subtract, multiply, divide")
  },
  async ({ a, b, operation }) => {
    let result;
    switch (operation) {
      case "add":      result = a + b; break;
      case "subtract": result = a - b; break;
      case "multiply": result = a * b; break;
      case "divide":
        if (b === 0) return {
          content: [{ type: "text", text: JSON.stringify({ error: "Division by zero", code: "DIVISION_BY_ZERO" }) }],
          isError: true
        };
        result = a / b;
        break;
    }
    return {
      content: [{
        type: "text",
        text: JSON.stringify({ a, b, operation, result }, null, 2)
      }]
    };
  }
);

// Tool 4: validate_email
server.tool(
  "validate_email",
  "Перевіряє чи є email адреса валідною",
  {
    email: z.string().email().describe("Email адреса для перевірки")
  },
  async ({ email }) => {
    const domain = email.split("@")[1];
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          email,
          valid: true,
          domain,
          checked_at: new Date().toISOString()
        }, null, 2)
      }]
    };
  }
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
console.error("MCP сервер запущено! Tools: get_project_info, greet, calculate, validate_email");
