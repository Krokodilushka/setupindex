# Импорт контента в чистую БД

Пакет содержит только активные профили с оборудованием:

- `setupindex-creators.json` — create-only импорт для пустой SQLite;
- `avatars/` — локальные WebP-аватары, пути к которым уже записаны в импорт;
- `avatar-sources.json` — официальная страница Twitch или YouTube и исходный URL каждого аватара.

Локально:

```powershell
New-Item -ItemType Directory -Force .data/uploads/avatars
Copy-Item docs/imports/avatars/*.webp .data/uploads/avatars/
```

На сервере с настройками из `compose.yaml`:

```bash
mkdir -p data/uploads/avatars
cp docs/imports/avatars/*.webp data/uploads/avatars/
```

После копирования откройте `/admin`, зарегистрируйте ключ администратора и импортируйте `setupindex-creators.json`. В БД сохраняются только пути `/uploads/avatars/<файл>.webp`; сами изображения остаются в `NUXT_UPLOADS_PATH`.
