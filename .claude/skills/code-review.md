---
context: fork
allowed-tools: Read, Grep
argument-hint: "вкажи файл для ревью"
---
# Code Review Skill

Виконай code review вказаного файлу.

## Instructions
1. Перевір безпеку (SQL ін'єкції, XSS, відкриті секрети)
2. Перевір продуктивність (N+1 запити, зайві обчислення)
3. Перевір відповідність code style з CLAUDE.md
4. Поверни структурований звіт

## Output format
```json
{
  "issues": [],
  "severity": "high|medium|low",
  "recommendation": ""
}
```
