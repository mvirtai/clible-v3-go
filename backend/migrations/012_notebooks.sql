-- Migration 012: Notebooks and Cells
-- Description: Create tables for notebooks and cells
create table if not exists notebooks (
    id        uuid         primary key default gen_random_uuid(),
    title     varchar(255) not null,
    create_at timestamp    not null default current_timestamp,
    update_at timestamp    not null default current_timestamp,
    user_id   text         references users(id) on delete cascade,
    scope_id  text         references scopes(id) on delete set null
);

create type cell_type as enum('markdown', 'code');

create table notebook_cells (
    id          uuid      primary key default gen_random_uuid(),
    notebook_id uuid      not null references notebooks(id) on delete cascade,
    type        cell_type not null,
    content     text      not null default '',
    result_json jsonb    ,
    position    integer   not null,
    created_at  timestamp not null default current_timestamp,
    updated_at  timestamp not null default current_timestamp
);

create index idx_notebooks_user on notebooks(user_id);
create index idx_notebooks_cells_notebook on notebook_cells(notebook_id);
create index idx_notebooks_cells_position on notebook_cells(notebook_id, position);
