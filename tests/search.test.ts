import assert from "node:assert/strict";
import test from "node:test";
import { matchesSearchQuery } from "../src/shared/search.js";

test("matches Cyrillic queries against supported Latin transliterations", () => {
  assert.equal(matchesSearchQuery("Sergey Ivanov", "сергей"), true);
  assert.equal(matchesSearchQuery("Sergei Ivanov", "сергей"), true);
  assert.equal(matchesSearchQuery("Sergej Ivanov", "сергей"), true);
});

test("matches Latin queries against Cyrillic names and community titles", () => {
  assert.equal(matchesSearchQuery("Сергей Иванов", "sergey"), true);
  assert.equal(matchesSearchQuery("Южный клуб", "yuzhnyy"), true);
});

test("allows transliteration rules to be mixed within one query or stored value", () => {
  assert.equal(matchesSearchQuery("Алексей Щербаков", "aleksey shherbakov"), true);
  assert.equal(matchesSearchQuery("Алексей Щербаков", "aleksej shcherbakov"), true);
  assert.equal(matchesSearchQuery("Aleksei Shherbakov", "алексей щербаков"), true);
  assert.equal(matchesSearchQuery("Юлия Хвощёва", "juliya khvoshchyova"), true);
});

test("keeps ordinary case-insensitive substring search behavior", () => {
  assert.equal(matchesSearchQuery("Product Café", "CAFE"), true);
  assert.equal(matchesSearchQuery("Alice Johnson", "bob"), false);
  assert.equal(matchesSearchQuery("Alice Johnson", "  "), true);
});
