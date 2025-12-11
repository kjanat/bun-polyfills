import { describe, expect, test } from "bun:test";

import {
  generateBadgeData,
  generateBadges,
  generateBadgeUrl,
  generateEndpointBadgeData,
  generateEndpointJson,
} from "./badge";
import type { CoverageReport, CoverageSummary } from "./types";

describe("badge", () => {
  describe("generateBadgeUrl", () => {
    test("generates basic shields.io URL", () => {
      const url = generateBadgeUrl("Coverage", "80%", "green");
      expect(url).toContain("https://img.shields.io/badge/");
      expect(url).toContain("Coverage");
      expect(url).toContain("80%25"); // URL encoded %
      expect(url).toContain("green");
    });

    test("includes style parameter", () => {
      const url = generateBadgeUrl("Test", "value", "blue", {
        style: "flat-square",
      });
      expect(url).toContain("style=flat-square");
    });

    test("includes logo parameter", () => {
      const url = generateBadgeUrl("Test", "value", "blue", { logo: "bun" });
      expect(url).toContain("logo=bun");
    });

    test("includes logoColor parameter", () => {
      const url = generateBadgeUrl("Test", "value", "blue", {
        logo: "bun",
        logoColor: "white",
      });
      expect(url).toContain("logoColor=white");
    });

    test("includes labelColor and logoSize parameters", () => {
      const url = generateBadgeUrl("Test", "value", "blue", {
        labelColor: "black",
        logoSize: "auto",
      });
      expect(url).toContain("labelColor=black");
      expect(url).toContain("logoSize=auto");
    });

    test("URL encodes special characters", () => {
      const url = generateBadgeUrl("Bun API Coverage", "10/100", "red");
      expect(url).toContain("Bun%20API%20Coverage");
      expect(url).toContain("10%2F100");
    });
  });

  describe("generateBadges", () => {
    const mockReport: CoverageReport = {
      logo: "bun",
      generated: new Date().toISOString(),
      bunTypesVersion: "1.0.0",
      summary: {
        total: 100,
        implemented: 50,
        partial: 20,
        stub: 5,
        notStarted: 25,
        percentComplete: 60,
      },
      byCategory: {} as CoverageReport["byCategory"],
      byModule: {} as CoverageReport["byModule"],
      apis: [],
    };

    test("generates coverage URL", () => {
      const badges = generateBadges(mockReport);
      expect(badges.coverage).toContain("img.shields.io");
      expect(badges.coverage).toContain("60%25");
    });

    test("generates implemented count URL", () => {
      const badges = generateBadges(mockReport);
      expect(badges.implemented).toContain("img.shields.io");
      expect(badges.implemented).toContain("50%2F100");
    });

    test("generates markdown badge", () => {
      const badges = generateBadges(mockReport);
      expect(badges.markdown).toContain("[![");
      expect(badges.markdown).toContain("](");
      expect(badges.markdown).toContain("COVERAGE.md");
    });

    test("generates HTML badge", () => {
      const badges = generateBadges(mockReport);
      expect(badges.html).toContain("<a href=");
      expect(badges.html).toContain("<img src=");
      expect(badges.html).toContain('alt="Bun API Coverage"');
    });

    test("uses bun logo by default", () => {
      const badges = generateBadges(mockReport);
      expect(badges.coverage).toContain("logo=bun");
    });

    test("respects custom options", () => {
      const badges = generateBadges(mockReport, {
        style: "for-the-badge",
        label: "Custom Label",
      });
      expect(badges.coverage).toContain("style=for-the-badge");
      expect(badges.coverage).toContain("Custom%20Label");
    });
  });

  describe("generateBadgeData", () => {
    test("generates correct schema version", () => {
      const summary: CoverageSummary = {
        total: 100,
        implemented: 80,
        partial: 10,
        stub: 0,
        notStarted: 10,
        percentComplete: 85,
      };

      const data = generateBadgeData(summary);
      expect(data.schemaVersion).toBe(1);
    });

    test("generates correct label", () => {
      const summary: CoverageSummary = {
        total: 100,
        implemented: 50,
        partial: 0,
        stub: 0,
        notStarted: 50,
        percentComplete: 50,
      };

      const data = generateBadgeData(summary);
      expect(data.label).toBe("Bun API Coverage");
    });

    test("generates percentage message", () => {
      const summary: CoverageSummary = {
        total: 100,
        implemented: 75,
        partial: 0,
        stub: 0,
        notStarted: 25,
        percentComplete: 75,
      };

      const data = generateBadgeData(summary);
      expect(data.message).toBe("75%");
    });

    test("assigns brightgreen for >= 80%", () => {
      const summary: CoverageSummary = {
        total: 100,
        implemented: 85,
        partial: 0,
        stub: 0,
        notStarted: 15,
        percentComplete: 85,
      };

      const data = generateBadgeData(summary);
      expect(data.color).toBe("brightgreen");
    });

    test("assigns green for >= 60%", () => {
      const summary: CoverageSummary = {
        total: 100,
        implemented: 65,
        partial: 0,
        stub: 0,
        notStarted: 35,
        percentComplete: 65,
      };

      const data = generateBadgeData(summary);
      expect(data.color).toBe("green");
    });

    test("assigns yellow for >= 40%", () => {
      const summary: CoverageSummary = {
        total: 100,
        implemented: 45,
        partial: 0,
        stub: 0,
        notStarted: 55,
        percentComplete: 45,
      };

      const data = generateBadgeData(summary);
      expect(data.color).toBe("yellow");
    });

    test("assigns orange for >= 20%", () => {
      const summary: CoverageSummary = {
        total: 100,
        implemented: 25,
        partial: 0,
        stub: 0,
        notStarted: 75,
        percentComplete: 25,
      };

      const data = generateBadgeData(summary);
      expect(data.color).toBe("orange");
    });

    test("assigns red for < 20%", () => {
      const summary: CoverageSummary = {
        total: 100,
        implemented: 10,
        partial: 0,
        stub: 0,
        notStarted: 90,
        percentComplete: 10,
      };

      const data = generateBadgeData(summary);
      expect(data.color).toBe("red");
    });
  });

  describe("generateEndpointBadgeData", () => {
    const summary: CoverageSummary = {
      total: 100,
      implemented: 80,
      partial: 0,
      stub: 0,
      notStarted: 20,
      percentComplete: 80,
    };

    test("respects overrides and defaults namedLogo to bun", () => {
      const data = generateEndpointBadgeData(summary, {
        label: "Custom",
        color: "pink",
        labelColor: "111111",
        isError: true,
        logoColor: "ffffff",
        logoSize: "auto",
        style: "social",
      });

      expect(data.label).toBe("Custom");
      expect(data.color).toBe("pink");
      expect(data.labelColor).toBe("111111");
      expect(data.isError).toBe(true);
      expect(data.namedLogo).toBe("bun");
      expect(data.logoColor).toBe("ffffff");
      expect(data.logoSize).toBe("auto");
      expect(data.style).toBe("social");
    });
  });

  describe("generateEndpointJson", () => {
    test("produces valid JSON", () => {
      const report: CoverageReport = {
        logo: "bun",
        generated: new Date().toISOString(),
        bunTypesVersion: "1.0.0",
        summary: {
          total: 100,
          implemented: 50,
          partial: 0,
          stub: 0,
          notStarted: 50,
          percentComplete: 50,
        },
        byCategory: {} as CoverageReport["byCategory"],
        byModule: {} as CoverageReport["byModule"],
        apis: [],
      };

      const json = generateEndpointJson(report);
      const parsed = JSON.parse(json);

      expect(parsed.schemaVersion).toBe(1);
      expect(parsed.label).toBe("Bun API Coverage");
      expect(parsed.message).toBe("50%");
    });

    test("is formatted with indentation", () => {
      const report: CoverageReport = {
        logo: "bun",
        generated: new Date().toISOString(),
        bunTypesVersion: "1.0.0",
        summary: {
          total: 10,
          implemented: 5,
          partial: 0,
          stub: 0,
          notStarted: 5,
          percentComplete: 50,
        },
        byCategory: {} as CoverageReport["byCategory"],
        byModule: {} as CoverageReport["byModule"],
        apis: [],
      };

      const json = generateEndpointJson(report);
      expect(json).toContain("\n");
      expect(json).toContain("  ");
    });

    test("passes options through to endpoint data", () => {
      const report: CoverageReport = {
        logo: "bun",
        generated: new Date().toISOString(),
        bunTypesVersion: "1.0.0",
        summary: {
          total: 10,
          implemented: 5,
          partial: 0,
          stub: 0,
          notStarted: 5,
          percentComplete: 50,
        },
        byCategory: {} as CoverageReport["byCategory"],
        byModule: {} as CoverageReport["byModule"],
        apis: [],
      };

      const json = generateEndpointJson(report, {
        label: "Custom",
        color: "pink",
        labelColor: "222222",
      });

      const parsed = JSON.parse(json);
      expect(parsed.label).toBe("Custom");
      expect(parsed.color).toBe("pink");
      expect(parsed.labelColor).toBe("222222");
    });
  });
});
