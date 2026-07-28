/**
 * Setup do vitest — carregado antes de cada arquivo de teste.
 *
 * Traz os matchers do jest-dom (`toBeInTheDocument`, `toHaveTextContent`…) e
 * limpa o `localStorage` entre testes: a camada de acesso a dados usa
 * `localStorage` como backend no modo demo (`lib/data/adapters/local-collection.ts`),
 * então estado vazado entre testes produziria falha intermitente — o pior tipo.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});
