export type DrizzleReturningExecutor<Row> = {
  returning: () => Promise<readonly Row[]>;
};

export type DrizzleInsertValueBuilder<Row, InsertRecord> = {
  values: (record: InsertRecord) => DrizzleReturningExecutor<Row>;
};

export type DrizzleUpdateSetBuilder<Row, UpdateRecord> = {
  set: (record: UpdateRecord) => DrizzleUpdateWhereBuilder<Row>;
};

export type DrizzleUpdateWhereBuilder<Row> = {
  where: (condition: unknown) => DrizzleReturningExecutor<Row>;
};

export type DrizzleSelectFromBuilder<Row> = {
  where: (condition: unknown) => Promise<readonly Row[]>;
};

export type DrizzleSelectBuilder<Row> = {
  from: (table: unknown) => DrizzleSelectFromBuilder<Row>;
};

export type DrizzleRepositoryClient<Row, InsertRecord, UpdateRecord> = {
  insert: (table: unknown) => DrizzleInsertValueBuilder<Row, InsertRecord>;
  select: () => DrizzleSelectBuilder<Row>;
  update: (table: unknown) => DrizzleUpdateSetBuilder<Row, UpdateRecord>;
};
