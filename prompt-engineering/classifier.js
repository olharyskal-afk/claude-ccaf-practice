import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const RESPONSE_SCHEMA = {
  required: ["category", "priority", "confidence", "summary", "requires_human_review"],
  properties: {
    category: { enum: ["auth", "billing", "technical", "ui", "other"] },
    priority: { enum: ["low", "medium", "high", "critical"] },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    summary: { type: "string", maxLength: 100 },
    requires_human_review: { type: "boolean" }
  }
};

const SYSTEM_PROMPT = `Ти класифікатор тикетів підтримки. 
Повертай ТІЛЬКИ валідний JSON. Без тексту до або після. Без markdown.

JSON schema:
{
  "category": "auth|billing|technical|ui|other",
  "priority": "low|medium|high|critical",
  "confidence": 0.0-1.0,
  "summary": "max 100 chars",
  "requires_human_review": true|false
}

Правила пріоритету:
- critical: система не працює, втрата даних, безпека
- high: основна функція недоступна
- medium: функція працює з обмеженнями  
- low: косметичні проблеми, питання

Правила requires_human_review:
- true якщо confidence < 0.7 або priority = critical
- false в інших випадках

Приклади (few-shot):

Вхід: "Не можу увійти в систему, пише невірний пароль"
Вихід: {"category":"auth","priority":"high","confidence":0.95,"summary":"Проблема з входом в систему","requires_human_review":false}

Вхід: "Списали гроші двічі за одне замовлення"
Вихід: {"category":"billing","priority":"critical","confidence":0.98,"summary":"Подвійне списання коштів","requires_human_review":true}

Вхід: "Кнопка трохи не по центру на мобільному"
Вихід: {"category":"ui","priority":"low","confidence":0.90,"summary":"Вирівнювання кнопки на мобільному","requires_human_review":false}

Вхід: "База даних не відповідає, всі користувачі не можуть працювати"
Вихід: {"category":"technical","priority":"critical","confidence":0.99,"summary":"Недоступність бази даних","requires_human_review":true}

Вхід: "Як змінити мову інтерфейсу?"
Вихід: {"category":"ui","priority":"low","confidence":0.85,"summary":"Питання про зміну мови інтерфейсу","requires_human_review":false}`;

function validateResponse(data) {
  const errors = [];
  for (const field of RESPONSE_SCHEMA.required) {
    if (!(field in data)) errors.push(`Missing field: ${field}`);
  }
  const props = RESPONSE_SCHEMA.properties;
  if (data.category && !props.category.enum.includes(data.category))
    errors.push(`Invalid category: ${data.category}`);
  if (data.priority && !props.priority.enum.includes(data.priority))
    errors.push(`Invalid priority: ${data.priority}`);
  if (typeof data.confidence !== "number" || data.confidence < 0 || data.confidence > 1)
    errors.push(`Invalid confidence: ${data.confidence}`);
  if (typeof data.summary !== "string" || data.summary.length > 100)
    errors.push(`Invalid summary length`);
  if (typeof data.requires_human_review !== "boolean")
    errors.push(`Invalid requires_human_review type`);
  return errors;
}

async function classifyTicket(ticketText, retries = 2) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: ticketText }]
    });
    const rawText = response.content[0].text.trim()
  .replace(/^```json\n?/, "")
  .replace(/\n?```$/, "")
  .trim();
    console.log(`   🔍 Raw: ${rawText.substring(0, 150)}`);
    try {
      const parsed = JSON.parse(rawText);
      const errors = validateResponse(parsed);
      if (errors.length === 0) {
        return { success: true, data: parsed, attempt };
      } else {
        console.log(`   ⚠️ Спроба ${attempt}: ${errors.join(", ")}`);
      }
    } catch (e) {
      console.log(`   ⚠️ Спроба ${attempt}: невалідний JSON`);
    }
  }
  return { success: false, error: "Не вдалося отримати валідний JSON" };
}

const TEST_TICKETS = [
  "Не можу скинути пароль, лист не приходить вже 2 години",
  "Оплатив підписку але преміум функції не відкрились",
  "Застосунок вилітає при завантаженні файлів більше 10МБ",
  "Шрифт у заголовку здається трохи меншим ніж раніше",
  "ТЕРМІНАЛЬНО: всі дані клієнтів зникли після оновлення!"
];

async function main() {
  console.log("🎯 Класифікатор тикетів підтримки");
  console.log("=".repeat(50));
  console.log("temperature=0 → детермінований результат\n");
  for (const ticket of TEST_TICKETS) {
    console.log(`📩 Тикет: "${ticket}"`);
    const result = await classifyTicket(ticket);
    if (result.success) {
      const d = result.data;
      console.log(`   ✅ category: ${d.category} | priority: ${d.priority} | confidence: ${d.confidence}`);
      console.log(`   📋 summary: ${d.summary}`);
      console.log(`   👤 human_review: ${d.requires_human_review}`);
    } else {
      console.log(`   ❌ ${result.error}`);
    }
    console.log();
  }
  console.log("=".repeat(50));
  console.log("✅ Всі тикети класифіковано з валідацією JSON схеми!");
}

main().catch(console.error);