import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// jsdom has no IndexedDB; use the in-memory model so persistence can rehydrate.
vi.mock("idb-keyval", async () => (await import("./helpers/idbMock")).idbMock());

import { RouterProvider } from "../src/app/router";
import { AppProvider } from "../src/app/AppContext";
import { App } from "../src/App";

/**
 * End-to-end boot smoke: the whole provider tree mounts, the pack validates, the
 * engine is created, and the Start screen renders. This catches wiring errors the
 * type checker and unit tests can't (context, hooks, engine construction).
 */
describe("app boot", () => {
  it("mounts the full tree and renders the Dashboard", async () => {
    window.location.hash = "";
    render(
      <RouterProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </RouterProvider>
    );
    // With nothing owned yet, the dashboard nudges the parent to unlock a pack.
    await waitFor(() =>
      expect(screen.getByText("Unlock your first pack")).toBeInTheDocument()
    );
    expect(screen.getByText("FLUMLUNK")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Scan a card" })
    ).toBeInTheDocument();
  });
});
