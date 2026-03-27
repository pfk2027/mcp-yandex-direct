# MCP Yandex Direct

MCP-сервер для управления рекламой в Яндекс Директ через Claude Code (или любой MCP-клиент).

Позволяет AI-ассистенту работать с кампаниями, объявлениями, ключевыми словами, ставками и отчётами Яндекс Директ API v5 — на естественном языке.

## Возможности — 110 инструментов

| Сервис | Инструменты |
|--------|------------|
| **Campaigns** | get, add, update, delete, suspend, resume, archive, unarchive |
| **AdGroups** | get, add, update, delete |
| **Ads** | get, add, update, delete, suspend, resume, archive, unarchive, moderate |
| **Keywords** | get, add, update, delete, suspend, resume |
| **KeywordBids** | get, set, setAuto |
| **Bids** (legacy) | get, set, setAuto |
| **BidModifiers** | get, add, set, delete |
| **AudienceTargets** | get, add, delete, suspend, resume, setBids |
| **RetargetingLists** | get, add, update, delete |
| **NegativeKeywordSharedSets** | get, add, update, delete |
| **KeywordsResearch** | deduplicate, hasSearchVolume |
| **DynamicTextAdTargets** | get, add, delete, suspend, resume, setBids |
| **DynamicFeedAdTargets** | get, add, delete, suspend, resume, setBids |
| **SmartAdTargets** | get, add, update, delete, suspend, resume, setBids |
| **Feeds** | get, add, update, delete |
| **AdImages** | get, add, delete |
| **AdExtensions** | get, add, delete |
| **AdVideos** | get, add |
| **Creatives** | get, add |
| **Strategies** | get, add, update, archive, unarchive |
| **Sitelinks** | get, add, delete |
| **VCards** | get, add, delete |
| **Reports** | get (TSV, 8 типов отчётов) |
| **Dictionaries** | get |
| **Changes** | check, checkCampaigns, checkDictionaries |
| **Clients** | get, update |
| **AgencyClients** | get, add, update |
| **Businesses** | get |
| **TurboPages** | get |
| **Leads** | get |

## Установка

```bash
git clone https://github.com/pfk2027/mcp-yandex-direct.git
cd mcp-yandex-direct
npm install
npm run build
```

**Требования:** Node.js 18+ (протестировано на 18–22)

## Получение токена

1. Зайди на [oauth.yandex.ru](https://oauth.yandex.ru/) и создай приложение
2. Укажи право доступа: **Яндекс Директ API**
3. Получи OAuth-токен
4. Подробнее: [документация Яндекса](https://yandex.ru/dev/direct/doc/start/auth.html)

## Настройка Claude Code

Добавь в `.mcp.json` в корне проекта (или в `~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "yandex-direct": {
      "command": "node",
      "args": ["ПУТЬ_К/mcp-yandex-direct/build/index.js"],
      "env": {
        "YANDEX_DIRECT_TOKEN": "${YANDEX_DIRECT_TOKEN}"
      }
    }
  }
}
```

Путь к `build/index.js` зависит от способа установки:
- **Локальный клон:** полный путь к папке, напр. `/home/user/mcp-yandex-direct/build/index.js`
- **Глобальный npm:** `npx -y mcp-yandex-direct` (если опубликовано)

Токен передаётся через переменную окружения. **Никогда не вставляйте токен напрямую в .mcp.json** — используйте `${YANDEX_DIRECT_TOKEN}` и установите переменную в системе или в `~/.env.keys`.

**Переменные окружения:**

| Переменная | Обязательная | Описание |
|-----------|:---:|----------|
| `YANDEX_DIRECT_TOKEN` | да | OAuth-токен |
| `YANDEX_DIRECT_SANDBOX` | нет | `"true"` для тестовой песочницы (по умолчанию `false`) |
| `YANDEX_DIRECT_CLIENT_LOGIN` | нет | Логин клиента (только для агентских аккаунтов — если вы управляете чужими кампаниями) |
| `YANDEX_DIRECT_LANGUAGE` | нет | Язык ответов: `ru` / `en` / `uk` (по умолчанию `ru`) |

## Примеры использования

После подключения пиши в Claude Code на естественном языке:

- *«Покажи все активные кампании»* → `campaigns_get` с фильтром `states: ["ON"]`
- *«Какой CTR у кампании "Бренд" за последнюю неделю?»* → `reports_get` с `CAMPAIGN_PERFORMANCE_REPORT`
- *«Приостанови кампанию 12345678»* → `campaigns_suspend` с `ids: [12345678]`
- *«Отчёт по поисковым запросам за сегодня»* → `reports_get` с `SEARCH_QUERY_PERFORMANCE_REPORT`
- *«Добавь "термопанель" в минус-фразы всех групп»* → `adgroups_update` с NegativeKeywords
- *«Проверь частотность ключевых фраз»* → `keywords_research_has_search_volume`

## Архитектура

```
AI-ассистент  ←— MCP (stdio) —→  MCP-сервер  ←— HTTPS —→  Яндекс Директ API v5
```

- Транспорт: stdio (локальный процесс, без сети)
- Авторизация: OAuth 2.0 Bearer через переменную окружения
- Без хранения данных — сервер stateless

## Лицензия

MIT
