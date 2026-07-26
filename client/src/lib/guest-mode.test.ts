import { afterEach, describe, expect, it } from "vitest";
import { isGuestSession } from "./guest-mode";

describe("isGuestSession", () => {
  afterEach(() => {
    localStorage.removeItem("guardia_guest");
  });

  it("retorna false quando a flag não está setada", () => {
    expect(isGuestSession()).toBe(false);
  });

  it("retorna true quando guardia_guest é 'true'", () => {
    localStorage.setItem("guardia_guest", "true");
    expect(isGuestSession()).toBe(true);
  });

  it("retorna false para qualquer outro valor", () => {
    localStorage.setItem("guardia_guest", "false");
    expect(isGuestSession()).toBe(false);
  });
});
