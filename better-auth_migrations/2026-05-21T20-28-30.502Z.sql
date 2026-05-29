alter table "user" add column "emailVerified" boolean not null;

alter table "user" add column "createdAt" timestamptz default CURRENT_TIMESTAMP not null;

alter table "user" add column "updatedAt" timestamptz default CURRENT_TIMESTAMP not null;

alter table "user" add column "role" text not null;

alter table "user" add column "banned" boolean;

alter table "user" add column "banReason" text;

alter table "user" add column "banExpires" timestamptz;

alter table "session" add column "expiresAt" timestamptz not null;

alter table "session" add column "createdAt" timestamptz default CURRENT_TIMESTAMP not null;

alter table "session" add column "updatedAt" timestamptz not null;

alter table "session" add column "ipAddress" text;

alter table "session" add column "userAgent" text;

create index "session_userId_idx" on "session" ("userId");

alter table "session" add column "userId" text not null references "user" ("id") on delete cascade;

alter table "session" add column "activeOrganizationId" text;

alter table "session" add column "impersonatedBy" text;

alter table "account" add column "accountId" text not null;

alter table "account" add column "providerId" text not null;

create index "account_userId_idx" on "account" ("userId");

alter table "account" add column "userId" text not null references "user" ("id") on delete cascade;

alter table "account" add column "accessToken" text;

alter table "account" add column "refreshToken" text;

alter table "account" add column "idToken" text;

alter table "account" add column "accessTokenExpiresAt" timestamptz;

alter table "account" add column "refreshTokenExpiresAt" timestamptz;

alter table "account" add column "createdAt" timestamptz default CURRENT_TIMESTAMP not null;

alter table "account" add column "updatedAt" timestamptz not null;

alter table "verification" add column "expiresAt" timestamptz not null;

alter table "verification" add column "createdAt" timestamptz default CURRENT_TIMESTAMP not null;

alter table "verification" add column "updatedAt" timestamptz default CURRENT_TIMESTAMP not null;

create table "organization" ("id" text not null primary key, "name" text not null, "slug" text not null unique, "logo" text, "createdAt" timestamptz not null, "metadata" text);

create table "member" ("id" text not null primary key, "organizationId" text not null references "organization" ("id") on delete cascade, "userId" text not null references "user" ("id") on delete cascade, "role" text not null, "createdAt" timestamptz not null);

create table "invitation" ("id" text not null primary key, "organizationId" text not null references "organization" ("id") on delete cascade, "email" text not null, "role" text, "status" text not null, "expiresAt" timestamptz not null, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "inviterId" text not null references "user" ("id") on delete cascade);

create table "jwks" ("id" text not null primary key, "publicKey" text not null, "privateKey" text not null, "createdAt" timestamptz not null, "expiresAt" timestamptz);

create unique index "organization_slug_uidx" on "organization" ("slug");

create index "member_organizationId_idx" on "member" ("organizationId");

create index "member_userId_idx" on "member" ("userId");

create index "invitation_organizationId_idx" on "invitation" ("organizationId");

create index "invitation_email_idx" on "invitation" ("email");