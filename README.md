# EventSphere - Unified College Event Management Platform

EventSphere is a React and Supabase platform for managing college or organization events. It supports college-owned fests, event teams, configurable registration forms, approval workflows, QR passes, discussions, and Excel exports.

## Features

- Student/participant and College/Organization registration paths.
- College registration creates a College Admin account.
- Unique member code (`USR-XXXXXXXX`) assigned to every account.
- College Admin creates main fests and assigns Core Team/Organizers by member code.
- Organizers create sub-events beneath a main fest.
- Core Team approves and publishes submitted events.
- Same-college students discover, register for, and discuss published events.
- Dynamic custom registration fields per event.
- QR digital passes after registration approval.
- Excel export of registrations and custom answers.

## Technology

| Area | Technology |
| --- | --- |
| Frontend | React 19 + Vite |
| Backend | Supabase Auth, PostgreSQL, Row Level Security |
| Routing | React Router |
| QR passes | `qrcode` |
| Exports | SheetJS (`xlsx`) + FileSaver |

## Project layout

```text
Event_Manger/
├── src/
│   ├── components/          # Navigation and protected routes
│   ├── pages/               # App screens
│   ├── services/supabase.js # Supabase configuration
│   └── utils/               # Excel export utility
├── supabase/
│   ├── schema.sql
│   ├── college-access-migration.sql
│   └── college-registration-upgrade.sql
├── .env                     # Local credentials; do not commit
├── package.json
└── README.md
```

## Prerequisites

- Node.js 20 or newer
- A Supabase project
- Supabase Project URL and Publishable key

## Run locally

1. Install dependencies:

   ```powershell
   npm.cmd install
   ```

2. Create `.env` in the project root:

   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   ```

   The legacy name `VITE_SUPABASE_ANON_KEY` also works. Do not use brackets/quotes around values. Never use a secret or service-role key in this frontend.

3. Start the app:

   ```powershell
   npm.cmd run dev
   ```

4. Open the printed address, usually `http://localhost:5173`.

## Database setup

In Supabase Dashboard, open **SQL Editor** → **New query**, then run the files in this exact order:

1. `supabase/schema.sql` - base tables, registration system, and basic RLS.
2. `supabase/college-access-migration.sql` - colleges, event staff, and college permissions.
3. `supabase/college-registration-upgrade.sql` - self-service college creation and member codes.

## Roles and permissions

| Access | Permission |
| --- | --- |
| Student/participant | Browse published college events, register, discuss, and show QR passes. |
| College Admin | Create main fests and assign team members. |
| Core Team | Assigned to a fest; can manage access and approve/publish events. |
| Organizer | Assigned to a fest; can create/manage its sub-events and export registrations. |

## Main workflow

1. A college/organization registers and automatically becomes College Admin.
2. College Admin opens **Create event** and selects **Main fest / parent event**.
3. College Admin opens **Team access**, selects the fest, and enters a registered student's member code.
4. The student is assigned `organizer` or `core_team` access, then signs out/in again.
5. Organizers create sub-events and configure custom fields.
6. Core Team opens **Approvals**, approves, then publishes the fest/events.
7. Students from that college find published events under **Events** and register.
8. Participants use **My passes** after their registration is approved.
9. Organizers download attendee data with **Dashboard** → **Export Excel**.

## Existing account: create College Admin

For an account created before the registration upgrade, run this SQL after changing its values:

```sql
insert into public.colleges (name)
values ('IITG')
on conflict (name) do nothing;

update public.profiles
set college_id = (select id from public.colleges where name = 'IITG'),
    role = 'college_admin'
where email = 'your-email@example.com';
```

Sign out and back in before creating the main fest.

## Dynamic registration forms

Click **Add field** while creating an event. Available types include text, long text, number, email, phone, URL, date, select, radio, and checkbox. For select/radio options, use comma-separated values.

| Field key | Label | Type | Options |
| --- | --- | --- | --- |
| `team_name` | Team Name | text | - |
| `github_url` | GitHub Profile | url | - |
| `team_size` | Team Size | select | 1, 2, 3, 4 |

## Build verification

```powershell
npm.cmd run build
```

The production output is written to `dist/`.

## Troubleshooting

| Issue | Fix |
| --- | --- |
| `Add VITE_SUPABASE...` message | Confirm `.env` is in the project root and restart the dev server. |
| `email rate limit exceeded` | Check inbox/spam, wait for Supabase's email allowance to reset, or temporarily disable Confirm email during local testing. |
| RLS policy error creating a fest | Run all three SQL files. The College Admin profile must have `role = college_admin` and a non-null `college_id`. |
| Event missing from Dashboard | Restart, sign out/in, and check that the account is College Admin, Core Team, or Organizer. |
| Students cannot see an event | Core Team must set its status to `published`. |
| QR pass is not visible | The registration's approval status must be `approved`. |
| Header still says Sign in | Restart `npm.cmd run dev`, then use `Ctrl + F5` in the browser. |

## Security and deployment

- Use only the Publishable/anon key in the frontend.
- Do not expose secret/service-role keys in source control or the browser.
- Configure custom SMTP before production, because Supabase's default email sender is heavily rate-limited.
- Deploy to Vercel by adding `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as Vercel environment variables.
- Add the deployed Vercel address in Supabase Authentication → URL Configuration.

## Current scope and future work

QR passes are generated and displayed. Recommended next modules are camera QR scanning/check-in, volunteer management, document/poster uploads, real-time discussions, results, and certificate generation.
