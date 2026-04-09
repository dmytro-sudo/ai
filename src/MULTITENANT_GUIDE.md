# Multi-Tenant System Guide

## Overview
TopNotch AI теперь работает как полнофункциональная SaaS платформа для управления 100+ клиентов под одной системой.

## Architecture

### Core Entities
- **Workspace** - аккаунт клиента (основная сущность)
- **WorkspaceUser** - назначение пользователей/менеджеров на workspace
- **WorkspaceIntegration** - per-workspace интеграции (Meta Ads, GHL и т.д.)
- **Campaign**, **Report**, **AIAnalysisReport** - все имеют `workspace_id` для изоляции данных

### User Roles
```
- super_admin (система) - доступ ко всему
- admin - управление workspace и team
- super_manager - просмотр всех данных workspace
- manager - ограниченный доступ к данным
- team_member - только назначенные им данные
```

## Usage

### 1. Для Admin (создание клиентов)

```javascript
// Создать workspace для клиента
const workspace = await base44.entities.Workspace.create({
  name: "Nike Russia",
  owner_email: "owner@nike.ru",
  status: "active",
  plan: "pro",
  industry: "Sports",
  monthly_budget: 10000
});

// Назначить менеджера на клиента
await base44.entities.WorkspaceUser.create({
  workspace_id: workspace.id,
  user_email: "manager@topnotch.ai",
  role: "manager"
});

// Добавить Meta Ads интеграцию для клиента
await base44.entities.WorkspaceIntegration.create({
  workspace_id: workspace.id,
  workspace_name: workspace.name,
  type: "meta_ads",
  label: "Nike Primary Account",
  api_key: "EAAB...", // Meta API token
  account_id: "act_123456789",
  status: "active"
});
```

### 2. Для Менеджера (использование dashboard)

UI автоматически:
- ✅ Показывает только доступные workspace'ы в dropdown
- ✅ Загружает только данные этого workspace'а
- ✅ Использует workspace-specific интеграции

```javascript
// Hook для получения текущего workspace
import { useWorkspace } from "@/lib/useWorkspace";

function MyComponent() {
  const { workspace, workspaces, canEdit } = useWorkspace();
  
  // workspace.id автоматически используется при запросах
  const campaigns = await base44.functions.invoke("getWorkspaceData", {
    workspaceId: workspace.id,
    entity: "campaigns"
  });
}
```

### 3. Meta Ads Integration (per-workspace)

Используй новый эндпоинт вместо старого:

```javascript
// ✅ Новый способ (workspace-specific)
const insights = await base44.functions.invoke("metaAdsWorkspace", {
  workspaceId: workspace.id,
  action: "getAccountInsights",
  datePreset: "last_30d"
});

// ❌ Старый способ (DEPRECATED - используется глобальный токен)
const insights = await base44.functions.invoke("metaAds", {
  action: "getAccountInsights"
});
```

## Security & Isolation

### Data Access
- Все запросы к `getWorkspaceData` проверяют доступ
- Данные фильтруются по `workspace_id`
- Cross-workspace доступ блокирован

### Integration Credentials
- Каждый workspace хранит свои tokens отдельно
- API ключи не видны в UI (только в backend functions)
- Смена токена не влияет на других клиентов

## Migration Steps

### Шаг 1: Добавить workspace_id к существующим данным
```javascript
// Вручную или через automation:
const campaigns = await base44.entities.Campaign.list();
for (const c of campaigns) {
  await base44.entities.Campaign.update(c.id, {
    workspace_id: "clipcar_workspace_id" // ID первого клиента
  });
}
```

### Шаг 2: Обновить Dashboard/Pages
```javascript
// pages/Dashboard.jsx - добавить в useEffect:
const campaigns = await base44.functions.invoke("getWorkspaceData", {
  workspaceId: workspace.id,
  entity: "campaigns"
});
```

### Шаг 3: Переключить на workspace-specific Meta Ads
```javascript
// Обновить все вызовы metaAds → metaAdsWorkspace
// И добавить workspaceId параметр
```

## Features by Role

| Право | super_admin | admin | super_manager | manager | team_member |
|-------|-----------|-------|---------------|---------|------------|
| Видит всех клиентов | ✅ | ✅ | ❌ | ❌ | ❌ |
| Управляет интеграциями | ✅ | ✅ | ❌ | ❌ | ❌ |
| Добавляет team членов | ✅ | ✅ | ❌ | ❌ | ❌ |
| Редактирует кампании | ✅ | ✅ | ✅ | ✅ | ❌ |
| Смотрит аналитику | ✅ | ✅ | ✅ | ✅ | ✅ |
| Может быть админом для нескольких клиентов | ✅ | ✅ | ❌ | ❌ | ❌ |

## Current Status

✅ Готово:
- Multi-tenant entities структура
- useWorkspace hook для UI
- getWorkspaceData backend функция
- metaAdsWorkspace для per-workspace интеграций
- WorkspaceSwitcher UI компонент
- ClipCar client создан

⏳ TODO:
- Миграция существующих кампаний в ClipCar workspace
- Обновить все pages использовать getWorkspaceData
- Создать admin panel для управления клиентами и team членами
- Добавить WorkspaceUser UI для назначения менеджеров
- Обновить метаAds интеграцию в ClipCar