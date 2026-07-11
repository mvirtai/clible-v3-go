-- Up
create table if not exists notebooks (
    id        uuid                     primary key default gen_random_uuid(),
    title     varchar(255)             not null,
    create_at timestamp with time zone default current_timestamp not null,
    update_at timestamp with time zone default current_timestamp not null,
    user_id   text                     references users(id) on delete cascade,
    scope_id  text                     references scopes(id) on delete set null
);

create type cell_type as enum('markdown', 'code');

create table notebook_cells (
    id          uuid                     primary key default gen_random_uuid(),
    notebook_id uuid                     not null references notebooks(id) on delete cascade,
    type        cell_type                not null,
    content     text                     not null default '',
    result_json jsonb                   ,
    position    integer                  not null,
    created_at  timestamp with time zone default current_timestamp not null,
    updated_at  timestamp with time zone default current_timestamp not null
);

create index idx_notebooks_user on notebooks(user_id);
create index idx_notebooks_cells_notebook on notebook_cells(notebook_id);
create index idx_notebooks_cells_position on notebook_cells(notebook_id, position);

-- Down
drop table if exists notebook_cells;
drop type if exists cell_type;
drop table if exists notebooks;
