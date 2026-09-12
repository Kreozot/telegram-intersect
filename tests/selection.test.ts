import assert from "node:assert/strict";
import { test } from "node:test";
import { limitSelection, toggleSelection } from "../src/shared/selection.js";

test("caps bulk and individual selection while allowing removal", () => {
  assert.deepEqual([...limitSelection(new Set(["a"]), ["b", "c"], 2)], ["a", "b"]);
  assert.deepEqual([...toggleSelection(new Set(["a", "b"]), "c", 2)], ["a", "b"]);
  assert.deepEqual([...toggleSelection(new Set(["a", "b"]), "a", 2)], ["b"]);
});
