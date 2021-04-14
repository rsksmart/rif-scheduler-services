import { deleteDatabase, resetDatabase, createSqliteConnection } from "./db";
import { getConnection } from "typeorm";
import { ScheduledTransaction, ScheduledTransactionStatus } from "./entities";
import Cache from "./index";
import { addMinutes, compareAsc } from "date-fns";

jest.setTimeout(7000);

const DB_NAME = "test_db_store";

describe("Cache", () => {
  afterEach(async () => {
    await resetDatabase(getConnection());
    await deleteDatabase(getConnection(), DB_NAME);
  });

  test("Should add a new scheduled transaction", async () => {
    const connection = await createSqliteConnection(DB_NAME);
    const repository = connection.getRepository(ScheduledTransaction);

    const store = new Cache(repository);

    const date = addMinutes(new Date(), -2);

    const id = await store.add({
      executeAt: date,
      maxAmountOfGas: 100,
      transaction: "test 1",
    });

    const count = await repository.count();

    expect(id).toBeGreaterThan(0);
    expect(count).toBe(1);
  });

  test("Should change a status", async () => {
    const connection = await createSqliteConnection(DB_NAME);
    const repository = connection.getRepository(ScheduledTransaction);

    const store = new Cache(repository);

    const date = addMinutes(new Date(), -2);

    const id = await store.add({
      executeAt: date,
      maxAmountOfGas: 100,
      transaction: "test 1",
    });

    const count = await repository.count();
    const initialStatus = (await repository.findOne(id))?.status;
    await store.changeStatus(id, ScheduledTransactionStatus.finished);
    const newStatus = (await repository.findOne(id))?.status;

    expect(id).toBeGreaterThan(0);
    expect(count).toBe(1);
    expect(initialStatus).not.toBe(newStatus);
    expect(newStatus).toBe(ScheduledTransactionStatus.finished);
  });

  test("getBatch should return transactions to execute with date before now", async () => {
    const connection = await createSqliteConnection(DB_NAME);
    const repository = connection.getRepository(ScheduledTransaction);

    const store = new Cache(repository);

    const oldDate = addMinutes(new Date(), -2);
    const futureDate = addMinutes(new Date(), 2);

    await store.add({
      executeAt: oldDate,
      maxAmountOfGas: 100,
      transaction: "test 1",
    });
    await store.add({
      executeAt: oldDate,
      maxAmountOfGas: 100,
      transaction: "test 1",
    });
    await store.add({
      executeAt: futureDate,
      maxAmountOfGas: 100,
      transaction: "test 1",
    });

    const count = await repository.count();

    const batch = await store.getExecutionBatch();

    expect(batch.length).toBe(2);
    expect(count).toBe(3);
    const LESS_THAN_NOW = -1;
    batch.forEach((item) => {
      expect(compareAsc(Date.parse(item.executeAt), new Date())).toBe(
        LESS_THAN_NOW
      );
    });
  });
});
