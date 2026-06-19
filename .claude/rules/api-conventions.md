---
paths: ["src/api/**/*"]
---
# API Conventions

- Всі endpoint handlers повинні мати try/catch
- Відповідь завжди у форматі: `{ data, error, status }`
- HTTP статус коди: 200, 201, 400, 401, 403, 404, 500
- Валідація вхідних даних обов'язкова
