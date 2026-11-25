import assert from "node:assert/strict";
import { expandSearchQuery, labelMatchesQuery } from "./concepts.ts";
import { azureLanguageCode, detectContentLocale, localeFromAzure } from "./language.ts";
import { boundedLikePattern } from "./text.ts";

assert.equal(labelMatchesQuery("hair", "chair"), false);
assert.equal(labelMatchesQuery("hair", "hair"), true);
assert.equal(labelMatchesQuery("hair salon", "hair salon"), true);
assert.equal(labelMatchesQuery("hair", "hair salon"), true);
assert.equal(labelMatchesQuery("cscs card", "cscs"), true);

const hair = expandSearchQuery("hair");
assert.ok(hair.includes("barber"));
assert.ok(hair.includes("salon"));
assert.ok(hair.includes("حلاق"));
assert.ok(hair.includes("سەرتاش"));
assert.ok(!hair.includes("hair"));
assert.ok(hair.length <= 16);

const chair = expandSearchQuery("chair");
assert.deepEqual(chair, []);

assert.equal(detectContentLocale("سەرتاش"), "ckb");
assert.equal(detectContentLocale("حلاق"), "ar");
assert.equal(detectContentLocale("barber"), "en");
assert.equal(azureLanguageCode("ckb"), "ku");
assert.equal(azureLanguageCode("ar"), "ar");
assert.equal(localeFromAzure("ku"), "ckb");
assert.equal(localeFromAzure("ckb"), null);
assert.equal(localeFromAzure("kmr"), null);
assert.equal(boundedLikePattern("hair", "contains"), "% hair %");
assert.equal(boundedLikePattern("car wash", "prefix"), " car wash %");

console.log("search checks ok", { hairTerms: hair.length });
