import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// ============ ІНСТРУМЕНТИ СУБАГЕНТА 1: Code Analyzer ============
const codeAnalyzerTools = [
  {
    name: "read_file",
    description: "Читає вміст файлу для аналізу",
    input_schema: {
      type: "object",
      properties: {
        filename: { type: "string", description: "Ім'я файлу" }
      },
      required: ["filename"]
    }
  },
  {
    name: "count_lines",
    description: "Рахує кількість рядків у коді",
    input_schema: {
      type: "object",
      properties: {
        code: { type: "string", description: "Код для аналізу" }
      },
      required: ["code"]
    }
  },
  {
    name: "find_functions",
    description: "Знаходить всі функції у коді",
    input_schema: {
      type: "object",
      properties: {
        code: { type: "string", description: "Код для аналізу" }
      },
      required: ["code"]
    }
  },
  {
    name: "check_complexity",
    description: "Оцінює складність коду від 1 до 10",
    input_schema: {
      type: "object",
      properties: {
        functions_count: { type: "number", description: "Кількість функцій" },
        lines_count: { type: "number", description: "Кількість рядків" }
      },
      required: ["functions_count", "lines_count"]
    }
  },
  {
    name: "detect_language",
    description: "Визначає мову програмування",
    input_schema: {
      type: "object",
      properties: {
        filename: { type: "string", description: "Ім'я файлу з розширенням" }
      },
      required: ["filename"]
    }
  }
];

// ============ ІНСТРУМЕНТИ СУБАГЕНТА 2: Report Generator ============
const reportGeneratorTools = [
  {
    name: "format_report",
    description: "Форматує дані аналізу у звіт",
    input_schema: {
      type: "object",
      properties: {
        analysis_data: { type: "object", description: "Дані аналізу коду" }
      },
      required: ["analysis_data"]
    }
  },
  {
    name: "calculate_score",
    description: "Розраховує загальну оцінку якості коду",
    input_schema: {
      type: "object",
      properties: {
        complexity: { type: "number", description: "Складність 1-10" },
        lines: { type: "number", description: "Кількість рядків" },
        functions: { type: "number", description: "Кількість функцій" }
      },
      required: ["complexity", "lines", "functions"]
    }
  },
  {
    name: "add_recommendations",
    description: "Додає рекомендації щодо покращення коду",
    input_schema: {
      type: "object",
      properties: {
        complexity: { type: "number", description: "Складність коду" },
        score: { type: "number", description: "Оцінка якості" }
      },
      required: ["complexity", "score"]
    }
  },
  {
    name: "save_report",
    description: "Зберігає звіт у файл",
    input_schema: {
      type: "object",
      properties: {
        report: { type: "string", description: "Текст звіту" },
        filename: { type: "string", description: "Ім'я файлу для збереження" }
      },
      required: ["report", "filename"]
    }
  },
  {
    name: "get_timestamp",
    description: "Повертає поточну дату та час",
    input_schema: {
      type: "object",
      properties: {}
    }
  }
];

// ============ ВИКОНАННЯ ІНСТРУМЕНТІВ ============
function executeTool(toolName, toolInput) {
  switch (toolName) {
    // Code Analyzer tools
    case "read_file":
      return {
        filename: toolInput.filename,
        code: `import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";\nimport { z } from "zod";\n\nconst server = new McpServer({ name: "ccaf-server", version: "1.0.0" });\n\nserver.tool("greet", "Вітає користувача", { name: z.string() }, async ({ name }) => ({\n  content: [{ type: "text", text: \`Привіт, \${name}!\` }]\n}));\n\nserver.tool("calculate", "Математика", { a: z.number(), b: z.number() }, async ({ a, b }) => ({\n  content: [{ type: "text", text: String(a + b) }]\n}));`,
        size_kb: 2.4
      };

    case "count_lines":
      const lines = toolInput.code.split("\n").length;
      return { lines_count: lines };

    case "find_functions":
      const funcMatches = toolInput.code.match(/function\s+\w+|=>\s*{|async\s+\w+/g) || [];
      return { functions: funcMatches, count: funcMatches.length };

    case "check_complexity":
      const score = Math.min(10, Math.floor((toolInput.functions_count * 1.5 + toolInput.lines_count / 10)));
      return { complexity: score, level: score < 4 ? "low" : score < 7 ? "medium" : "high" };

    case "detect_language":
      const ext = toolInput.filename.split(".").pop();
      const langs = { js: "JavaScript", ts: "TypeScript", py: "Python", go: "Go" };
      return { language: langs[ext] || "Unknown", extension: ext };

    // Report Generator tools
    case "format_report":
      const d = toolInput.analysis_data;
      return {
        formatted: `=== ЗВІТ АНАЛІЗУ КОДУ ===\nФайл: ${d.filename}\nМова: ${d.language}\nРядків: ${d.lines}\nФункцій: ${d.functions}\nСкладність: ${d.complexity}/10`
      };

    case "calculate_score":
      const qualityScore = Math.max(0, 100 - toolInput.complexity * 5 - toolInput.lines / 10);
      return { score: Math.round(qualityScore), grade: qualityScore > 80 ? "A" : qualityScore > 60 ? "B" : "C" };

    case "add_recommendations":
      const recs = [];
      if (toolInput.complexity > 7) recs.push("Розбити на менші функції");
      if (toolInput.score < 60) recs.push("Додати тести");
      if (recs.length === 0) recs.push("Код якісний, продовжуй в тому ж дусі!");
      return { recommendations: recs };

    case "save_report":
      return { saved: true, path: `./${toolInput.filename}`, size_bytes: toolInput.report.length };

    case "get_timestamp":
      return { timestamp: new Date().toISOString(), date: new Date().toLocaleDateString("uk-UA") };

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// ============ ЗАПУСК СУБАГЕНТА ============
async function runSubagent(name, systemPrompt, userMessage, tools) {
  console.log(`\n🤖 Запуск субагента: ${name}`);
  const messages = [{ role: "user", content: userMessage }];

  while (true) {
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      system: systemPrompt,
      tools,
      messages
    });

    console.log(`   stop_reason: ${response.stop_reason}`);

    if (response.stop_reason === "end_turn") {
      const text = response.content.find(b => b.type === "text")?.text || "";
      console.log(`   ✅ Результат: ${text.substring(0, 100)}...`);
      return text;
    }

    if (response.stop_reason === "tool_use") {
      messages.push({ role: "assistant", content: response.content });
      const toolResults = [];

      for (const block of response.content) {
        if (block.type === "tool_use") {
          console.log(`   🔧 Tool: ${block.name}(${JSON.stringify(block.input).substring(0, 50)})`);
          const result = executeTool(block.name, block.input);
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(result)
          });
        }
      }

      messages.push({ role: "user", content: toolResults });
    }
  }
}

// ============ ОРКЕСТРАТОР ============
async function orchestrator() {
  console.log("🚀 Запуск мульти-агентної системи аналізу коду\n");
  console.log("=".repeat(50));

  // Субагент 1: Аналіз коду
  const analysisResult = await runSubagent(
    "Code Analyzer",
    "Ти аналізуєш код. Використай всі доступні інструменти: спочатку read_file, потім count_lines, find_functions, check_complexity та detect_language. Поверни JSON з результатами.",
    "Проаналізуй файл index.js",
    codeAnalyzerTools
  );

  // Передача контексту субагенту 2
  console.log("\n📤 Передача контексту від субагента 1 до субагента 2...");

  // Субагент 2: Генерація звіту
  const reportResult = await runSubagent(
    "Report Generator",
    "Ти генеруєш звіти якості коду. Використай всі інструменти: get_timestamp, format_report, calculate_score, add_recommendations та save_report. Поверни фінальний звіт.",
    `Згенеруй звіт на основі аналізу: ${analysisResult}. Дані для аналізу: filename=index.js, language=JavaScript, lines=12, functions=2, complexity=3`,
    reportGeneratorTools
  );

  console.log("\n" + "=".repeat(50));
  console.log("✅ Мульти-агентний сценарій завершено!");
  console.log("\n📋 Фінальний звіт:");
  console.log(reportResult);
}

orchestrator().catch(console.error);
