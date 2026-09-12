import assert from "node:assert/strict";
import test from "node:test";
import { loadStoreData } from "./source.mjs";

test("loads V1 testimonials instead of rejecting Depoimento rows", async () => {
  const queries = [];
  const testimonial = {
    description: "Compra tranquila.",
    id: 4,
    image_url: "https://cdn.example/testimonial.jpg",
    title: "Cliente",
  };
  const sql = {
    unsafe(query) {
      queries.push(query);
      if (query.includes('FROM "Loja"')) {
        return Promise.resolve([{ id: 2 }]);
      }
      if (query.includes('FROM "Depoimento"')) {
        return Promise.resolve([testimonial]);
      }
      if (query.includes("count(*)::int")) {
        return Promise.resolve([{ count: 0 }]);
      }
      return Promise.resolve([]);
    },
  };

  const data = await loadStoreData(sql, 2);

  assert.deepEqual(data.testimonials, [testimonial]);
  assert.equal(
    queries.some(
      (query) =>
        query.includes("count(*)::int") && query.includes('"Depoimento"'),
    ),
    false,
  );
});
