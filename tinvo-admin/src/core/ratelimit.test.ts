import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { limiter } from "./ratelimit.ts";

describe("sign-in limiter", () => {
  it("blocks after the limit and lets go after the window", () => {
    let t = 0;
    const l = limiter(3, 1000, () => t);
    for (let i = 0; i < 3; i++) l.fail("a@x");
    assert.equal(l.blocked("a@x"), true);
    assert.equal(l.blocked("b@x"), false, "other keys unaffected");
    t = 1001;
    assert.equal(l.blocked("a@x"), false, "window passed");
  });

  it("forgets failures after a successful sign-in", () => {
    const l = limiter(2, 1000, () => 0);
    l.fail("a@x");
    l.fail("a@x");
    l.clear("a@x");
    assert.equal(l.blocked("a@x"), false);
  });
});
